// 静态文件兜底端点：GET /file?taskId=N&p=<相对路径>&token=…
// 模型回复内联的本地相对路径图片（相对 DSH agent 工作区），面板 img 无法带 Bearer 头，
// 鉴权走 query token（与 relay token 同值）；严格限制在工作区目录内，防路径穿越。

import fs from "node:fs";
import path from "node:path";
import { CORS_HEADERS, json } from "./http.js";

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
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".pdf": "application/pdf",
};

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
  if (
    rel.includes("\0") ||
    path.isAbsolute(rel) ||
    /^[a-zA-Z]:[\\/]/.test(rel) ||
    rel.split(/[\\/]+/).includes("..")
  ) {
    json(res, 400, { error: { message: "非法路径" } });
    return;
  }
  // resolve 后必须仍在工作区内（双保险：防符号链接等边缘情况越界）
  const root = path.resolve(workspace);
  const file = path.resolve(root, rel);
  if (file !== root && !file.startsWith(root + path.sep)) {
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
  });
  fs.createReadStream(file)
    .on("error", () => res.destroy())
    .pipe(res);
}
