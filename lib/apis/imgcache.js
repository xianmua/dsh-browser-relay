// 图片落地缓存：md 回复里的 http(s) 图片改写为本机 /img 端点，relay 下载落盘 ~/.dsh/temp/image/。
// 面板展示与原始 URL 的签名过期/折行损伤/特殊字符彻底解耦；缓存文件名 sha1(原始URL)，
// 无服务端映射状态，relay 重启后缓存仍有效。过期策略：TTL 24h + 总量 200MB（最旧先删），
// 启动清扫 + 每小时定时清扫；不绑会话切换/失焦（「历史会话」回放依赖缓存存活）。

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { CORS_HEADERS, json } from "./http.js";

const IMG_DIR = path.join(os.homedir(), ".dsh", "temp", "image");
const IMG_TTL_MS = 24 * 60 * 60 * 1000; // 缓存存活 24h：早上报告下午回看不丢，且不占无限空间
const IMG_CACHE_MAX = 500 * 1024 * 1024; // 总量上限 500MB：超限按 mtime 最旧先删（LRU 兜底）
const DL_TIMEOUT_MS = 10_000; // 单图下载超时：签名 URL 死链不能拖住回复下发
const DL_MAX_BYTES = 20 * 1024 * 1024; // 单图大小上限（与 /upload 一致）
const DL_CONCURRENCY = 3; // 并发上限：避免同 host 并发拉图排队（面板多图加载的既有教训）
const MAX_PER_REPLY = 6; // 每条回复最多改写张数：面板约定内联 ≤3，其余本就以链接列表出现

const EXT_BY_TYPE = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/bmp": ".bmp",
  "image/avif": ".avif",
  "image/x-icon": ".ico",
};
const MIME_BY_EXT = Object.fromEntries(
  Object.entries(EXT_BY_TYPE).map(([t, e]) => [e, t]),
);

// ---------- 缓存索引：hash -> { file, mime }；懒加载（重启后首次访问 readdir 重建） ----------
let index = null;
function loadIndex() {
  if (index) return index;
  index = new Map();
  try {
    for (const f of fs.readdirSync(IMG_DIR)) {
      const ext = path.extname(f).toLowerCase();
      const hash = path.basename(f, ext);
      if (MIME_BY_EXT[ext] && /^[0-9a-f]{40}$/.test(hash))
        index.set(hash, { file: path.join(IMG_DIR, f), mime: MIME_BY_EXT[ext] });
    }
  } catch {
    /* 目录不存在等：首次写入时 mkdir */
  }
  return index;
}
const hashOf = (url) => crypto.createHash("sha1").update(url).digest("hex");

// ---------- 下载：信号量限并发，activeDls 按 URL 去重（eager 预取与 lazy 补拉共用） ----------
let running = 0;
const waiters = [];
const activeDls = new Map(); // url -> Promise<void>，settle 后移除（失败后再次请求会重试一次）
function acquire() {
  if (running < DL_CONCURRENCY) {
    running++;
    return Promise.resolve();
  }
  return new Promise((r) => waiters.push(() => (running++, r())));
}
function release() {
  running--;
  waiters.shift()?.();
}

async function runDownload(url) {
  const hash = hashOf(url);
  const idx = loadIndex();
  if (idx.has(hash)) return; // 已缓存（可能是 relay 重启前的旧文件）
  await acquire();
  try {
    if (idx.has(hash)) return; // 双检：排队期间可能已被并发任务写入
    let r;
    try {
      r = await fetch(url, {
        signal: AbortSignal.timeout(DL_TIMEOUT_MS),
        headers: { "user-agent": "dsh-browser-relay-imgcache/1.0" },
        redirect: "follow",
      });
    } catch (e) {
      console.warn(`[dsh-browser-relay] 图片下载失败 ${url.slice(0, 120)}：${String(e?.message ?? e)}`);
      throw e;
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const type = String(r.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const urlExt = path.extname(new URL(url).pathname).toLowerCase();
    const ext = EXT_BY_TYPE[type] ?? (MIME_BY_EXT[urlExt] ? urlExt : "");
    if (!ext) throw new Error(`非图片类型：${type || "未知"}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length === 0) throw new Error("空文件");
    if (buf.length > DL_MAX_BYTES) throw new Error(`超过 ${DL_MAX_BYTES / 1024 / 1024}MB 上限`);
    await fs.promises.mkdir(IMG_DIR, { recursive: true });
    const file = path.join(IMG_DIR, hash + ext);
    await fs.promises.writeFile(file, buf);
    idx.set(hash, { file, mime: MIME_BY_EXT[ext] });
  } finally {
    release();
  }
}

function getDownload(url) {
  let p = activeDls.get(url);
  if (!p) {
    p = runDownload(url).finally(() => activeDls.delete(url));
    activeDls.set(url, p);
  }
  return p;
}

// ---------- md 改写：跳过代码围栏，`![alt](http…)` → `![alt](/img?u=…)`，同步瞬时，不阻塞下发 ----------
export function rewriteMdImages(text) {
  const s = String(text);
  const lines = s.split("\n");
  let fence = null;
  let n = 0; // 每条回复上限，超出保持原样（降级为原始 URL 展示）
  for (let i = 0; i < lines.length && n < MAX_PER_REPLY; i++) {
    const fm = /^\s*(`{3,}|~{3,})/.exec(lines[i]);
    if (fm) {
      fence = fence === fm[1] ? null : fence || fm[1];
      continue;
    }
    if (fence) continue;
    lines[i] = lines[i].replace(/(!\[[^\]]*\])\((https?:\/\/[^()\s]+)\)/g, (m, head, url) => {
      if (n >= MAX_PER_REPLY) return m;
      n++;
      getDownload(url).catch(() => {}); // fire-and-forget 预取；失败后面板请求时 lazy 重试
      return `${head}(/img?u=${encodeURIComponent(url)})`;
    });
  }
  return lines.join("\n");
}

// ---------- GET /img?u=<原始URL>&token=…：img 标签带不了 Authorization，query token 优先 ----------
export async function serveImg(env, req, res) {
  const u = new URL(req.url, "http://localhost");
  const ok =
    (u.searchParams.get("token") ?? "") === env.token ||
    String(req.headers.authorization ?? "") === `Bearer ${env.token}`;
  if (!ok) {
    json(res, 401, { error: { message: "invalid token（需 relay token）" } });
    return;
  }
  const raw = u.searchParams.get("u") ?? "";
  if (!/^https?:\/\//.test(raw)) {
    json(res, 400, { error: { message: "缺少有效的图片地址 u 参数" } });
    return;
  }
  const url = raw.replace(/\s+/g, ""); // 与 repairMdLinks 同思路：剔除偶发混入的空白
  let entry = loadIndex().get(hashOf(url));
  if (!entry) {
    try {
      await getDownload(url); // 未命中：现场补拉（与预取共用去重），挂起至完成或失败
      entry = loadIndex().get(hashOf(url));
    } catch {
      /* 落到下方 404 */
    }
  }
  if (!entry) {
    json(res, 404, { error: { message: `图片缓存缺失且下载失败：${url.slice(0, 160)}` } });
    return;
  }
  let st;
  try {
    st = await fs.promises.stat(entry.file);
  } catch {
    loadIndex().delete(hashOf(url)); // 索引过期（文件被外部清理）：下次请求重新下载
    json(res, 404, { error: { message: "缓存文件已不存在" } });
    return;
  }
  res.writeHead(200, {
    ...CORS_HEADERS,
    "content-type": entry.mime,
    "content-length": st.size,
    "cache-control": "no-cache",
    "content-security-policy": "sandbox", // 图片标签内正常渲染；直接打开时禁脚本，防 SVG XSS
  });
  fs.createReadStream(entry.file)
    .on("error", () => res.destroy())
    .pipe(res);
}

// ---------- 清扫：TTL 过期 + 总量超限（最旧先删）；启动即扫 + 每小时一轮 ----------
export function sweepImgCache() {
  const idx = loadIndex();
  const now = Date.now();
  let total = 0;
  const stats = [];
  let files;
  try {
    files = fs.readdirSync(IMG_DIR);
  } catch {
    return;
  }
  for (const f of files) {
    const p = path.join(IMG_DIR, f);
    let st;
    try {
      st = fs.statSync(p);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;
    if (now - st.mtimeMs > IMG_TTL_MS) {
      fs.promises.unlink(p).catch(() => {});
      idx.delete(path.basename(f, path.extname(f)));
      continue;
    }
    total += st.size;
    stats.push({ p, hash: path.basename(f, path.extname(f)), mtime: st.mtimeMs });
  }
  if (total > IMG_CACHE_MAX) {
    stats.sort((a, b) => a.mtime - b.mtime); // 最旧先删
    for (const it of stats) {
      if (total <= IMG_CACHE_MAX) break;
      fs.promises.unlink(it.p).catch(() => {});
      idx.delete(it.hash);
      // 删除后 total 未再校准：最坏多删一两张最旧图，下次轮询收敛，不值得为此再 stat
      total -= IMG_CACHE_MAX / 10; // 粗略递减防死循环；真实余额下一轮 readdir 重新统计
    }
  }
}

export function startImgSweeper(ctx) {
  const t = setInterval(() => sweepImgCache(), 60 * 60 * 1000);
  queueMicrotask(() => sweepImgCache()); // 启动即扫一次
  ctx.effect(
    () => () => clearInterval(t),
    "browser-relay.imgcache",
  );
}
