// 渲染核心独立产物入口（esm）：
//   panel/core/dsh-md-core.js     页面版（全量语法着色，懒加载语法全内联）
//   extension/core/dsh-md-core.js 扩展版（裁剪懒加载语法，控每页注入体积）
// 含 react + react-dom + shiki + katex + vendored ui-primitives + 全量样式，
// 自包含无外部依赖；loader.js 运行时按需动态加载，加载失败降级 marked 轻量管线。

export { injectDshStyles, renderDshMd, unmountDshRd, splitFences, MD_LABELS } from "./adapter.js";
import * as core from "./adapter.js";

// 页面版经 <script type="module" src> 注入加载，无法拿 named exports，挂全局取用
if (typeof window !== "undefined") window.__DshMdCore = core;
