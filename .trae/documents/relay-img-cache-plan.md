# 图片落地缓存中转方案（relay 图片显示健壮化）

## Context

面板图片显示屡出问题（破裂图标/签名 URL 过期/折行损伤/特殊字符截断），根因是展示链路完全依赖模型输出的原始 URL。改为：**relay 下发 md 前把 http(s) 图片改写为本机 `/img` 端点，图片由 relay 下载落地 `~/.dsh/temp/image/` 缓存**，面板从缓存取图。原始 URL 只在 relay 侧使用一次，此后显示与签名过期、URL 损伤彻底解耦。

## 核心设计

**URL 形态**：`/img?u=<encodeURIComponent(原始URL)>`（+ query token）
- 无服务端映射状态：缓存文件名 = sha1(原始URL)，relay 重启后缓存仍有效
- 同 URL 天然去重（同图只下载一次）

**改写时机**（同步改写 + 异步下载）：
- `pushEvent` 的 md 管线改为 `cutMd(normalizeTables(cacheImgs(repairMdLinks(text))))`
- `cacheImgs` 仅做 URL 替换（同步、瞬时），真实下载 fire-and-forget 异步执行，**不阻塞事件下发**
- 改写必须在 `cutMd` 之前（改写后 URL 变长，先切会切坏）

**`/img` 端点**（照 `fileRoute` 模式，lib/apis/files.js:23-83）：
- 鉴权：query token 优先、回退 Bearer（img 标签带不了 Authorization，同 fileRoute 26-33 行）
- 缓存命中 → 直接回文件（image MIME + CSP sandbox，同 fileRoute 73-79 行）
- 未命中 → 现场触发下载（in-flight Map 去重，挂起等待至完成或超时）→ 成功回文件 / 失败 404 带中文错误
- 只放行图片 content-type/扩展名

**下载约束**：单图 20MB 上限、10s 超时、并发 ≤3、每条回复最多 6 张；Node18 全局 fetch，**零新依赖**（保持 package.json 零运行时依赖）

**过期策略**（回答「怎么设计」）：
- ✅ **TTL 24h（默认）+ 总量 200MB LRU 上限**，双保险
- ✅ 清扫时机：relay 启动时 + 每小时定时（`setInterval`，经 `ctx.effect` 注册清理，同 lib/index.js:1205 模式）
- ❌ **不绑会话切换**：「历史会话」回放正是断连后的恢复路径，切会话删图会伤回放
- ❌ **不绑失焦**：用户频繁切 tab，无清理意义
- 已下载的缓存图与平台签名无关，落地后 24h 内随时可看；4h 太激进（早上的报告下午回看不保）

**下载失败降级**：md 保持改写后的 `/img` URL（失败时 lazy 重试仍有机会成功）；面板 onerror 显示占位提示，不再停留破裂图标

## 改动文件

| 文件 | 改动 |
|---|---|
| 新增 `lib/apis/imgcache.js` | `rewriteMdImages(text)`（扫 `![alt](http...)`、跳过代码围栏、改写 `/img?u=`、排程下载）；`ensureDownload(url)`；`serveImg(env,req,res)`；`sweepCache()` + 定时器注册 |
| `lib/index.js` | pushEvent md 管线插入 cacheImgs（157-161 行处）；handleHttp 注册 `GET /img?`（1157 行附近）；apply 内启动 sweeper |
| `web-panel/src/loader.js` | `rewriteLocalImgs`（718-738 行）新增分支：src 以 `/` 开头 → `base + src + token`，不重复改写；**http(s) 图片也挂 onerror 兜底**（修复此前破裂图标永久停留） |
| `package.json` / `CHANGELOG.md` | 版本 0.7.39 → 0.7.40 + 变更记录 |

## 验证

1. `npm run build` 通过；本地起 relay，用含 http 图片的 md 文本走 pushEvent（或直接 curl 构造），确认事件里图片已是 `/img?u=...`
2. `curl 'http://127.0.0.1:<port>/img?u=...&token=...'`：首次触发下载回 200 图片；二次请求走缓存；坏 URL 回 404 中文错误
3. 缓存目录 `~/.dsh/temp/image/<sha1>.<ext>` 存在；把 TTL 调成 0 验证清扫逻辑
4. 面板（浏览器实测）：图片正常显示；坏图显示占位提示而非破裂图标；代码围栏内的 `![](...)` 示例文本不被误改写
5. rsync 同步 D 盘部署目录，验证 0.7.40 版本号与 `/img` 特性码
