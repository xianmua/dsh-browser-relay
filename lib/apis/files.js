// 静态文件兜底端点：GET /file?taskId=N&p=<路径>&token=…
// 模型回复内联的本地图片（相对或工作区内绝对路径，DSH web 两者都能渲染，本端点对齐），
// 面板 img 无法带 Bearer 头，鉴权走 query token（与 relay token 同值）；严格限制在工作区目录内，防路径穿越。

import fs from "node:fs";
import path from "node:path";
import { CORS_HEADERS, guard, json } from "./http.js";

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".avif": "image/avif",
};

// 脱敏收紧：只放行图片（端点用途即面板图片兜底），杜绝工作区源码/数据/配置被任意读；
// CSP sandbox 防 SVG 被直接打开时执行内嵌脚本
export async function fileRoute(env, req, res) {
  const u = new URL(req.url, "http://localhost");
  // img 标签带不了 Authorization 头：query token 优先，回退 Bearer 头
  const qToken = u.searchParams.get("token") ?? "";
  const ok =
    qToken === env.token ||
    String(req.headers.authorization ?? "") === `Bearer ${env.token}`;
  if (!ok) {
    json(res, 401, { error: { message: "invalid token（需 relay token）" } });
    return;
  }
  const task = env.tasks.get(Number(u.searchParams.get("taskId")));
  const workspace = String(task?.workspace ?? "").trim();
  const p = u.searchParams.get("p") ?? "";
  if (!workspace || !p) {
    json(res, 400, { error: { message: "任务无工作区或缺少 p 参数" } });
    return;
  }
  const rel = decodeURIComponent(p);
  if (!MIME[path.extname(rel).toLowerCase()]) {
    json(res, 403, { error: { message: "仅允许读取图片文件" } });
    return;
  }
  if (rel.includes("\0") || rel.split(/[\\/]+/).includes("..")) {
    json(res, 400, { error: { message: "非法路径" } });
    return;
  }
  // 模型常把图表写成工作区绝对路径（D:/…），DSH 原生 web 可渲染而本端点曾一刀切拒绝导致面板碎图；
  // 绝对/相对统一 resolve 后必须仍在工作区内（穿越防护不降级；win32 盘符大小写不敏感）
  const root = path.resolve(workspace);
  const file =
    path.isAbsolute(rel) || /^[a-zA-Z]:[\\/]/.test(rel)
      ? path.resolve(rel)
      : path.resolve(root, rel);
  const norm = (x) => (process.platform === "win32" ? x.toLowerCase() : x);
  if (norm(file) !== norm(root) && !norm(file).startsWith(norm(root) + path.sep)) {
    json(res, 400, { error: { message: "路径越界" } });
    return;
  }
  let st;
  try {
    st = await fs.promises.stat(file);
  } catch {
    json(res, 404, { error: { message: `文件不存在：${rel}` } });
    return;
  }
  if (st.isDirectory()) {
    json(res, 400, { error: { message: "目标为目录" } });
    return;
  }
  res.writeHead(200, {
    ...CORS_HEADERS,
    "content-type": MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream",
    "content-length": st.size,
    "cache-control": "no-cache",
    "content-security-policy": "sandbox", // 图片标签内正常渲染；直接打开时禁脚本，防 SVG XSS
  });
  fs.createReadStream(file)
    .on("error", () => res.destroy())
    .pipe(res);
}

// POST /upload?filename=…&workspace=…|taskId=N：面板粘贴的图片/文件落盘 DSH 工作区，
// 返回工作区相对路径拼进任务文本（agent 用原生文件读取工具查看）。续聊场景传 taskId
// 以会话工作区为准（防面板配置中途换了工作区导致路径对不上）；body 为原始二进制。
const UPLOAD_MAX = 20 * 1024 * 1024;
export async function uploadRoute(env, req, res) {
  if (!guard(req, res, env.token)) return;
  const u = new URL(req.url, "http://localhost");
  let workspace = String(u.searchParams.get("workspace") ?? "").trim();
  const taskId = Number(u.searchParams.get("taskId")) || 0;
  if (taskId) workspace = String(env.tasks.get(taskId)?.workspace ?? "").trim();
  // 未配置工作区：回落 relay 进程 cwd（DSH 服务启动目录），不因 400 卡死发送
  if (!workspace) workspace = process.cwd();
  const raw = String(u.searchParams.get("filename") ?? "").trim();
  if (!workspace || !(path.isAbsolute(workspace) || /^[a-zA-Z]:[\\/]/.test(workspace))) {
    json(res, 400, { error: { message: "缺少有效的 workspace（或 taskId 不存在）" } });
    return;
  }
  // 文件名只留 basename，白名单字符防路径穿越/非法字符；时间戳前缀防覆盖
  const base =
    raw.split(/[\\/]/).pop().replace(/[^\w.\-\u4e00-\u9fa5]+/g, "_").replace(/^\.+/, "").slice(-80) ||
    "file";
  const chunks = [];
  let size = 0;
  let overflow = false;
  await new Promise((resolve) => {
    req.on("data", (c) => {
      size += c.length;
      if (size > UPLOAD_MAX) {
        overflow = true;
        req.destroy();
        resolve();
        return;
      }
      chunks.push(c);
    });
    req.on("end", resolve);
    req.on("error", resolve);
  });
  if (overflow) {
    json(res, 413, { error: { message: `附件超过 ${Math.floor(UPLOAD_MAX / 1024 / 1024)}MB 上限` } });
    return;
  }
  try {
    const dir = path.join(path.resolve(workspace), "dsh-relay-uploads");
    await fs.promises.mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${base}`;
    const abs = path.join(dir, name);
    await fs.promises.writeFile(abs, Buffer.concat(chunks));
    // abs 供面板拼进任务文本：agent 无论 cwd 在哪都能按绝对路径读取
    json(res, 200, { path: `dsh-relay-uploads/${name}`, abs });
  } catch (e) {
    json(res, 500, { error: { message: `附件保存失败：${String(e?.message ?? e)}`.slice(0, 300) } });
  }
}
