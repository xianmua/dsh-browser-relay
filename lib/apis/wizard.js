// 扩展分发：向导页 + zip 下载
// 这两个端点刻意不带 CORS 头、不要求 token（浏览器直接打开向导页），跨源网页读不到 token 内容

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { json } from "./http.js";

const extDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "extension");
function collectExtFiles(dir, prefix = "") {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...collectExtFiles(p, `${prefix}${e.name}/`));
    else out.push({ name: `${prefix}${e.name}`, data: fs.readFileSync(p) });
  }
  return out;
}
let extFiles;
try {
  extFiles = collectExtFiles(extDir);
} catch {
  extFiles = null; // 包内没带 extension/ 时降级
}

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function buildZip(files) {
  // 手写 ZIP（store 不压缩），零第三方依赖
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, "utf8");
    const crc = crc32(f.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 文件名
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(f.data.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    chunks.push(local, name, f.data);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0x0800, 8);
    cen.writeUInt16LE(dosTime, 12);
    cen.writeUInt16LE(dosDate, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(f.data.length, 20);
    cen.writeUInt32LE(f.data.length, 24);
    cen.writeUInt16LE(name.length, 28);
    cen.writeUInt32LE(0, 38); // 外部属性
    cen.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([cen, name]));
    offset += 30 + name.length + f.data.length;
  }
  const cenBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cenBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, cenBuf, eocd]);
}

// 向导页样式：与面板同套黑白灰 + 蓝点缀，纯系统字体（内网零外部请求）
const PAGE_CSS = `
*{box-sizing:border-box}
body{font-family:"Segoe UI","Microsoft YaHei",system-ui,sans-serif;max-width:720px;margin:0 auto;padding:48px 20px 64px;line-height:1.75;color:#222;background:#fbfbf9}
header{margin-bottom:24px}
.hd-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
h1{font-size:22px;margin:0}
.pill{font-size:12px;color:#555;background:#fff;border:1px solid #e2e2de;border-radius:99px;padding:1px 10px}
.host{font-size:12px;color:#8a8a86;font-family:Consolas,monospace}
.sub{color:#666;font-size:14px;margin:8px 0 0}
.card{background:#fff;border:1px solid #e8e8e4;border-radius:12px;padding:20px 22px;margin-bottom:18px;box-shadow:0 1px 2px rgba(0,0,0,.03)}
.card h2{font-size:15px;margin:0 0 12px;display:flex;align-items:center;gap:9px}
.rec{font-size:11px;color:#1a73e8;background:#eef4fe;border-radius:99px;padding:1px 8px;font-weight:600}
.mut{font-size:12px;color:#aaa;font-weight:400}
ol.steps{margin:0;padding:0;list-style:none;counter-reset:s}
ol.steps li{counter-increment:s;position:relative;padding-left:30px;margin-bottom:10px;font-size:14px}
ol.steps li::before{content:counter(s);position:absolute;left:0;top:4px;width:20px;height:20px;border-radius:50%;background:#f1f1ee;color:#555;font-size:12px;display:flex;align-items:center;justify-content:center}
a{color:#1a73e8;font-weight:600;text-decoration:none}
a:hover{text-decoration:underline}
.row{display:flex;gap:8px;align-items:stretch;flex-wrap:wrap}
.in{flex:1;min-width:220px;font-size:13px;border:1px solid #e2e2de;border-radius:8px;padding:9px 12px;outline:none;font-family:inherit}
.in:focus{border-color:#1a1a1a}
.code{flex:1;min-width:220px;font-family:Consolas,"Courier New",monospace;font-size:12.5px;background:#f7f7f5;border:1px solid #e2e2de;border-radius:8px;padding:9px 12px;word-break:break-all;user-select:all}
.btn{flex:none;padding:0 16px;border:none;border-radius:8px;background:#1a1a1a;color:#fff;font-size:13px;cursor:pointer;transition:background .15s}
.btn:hover{background:#333}
.note{color:#8a8a86;font-size:13px;margin:12px 0 0}
.tip{border-left:3px solid #e2e2de;padding:2px 0 2px 12px;color:#8a8a86;font-size:13px;margin:12px 0 0}
p.lead{font-size:14px;margin:0 0 10px}
`;

function landingHtml(token, port, version) {
  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const t = esc(token);
  const snippet = `<script src="http://127.0.0.1:${port}/dsh-assistant.min.js" data-token="${token}"></script>`;
  const stepCard = extFiles
    ? `<ol class="steps">
    <li>下载扩展压缩包并<b>解压</b>到任意固定目录（本机口令与端点已自动写入，<b>加载即用，无需任何配置</b>）：<a href="/extension.zip">dsh-browser-extension.zip</a></li>
    <li>浏览器打开 <b>edge://extensions</b>（Chrome 用 chrome://extensions）→ 开启右上角「开发人员模式」→「加载解压缩的扩展」→ 选择解压出的目录 → 点浏览器工具栏「页面 AI 助手」图标即可使用</li>
  </ol>
  <p class="note">任务在 DSH 里创建会话执行（dsh web 会话列表可见、可追问），模型与网关沿用 DSH 自身配置。会话记录在 DSH 侧，本 relay 不落盘审计日志。</p>`
    : `<p class="note">relay 包内未内嵌扩展文件，请联系管理员获取扩展目录。</p>`;
  return `<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>页面 AI 助手 · 安装向导</title>
<style>${PAGE_CSS}</style>
<body>
<header>
  <div class="hd-row"><h1>页面 AI 助手</h1><span class="pill">v${esc(version)}</span><span class="host">http://127.0.0.1:${port}</span></div>
  <p class="sub">DSH 侧 relay 已就绪。两种接入方式任选其一：装浏览器扩展（个人日常使用），或自家业务系统页面嵌一行脚本（免装扩展）。</p>
</header>
<div class="card">
  <h2>Relay Token<span class="mut">两种方式共用，仅供排查</span></h2>
  <div class="row"><div class="code" id="tk">${t}</div><button class="btn" onclick="cp(this,'tk')">复制</button></div>
  <p class="tip">口令由本机自动生成、仅存于本机（~/.dsh/browser-relay-token）：方式一的 zip 下载时已自动写入；方式二已含在 data-token 里。正常使用无需手动配置，仅当重新生成口令后报「invalid api key」时，重新下载扩展覆盖加载（方式一）或替换 data-token（方式二）即可。</p>
</div>
<div class="card">
  <h2>方式一 · 浏览器扩展<span class="rec">推荐</span></h2>
  ${stepCard}
</div>
<div class="card">
  <h2>方式二 · 自家业务系统免装接入</h2>
  <p class="lead">业务页面 header 里加一行（data-token 已带本机口令，复制即用）：</p>
  <div class="row"><input class="in" id="pub" placeholder="经代理/网关访问 relay 时填接入地址，如 https://www.xxxx.com/dsh-tjsmart（留空 = 本机直连）" oninput="upd()"><button class="btn" onclick="upd()">生成</button></div>
  <div class="row"><div class="code" id="as">${esc(snippet)}</div><button class="btn" onclick="cp(this,'as')">复制</button></div>
  <p class="tip">填了接入地址会自动注入 data-base-url：面板的 API 请求也走该地址（代理需把该前缀整体转发到本 relay 的所有路由，不只是 js 文件），src 同步换成代理地址。留空则 src 与请求都指向本机。口令变更时替换 data-token；也可不写 data-token，改为 JS 里调 DshAssistant.mountPanel({ baseURL, apiKey }) 手动挂载。</p>
</div>
<script>
var TOKEN = ${JSON.stringify(token)}, PORT = ${JSON.stringify(String(port))};
function genSnippet() {
  var base = document.getElementById('pub').value.trim().replace(/[/]+$/, '');
  var s = '<script src="' + (base ? base : 'http://127.0.0.1:' + PORT) + '/dsh-assistant.min.js"';
  if (base) s += ' data-base-url="' + base + '"';
  s += ' data-token="' + TOKEN + '"><' + '/script>';
  return s;
}
function upd() { document.getElementById('as').textContent = genSnippet(); }
function cp(b, id) {
  var txt = document.getElementById(id).textContent;
  var done = function () { b.textContent = '已复制'; setTimeout(function () { b.textContent = '复制'; }, 2000); };
  navigator.clipboard.writeText(txt).then(done).catch(function () {
    var x = document.createElement('textarea');
    x.value = txt; document.body.appendChild(x); x.select();
    document.execCommand('copy'); x.remove(); done();
  });
}
</script>
</body></html>`;
}

// GET /：安装向导
export function landing(env, req, res) {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(landingHtml(env.token, env.port, env.version));
}

// GET /dsh-assistant.min.js：页面版面板的 IIFE 打包产物（panel/ 目录随包内嵌，每次请求现读，替换文件免重启）
const panelJsPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "panel",
  "dsh-assistant.min.js",
);
export function assistantJs(env, req, res) {
  return servePanelFile(panelJsPath, "panel/dsh-assistant.min.js", res, false, req);
}

// GET /dsh-md-core.js：页面版渲染核心独立产物（react+shiki+katex+ui-primitives）
const coreJsPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "panel",
  "dsh-md-core.js",
);
export function coreJs(env, req, res) {
  // module script 跨源加载被同源策略强制要求 CORS，必须带 allow-origin
  return servePanelFile(coreJsPath, "panel/dsh-md-core.js", res, true, req);
}

// 静态产物统一服务：缺失报 404，不带缓存头（替换产物后刷新页面即生效）；
// 按 Accept-Encoding 协商 gzip 传输压缩（产物文件不变，大产物线上传输体积降约 70%）
const gzipCache = new Map(); // filePath -> { mtimeMs, gzipped }
function servePanelFile(filePath, label, res, cors = false, req) {
  let data;
  try {
    data = fs.readFileSync(filePath);
  } catch {
    json(res, 404, { error: { message: `relay 包内未内嵌 ${label}（需重新构建入库）` } });
    return;
  }
  let body = data;
  const headers = {
    "content-type": "application/javascript; charset=utf-8",
    ...(cors ? { "access-control-allow-origin": "*" } : {}),
  };
  if (req && /\bgzip\b/.test(req.headers["accept-encoding"] ?? "")) {
    const mtime = fs.statSync(filePath).mtimeMs;
    let hit = gzipCache.get(filePath);
    if (!hit || hit.mtimeMs !== mtime) {
      hit = { mtimeMs: mtime, gzipped: zlib.gzipSync(data, { level: 9 }) };
      gzipCache.set(filePath, hit);
    }
    body = hit.gzipped;
    headers["content-encoding"] = "gzip";
  }
  headers["content-length"] = body.length;
  res.writeHead(200, headers);
  res.end(body);
}

// GET /extension.zip：下载时把口令/端点写入 config.js，解压加载即用
export function extensionZip(env, req, res) {
  if (!extFiles) {
    json(res, 404, { error: { message: "relay 包内未内嵌扩展文件" } });
    return;
  }
  const files = extFiles.map((f) => {
    if (f.name !== "config.js") return f;
    const src = f.data
      .toString("utf8")
      .replace('apiKey: ""', `apiKey: ${JSON.stringify(env.token)}`)
      .replace(/baseURL: "[^"]*"/, `baseURL: ${JSON.stringify(`http://127.0.0.1:${env.port}`)}`);
    return { name: f.name, data: Buffer.from(src) };
  });
  const zip = buildZip(files);
  res.writeHead(200, {
    "content-type": "application/zip",
    "content-length": zip.length,
    "content-disposition": 'attachment; filename="dsh-browser-extension.zip"',
  });
  res.end(zip);
}
