// JSON 落盘公共函数：记忆与剧本共用（读失败回退空对象，写前建目录）

import fs from "node:fs";
import path from "node:path";

export async function readJson(file, fallback = {}) {
  try {
    return JSON.parse(await fs.promises.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

export async function writeJson(file, data) {
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(file, JSON.stringify(data, null, 2) + "\n");
}