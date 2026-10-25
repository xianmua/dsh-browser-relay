// HTTP 基础工具：CORS、JSON 读写、token 鉴权（各端点共用）

export const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
  // HTTPS 公网页面 → http://127.0.0.1 属 public→loopback 降级，Chrome PNA 预检要求此头，缺失则静默拦截脚本加载
  "access-control-allow-private-network": "true",
};

export function json(res, status, obj) {
  res.writeHead(status, { ...CORS_HEADERS, "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}

// 读 JSON 请求体，坏体按空对象处理
export async function jsonBody(req) {
  try {
    return JSON.parse(Buffer.concat(await req.toArray()).toString("utf8")) ?? {};
  } catch {
    return {};
  }
}

// relay token 鉴权（防本机网页 drive-by）
export function guard(req, res, token) {
  if (String(req.headers.authorization ?? "") === `Bearer ${token}`) return true;
  json(res, 401, { error: { message: "invalid api key（需 relay token）" } });
  return false;
}
