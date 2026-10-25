// 页面经验记忆：扩展「记住：xxx」按页面（host+path）存取，建任务时注入 prompt
// 文件：~/.dsh/browser-relay-memory.json；容量上限防 prompt 撑爆

import os from "node:os";
import path from "node:path";
import { guard, json, jsonBody } from "./http.js";
import { readJson, writeJson } from "./fs-json.js";

const memoryFile = path.join(os.homedir(), ".dsh", "browser-relay-memory.json");
const MEM_HOST_CAP = 50; // 全文件最多页数
const MEM_ITEM_CAP = 20; // 每页最多条数

export const readMemory = () => readJson(memoryFile);
export const writeMemory = (mem) => writeJson(memoryFile, mem);

// POST /memory：追加一条页面经验（重复条目不重复存）
export async function memory(env, req, res) {
  if (!guard(req, res, env.token)) return;
  const p = await jsonBody(req);
  const host = String(p?.host ?? "")
    .trim()
    .slice(0, 300); // 防异常超长 key
  const text = String(p?.text ?? "")
    .trim()
    .slice(0, 300); // 防单条经验撑爆 prompt
  if (!host || !text) {
    json(res, 400, { error: { message: "host 与 text 均不能为空" } });
    return;
  }
  const mem = await readMemory();
  const items = mem[host] ?? [];
  if (!items.includes(text)) items.push(text);
  if (items.length > MEM_ITEM_CAP) items.shift();
  mem[host] = items;
  const hosts = Object.keys(mem);
  if (hosts.length > MEM_HOST_CAP) delete mem[hosts[0]];
  await writeMemory(mem);
  json(res, 200, { ok: true, count: items.length });
}
