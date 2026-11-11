// 面板主体（单一源码，双构建）：悬浮窗 UI + 任务客户端。
// 任务经 relay 在 DSH 创建会话由 agent 执行；面板只负责轮询展示进度、
// 执行 agent 下发的页面命令（browser_* → PageController）并回传结果。
// 行为差异经 env.js 的 isExt 分支处理；仅 page-agent 的 import 用构建期 IS_EXT 常量折叠。

import { DEFAULTS } from "./config.js";
import { isExt, cfgOverrides, cfgSave, cfgClear } from "./env.js";
import "../../extension/vendor/highlight.min.js"; // UMD 副作用：挂 window.hljs（围栏代码语法着色）
import "../../extension/vendor/marked.min.js"; // UMD 副作用：挂 window.marked（与扩展 manifest 预加载等价）
import "../../extension/vendor/purify.min.js"; // UMD 副作用：挂 window.DOMPurify

const INIT = {}; // mountPanel(init) 每次调用合并进此对象（token/baseURL 等挂载配置），readCfg 时优先于 DEFAULTS

// ---------- DSH 渲染核心（core/dsh-md-core.js）按需加载 ----------
// 构建期注入包版本（build.mjs define），设置面板展示用；源码直跑时回落 dev
const PANEL_VERSION = typeof __PANEL_VERSION__ === "string" ? __PANEL_VERSION__ : "dev";
// react+shiki+katex+ui-primitives 独立成 core 产物，loader 保持轻量；加载失败降级 marked 轻量管线
let coreApi = null; // 已加载的 core 模块
let corePromise = null;
function loadCore() {
  if (corePromise) return corePromise;
  corePromise = (async () => {
    if (isExt) {
      // 扩展版：content script 动态 import 扩展内资源（web_accessible_resources 放行，同 page-agent 模式）
      return await import(chrome.runtime.getURL("core/dsh-md-core.js"));
    }
    // 页面版：module script 注入（src 走 relay 静态路由，API 挂 window.__DshMdCore）
    // URL 带版本号：relay 对核心下发一年强缓存，升级版本号即天然换 cache key，避免每页全量重下 4.4MB
    const coreUrl = `${relayBase}/dsh-md-core.js?v=${encodeURIComponent(PANEL_VERSION)}`;
    let lastErr = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.type = "module";
          s.src = coreUrl;
          s.onload = resolve;
          s.onerror = () => reject(new Error(`core 加载失败：${coreUrl}`));
          document.head.appendChild(s);
        });
        break;
      } catch (e) {
        lastErr = e;
        if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 4000)); // 4s/8s 退避：公司网络/代理抖动不一次定生死
      }
    }
    if (lastErr) throw lastErr;
    if (!window.__DshMdCore) throw new Error("core 加载后未注册 window.__DshMdCore");
    return window.__DshMdCore;
  })()
    .then((m) => {
      coreApi = m;
      return m;
    })
    .catch((e) => {
      console.warn("[dsh-assistant] 渲染核心不可用，markdown 降级 marked 轻量管线：", e);
      corePromise = null; // 允许下次重试
      return null;
    });
  return corePromise;
}

export function mountPanel(init = {}) {
  Object.assign(INIT, init);
  if (document.getElementById("dsh-ai-host")) return; // 已挂载：只刷新配置，不重复建面板
  const host = document.createElement("div");
  host.id = "dsh-ai-host";
  const shadow = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);

  shadow.innerHTML = `
    <style>
      * { box-sizing: border-box; font-family: "Segoe UI", "Microsoft YaHei", system-ui, sans-serif; }
      [hidden] { display: none !important; }
      /* 最小化态：右缘竖向小吸附条（可上下拖动、位置记忆），点左箭头展开右侧栏 */
      .tab {
        position: fixed; right: 0; bottom: 116px; width: 22px; height: 76px; z-index: 2147483646;
        background: #f0f0f0; color: #888; border: 1px solid #e2e2e2; border-right: none;
        border-radius: 8px 0 0 8px;
        display: flex; align-items: center; justify-content: center; cursor: grab;
        box-shadow: 0 4px 12px rgba(0,0,0,.18); transition: background .15s ease, box-shadow .15s ease;
      }
      .tab:active { cursor: grabbing; }
      .tab:hover { background: #e4e4e4; color: #555; box-shadow: 0 6px 16px rgba(0,0,0,.24); }
      .tab svg { width: 12px; height: 12px; }
      .panel {
        /* 侧边栏式：吸顶靠右，顶边往下回 8px（上下各留 8px），高度撑满视口；仅宽度可拖拽记忆 */
        position: fixed; top: 8px; right: 0; height: calc(100vh - 16px); width: 380px;
        background: #fff; border-left: 1px solid rgba(0,0,0,.08);
        box-shadow: -8px 0 24px rgba(0,0,0,.12); z-index: 2147483647;
        display: flex; flex-direction: column; font-size: 14px; color: #333; overflow: hidden;
        animation: drop .2s ease-out;
      }
      /* Firefox 细滚动条：标准属性会禁用 Chromium 的 ::-webkit-scrollbar 自定义（回归粗条），必须隔离在 -moz 块内 */
      @-moz-document url-prefix() {
        .panel { scrollbar-width: thin; scrollbar-color: #c9ccd2 transparent; }
      }
      .panel.dragging { animation: none; user-select: none; }
      /* 左下角缩放手柄：面板锚定右上角，往左拖变宽（高度固定为全视口） */
      .grip {
        position: absolute; bottom: 0; left: 0; width: 18px; height: 18px; z-index: 5;
        cursor: ew-resize; touch-action: none; border-radius: 0 0 0 12px;
        background: repeating-linear-gradient(135deg, transparent 0 4px, #d4d4d4 4px 6px);
      }
      .grip:hover { background: repeating-linear-gradient(135deg, transparent 0 4px, #a8a8a8 4px 6px); }
      @keyframes drop {
        from { opacity: 0; transform: translateY(-48px); }
        to { opacity: 1; transform: none; }
      }
      /* 提问卡/追问卡/设置框停靠内容区底部（输入框上方），显示时从右侧滑入（与侧栏朝向一致） */
      @keyframes rise {
        from { opacity: 0; transform: translateX(100%); }
        to { opacity: 1; transform: none; }
      }
      .qbox, .cbox { animation: rise .22s ease-out; }
      .header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 16px; background: #fafafa; border-bottom: 1px solid #f0f0f0; user-select: none;
      }
      .title { font-size: 14px; font-weight: 600; letter-spacing: .5px; }
      .settings, .collapse, .newchat, .sessions {
        width: 24px; height: 24px; border: none; background: none; cursor: pointer;
        color: #999; border-radius: 6px; display: inline-flex; align-items: center;
        justify-content: center; padding: 0;
      }
      .settings:hover, .collapse:hover { color: #333; background: #f0f0f0; }
      .sessions:hover, .newchat:hover { color: #333; background: #f0f0f0; }
      .settings svg, .collapse svg, .newchat svg, .sessions svg { width: 14px; height: 14px; }
      .status-line { display: none; } /* 状态栏取消展示：错误提示走消息流，运行态看执行/停止按钮与步骤流 */
      .steps {
        flex: 1; min-height: 0; overflow-y: auto; padding: 8px 16px 12px;
        color: #555; font-size: 13px; line-height: 1.9; white-space: pre-wrap; word-break: break-all;
      }
      /* 全面板细滚动条（shadow DOM 内，不影响宿主页面）：thumb 视觉 2px 圆角、悬停加深、轨道透明 */
      .panel *::-webkit-scrollbar, .panel::-webkit-scrollbar { width: 4px; height: 4px; }
      .panel *::-webkit-scrollbar-thumb { background: #c9ccd2; border-radius: 2px; border: 1px solid transparent; background-clip: padding-box; }
      .panel *::-webkit-scrollbar-thumb:hover { background: #a8acb4; border: 1px solid transparent; background-clip: padding-box; }
      .panel *::-webkit-scrollbar-track, .panel *::-webkit-scrollbar-corner { background: transparent; }
      .steps .step { padding: 4px 0; border-bottom: 1px solid #f7f7f7; }
      .step.md { white-space: normal; word-break: break-word; line-height: 1.6; font-size: 13px; }
      .step.md p, .step.md ul, .step.md pre { margin: 4px 0; }
      .step.md ul { padding-left: 18px; }
      .step.md h3, .step.md h4, .step.md h5 { margin: 6px 0 2px; }
      .step.md h1, .step.md h2 { margin: 6px 0 2px; font-size: 14px; }
      .step.md table { border-collapse: collapse; margin: 4px 0; }
      .step.md th, .step.md td { border: 1px solid #e5e5e5; padding: 3px 8px; font-size: 12px; text-align: left; }
      .step.md th { background: #fafafa; }
      .step.md blockquote { border-left: 3px solid #e5e5e5; margin: 4px 0; padding: 0 8px; color: #888; }
      .step.md pre { background: #f6f8fa; padding: 8px 10px; border-radius: 6px; overflow-x: auto; position: relative; }
      .step.md pre .lang { position: absolute; top: 4px; right: 6px; font-size: 10px; line-height: 1; color: #b0b7bf; font-family: ui-monospace, Menlo, Consolas, monospace; text-transform: uppercase; user-select: none; pointer-events: none; }
      iframe.genui-frame { display: block; width: 100%; min-height: 60px; border: 1px solid #e5e5e5; border-radius: 6px; background: #fff; }
      .render-note { margin-top: 4px; padding: 2px 6px; font-size: 11px; color: #8a6d3b; background: #fcf8e3; border: 1px solid #faebcc; border-radius: 4px; }
      .step.md img { max-width: 100%; border-radius: 6px; }
      .img-fallback { margin: 4px 0; padding: 6px 10px; font-size: 12px; color: #999; background: #fafafa; border: 1px dashed #ddd; border-radius: 6px; word-break: break-all; }
      .sessbox {
        /* 吸顶靠右抽屉：几何与面板一致（top 8px、高度撑满视口上下各回 8px）；从右滑入、向右收回；宽度随面板同步（showSessions 里对齐） */
        position: fixed; top: 8px; right: 0; height: calc(100vh - 16px); width: 380px; z-index: 30; background: #fff;
        border-left: 1px solid rgba(0,0,0,.08); box-shadow: -8px 0 24px rgba(0,0,0,.12);
        display: flex; flex-direction: column;
        transform: translateX(100%); visibility: hidden;
        transition: transform .22s cubic-bezier(.22,1,.36,1), visibility .22s;
      }
      .sessbox.show { transform: translateX(0); visibility: visible; }
      .sessbox .shead { display: flex; align-items: center; gap: 6px; padding: 10px 14px; border-bottom: 1px solid #f0f0f0; font-size: 13px; font-weight: 600; color: #444; cursor: ns-resize; user-select: none; }
      .sessbox .sback { width: 24px; height: 24px; border: none; background: none; cursor: pointer; color: #999; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; padding: 0; font-size: 16px; line-height: 1; }
      .sessbox .sback:hover { color: #333; background: #f0f0f0; }
      .sessbox .slist { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 8px; }
      .sessbox .empty { padding: 24px 10px; color: #999; font-size: 12px; text-align: center; }
      .srow { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 7px 8px; border-bottom: 1px solid #f5f5f5; cursor: pointer; font-size: 12px; border-radius: 4px; }
      .srow:hover { background: #f0f6ff; }
      .srow .s-title { color: #333; flex-shrink: 0; max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .srow .s-id { color: #999; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .srow .s-time { color: #666; flex-shrink: 0; font-variant-numeric: tabular-nums; }
      .step.md code { background: #f6f8fa; padding: 1px 4px; border-radius: 4px; font-size: 12px; }
      .step.md pre code { background: none; padding: 0; }
      /* hljs token 配色（github light，匹配浅色代码底） */
      .step.md .hljs-comment, .step.md .hljs-quote { color: #6a737d; font-style: italic; }
      .step.md .hljs-keyword, .step.md .hljs-selector-tag, .step.md .hljs-literal, .step.md .hljs-doctag, .step.md .hljs-name { color: #d73a49; }
      .step.md .hljs-string, .step.md .hljs-regexp, .step.md .hljs-addition, .step.md .hljs-attribute, .step.md .hljs-meta .hljs-string { color: #032f62; }
      .step.md .hljs-number, .step.md .hljs-symbol, .step.md .hljs-bullet, .step.md .hljs-variable, .step.md .hljs-template-variable, .step.md .hljs-link, .step.md .hljs-selector-attr { color: #005cc5; }
      .step.md .hljs-title, .step.md .hljs-title.class_, .step.md .hljs-title.function_, .step.md .hljs-section { color: #6f42c1; }
      .step.md .hljs-type, .step.md .hljs-class .hljs-title, .step.md .hljs-built_in, .step.md .hljs-builtin-name { color: #e36209; }
      .step.md .hljs-attr, .step.md .hljs-property, .step.md .hljs-selector-id, .step.md .hljs-selector-class, .step.md .hljs-params { color: #22863a; }
      .step.md .hljs-deletion { color: #b31d28; background: #ffeef0; }
      .step.md .hljs-emphasis { font-style: italic; }
      .step.md .hljs-strong { font-weight: 600; }
      .step.md a { color: #1a73e8; }
      .act-bar {
        display: flex; align-items: center; gap: 12px; margin-top: 4px;
        font-size: 12px; color: #bbb; white-space: nowrap;
      }
      .act-bar button {
        border: none; background: none; cursor: pointer; padding: 0;
        font-size: 12px; color: #999; display: inline-flex; align-items: center;
      }
      .act-bar button svg { display: block; }
      .act-bar button:hover { color: #333; }
      .act-bar .tip { color: #1a73e8; }
      .act-bar .sp { flex: 1; }
      .act-bar .meta { color: #bbb; }
      .steps .step.me {
        background: #1a1a1a; color: #fff; border-bottom: none;
        border-radius: 12px 12px 4px 12px; padding: 6px 11px;
        margin: 4px 0 4px auto; max-width: 85%; width: fit-content;
      }
      /* 用户气泡内附件图形化：图片缩略图（点击看原图）+ 文件 chip，替代裸路径文本 */
      .step.me .att-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
      .step.me .att-row img { max-width: 130px; max-height: 92px; border-radius: 6px; cursor: zoom-in; display: block; }
      .step.me .att-row .fchip { font-size: 11px; padding: 3px 8px; border-radius: 6px; background: rgba(255,255,255,.14); }
      .step.err {
        color: #c5221f; background: #fdf0ef; border-radius: 6px;
        padding: 4px 8px; margin: 2px 0; border-bottom: none;
      }
      .step.warn {
        color: #b45309; background: #fdf6ec; border-radius: 6px;
        padding: 4px 8px; margin: 2px 0; border-bottom: none;
      }
      .steps .step:last-child { border-bottom: none; }
      details.think { padding: 2px 0; border-bottom: 1px solid #f7f7f7; }
      details.think summary {
        cursor: pointer; color: #999; font-size: 12px; line-height: 1.9;
        list-style: none; user-select: none; white-space: nowrap;
        overflow: hidden; text-overflow: ellipsis;
      }
      details.think summary::-webkit-details-marker { display: none; }
      details.think summary::before { content: "▸ "; color: #bbb; }
      details.think[open] summary::before { content: "▾ "; color: #bbb; }
      details.think .think-body {
        color: #aaa; font-size: 12px; padding: 0 0 4px 10px;
        max-height: 180px; overflow-y: auto;
      }
      details.proc-box { border-bottom: 1px solid #f0f0f0; padding: 2px 0; }
      details.proc-box summary {
        cursor: pointer; color: #999; font-size: 12px; line-height: 1.9;
        list-style: none; user-select: none; white-space: nowrap;
        overflow: hidden; text-overflow: ellipsis;
      }
      details.proc-box summary::-webkit-details-marker { display: none; }
      details.proc-box summary::before { content: "▸ "; color: #bbb; }
      details.proc-box[open] summary::before { content: "▾ "; color: #bbb; }
      details.proc-box .proc-body { padding: 0 0 4px 8px; }
      .divider { text-align: center; color: #bbb; font-size: 12px; padding: 6px 0 2px; }
      .input-row { display: flex; gap: 8px; padding: 12px 14px 14px; background: #fafafa; border-top: 1px solid #f0f0f0; }
      .input-row textarea {
        flex: 1; border: 1px solid #e0e0e0; border-radius: 10px; padding: 9px 12px;
        font-size: 14px; outline: none; background: #fff; color: #1a1a1a; transition: border-color .15s;
        resize: none; font-family: inherit; line-height: 1.5; min-height: 40px; max-height: 120px; overflow-y: auto;
        scrollbar-width: none;
      }
      .input-row textarea::placeholder { color: #999; }
      .input-row textarea::-webkit-scrollbar { display: none; }
      .input-row textarea:focus { border-color: #1a1a1a; }
      /* 附件预览条：粘贴的图片缩略图/文件名 chip，发送前可单个移除 */
      .attach-bar { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 14px 0; background: #fafafa; }
      .att {
        position: relative; display: inline-flex; align-items: center; gap: 4px; padding: 3px 6px;
        background: #fff; border: 1px solid #e2e2e2; border-radius: 8px; font-size: 12px; color: #555;
        max-width: 100%;
      }
      .att img { width: 42px; height: 42px; object-fit: cover; border-radius: 5px; display: block; }
      .att-name { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .att-x { border: none; background: none; cursor: pointer; color: #999; font-size: 14px; line-height: 1; padding: 0 0 0 2px; }
      .att-x:hover { color: #c5221f; }
      .btn {
        border: none; background: #1a1a1a; color: #fff;
        border-radius: 10px; padding: 9px 18px; cursor: pointer; font-size: 14px; transition: background .15s;
      }
      .btn:hover { background: #333; }
      .btn:disabled { background: #bbb; cursor: not-allowed; }
      .btn.secondary { background: #fff; color: #333; border: 1px solid #ddd; }
      .btn.secondary:hover { background: #f2f2f2; }
      .menu { max-height: 220px; overflow-y: auto; border-top: 1px solid #f0f0f0; background: #fff; }
      .menu button {
        display: flex; width: 100%; gap: 8px; align-items: baseline; justify-content: space-between;
        padding: 8px 16px; border: none; background: none; cursor: pointer;
        text-align: left; font-size: 13px; color: #333;
      }
      .menu button:hover { background: #f5f5f5; }
      .menu button .l { flex: 0 1 70%; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .menu .g { flex: 1 1 30%; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #999; font-size: 12px; text-align: right; }
      .menu .head { padding: 6px 16px 2px; color: #999; font-size: 12px; }
      /* 选择类弹窗（提问卡/追问确认卡）：淡橙底衬+橙边，与普通信息区区分，一眼识别「需要用户决策」 */
      .qbox { border-top: 1px solid #f3ddb8; border-bottom: 1px solid #f3ddb8; padding: 8px 16px 10px; font-size: 13px; max-height: 40%; overflow-y: auto; background: #fff7ea; color: #333; }
      .cbox { border-top: 1px solid #f3ddb8; border-bottom: 1px solid #f3ddb8; padding: 8px 16px 10px; font-size: 13px; background: #fff7ea; color: #333; }
      .cbox .ct { margin: 2px 0 8px; }
      .qbox .qh { color: #8a94a6; font-size: 12px; margin: 4px 0 2px; }
      .qbox .qt { margin: 2px 0 6px; }
      .qbox .qopt, .cbox .qopt {
        display: block; width: 100%; text-align: left; margin: 0 0 6px; padding: 5px 10px; font-size: 12px;
        border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; color: #333;
      }
      .qbox .qopt.on { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
      .qbox .qin {
        width: 100%; box-sizing: border-box; padding: 5px 8px; font-size: 13px;
        border: 1px solid #ddd; border-radius: 6px; margin-bottom: 8px;
      }
      .qbox .qsub, .cbox .qsub {
        display: block; width: 100%; padding: 6px 0; font-size: 13px; cursor: pointer;
        border: none; border-radius: 6px; background: #1a1a1a; color: #fff;
      }
      .qbox .qsub:disabled { background: #bbb; cursor: not-allowed; }
      /* 设置抽屉：复用 .sessbox 抽屉壳（全高右侧滑入），仅覆盖表单区留白 */
      .setbox .slist { padding: 10px 16px; font-size: 13px; }
      .setbox label { display: block; color: #999; font-size: 12px; margin: 6px 0 2px; }
      .setbox input, .setbox select, .setbox textarea { width: 100%; box-sizing: border-box; padding: 5px 8px; font-size: 13px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; background: #fff; color: #1a1a1a; color-scheme: light; }
      .setbox textarea { resize: vertical; min-height: 56px; }
      .setbox .row2 { display: flex; gap: 8px; margin-top: 8px; }
      .setbox .row2 button { flex: 1; padding: 6px 0; font-size: 13px; border-radius: 6px; cursor: pointer; }
      .setbox .save { border: none; background: #1a1a1a; color: #fff; }
      .setbox .clear { border: 1px solid #ddd; background: #fff; color: #666; }
      .setbox .diag { margin-top: 8px; color: #bbb; font-size: 11px; }
    </style>
    <div class="tab" title="展开 AI 助手"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 6 9 12 15 18"/></svg></div>
    <!-- 最小化态即顶部抽屉标签；点箭头展开右侧全高侧栏，最小化按钮收回标签 -->
    <div class="panel" hidden>
      <div class="grip" title="拖拽调整大小"></div>
      <div class="header">
        <span class="title">页面 AI 助手</span>
        <span>
          <button class="newchat" title="开新会话（断开当前任务，下一条输入将新建任务）">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="sessions" title="历史会话列表">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
          </button>
          <button class="settings" title="设置（Relay 地址 / Token / 工作区 / 智能等级 / 自定义 prompt）">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button class="collapse" title="最小化">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </span>
      </div>
      <div class="status-line">正在初始化…</div>
      <div class="steps"></div>
      <div class="qbox" hidden></div>
      <div class="cbox" hidden></div>
      <div class="setbox sessbox">
        <div class="shead"><button class="sback" title="返回">‹</button><span>设置</span></div>
        <div class="slist"></div>
      </div>
      <div class="menu" hidden></div>
      <div class="sessbox">
        <div class="shead"><button class="sback" title="返回">‹</button><span>历史会话</span></div>
        <div class="slist"></div>
      </div>
      <div class="attach-bar" hidden></div>
      <div class="input-row">
        <textarea rows="1" placeholder="输入任务（「记住：xxx」沉淀经验）"></textarea>
        <button class="btn run">执行</button>
        <button class="btn secondary stop" hidden>停止</button>
      </div>
    </div>
  `;

  const $ = (sel) => shadow.querySelector(sel);
  const panel = $(".panel");
  const statusEl = $(".status-line");
  const stepsEl = $(".steps");
  const qboxEl = $(".qbox");
  const cboxEl = $(".cbox");
  const setboxEl = $(".setbox");
  const sessboxEl = $(".sessbox");
  const sessListEl = sessboxEl?.querySelector(".slist") ?? sessboxEl;
  const inputEl = $(".input-row textarea");
  const runBtn = $(".btn.run");
  const stopBtn = $(".btn.stop");
  const attachBar = $(".attach-bar");

  // ---------- 附件：粘贴图片/文件 → 预览条 → 发送时上传落盘工作区，路径引用拼进任务文本 ----------
  let attach = []; // { file, name, img(blob 预览 URL，非图片为 null) }
  const ATTACH_MAX = 6; // 单条消息最多附件数（后端另有单文件 20MB 上限）
  function renderAttach() {
    attachBar.hidden = !attach.length;
    attachBar.replaceChildren();
    for (const a of attach) {
      const chip = document.createElement("div");
      chip.className = "att";
      if (a.img) {
        const im = document.createElement("img");
        im.src = a.img;
        im.alt = a.name;
        chip.appendChild(im);
      } else {
        const n = document.createElement("span");
        n.className = "att-name";
        n.textContent = a.name;
        n.title = a.name;
        chip.appendChild(n);
      }
      const x = document.createElement("button");
      x.className = "att-x";
      x.textContent = "×";
      x.title = "移除附件";
      x.addEventListener("click", () => {
        if (a.img) URL.revokeObjectURL(a.img);
        attach = attach.filter((v) => v !== a);
        renderAttach();
      });
      chip.appendChild(x);
      attachBar.appendChild(chip);
    }
  }
  function clearAttach() {
    for (const a of attach) if (a.img) URL.revokeObjectURL(a.img);
    attach = [];
    renderAttach();
  }
  inputEl.addEventListener("paste", (e) => {
    const files = [...(e.clipboardData?.items ?? [])]
      .filter((it) => it.kind === "file")
      .map((it) => it.getAsFile())
      .filter(Boolean);
    if (!files.length) return;
    e.preventDefault(); // 附件走预览条，文本内容不拦（无文件时保持系统粘贴行为）
    for (const f of files) {
      if (attach.length >= ATTACH_MAX) {
        setStatus(`一次最多 ${ATTACH_MAX} 个附件`);
        break;
      }
      const img = f.type.startsWith("image/");
      attach.push({
        file: f,
        name: f.name || (img ? "粘贴图片.png" : "粘贴文件"),
        img: img ? URL.createObjectURL(f) : null,
      });
    }
    renderAttach();
  });
  async function uploadFile(file, taskId) {
    const cfg = await readCfg();
    const q = new URLSearchParams({ filename: file.name || "" });
    if (taskId) q.set("taskId", String(taskId)); // 续聊：以会话工作区为准
    else q.set("workspace", cfg.workspace || "");
    const r = await fetch(`${cfg.baseURL}/upload?${q}`, {
      method: "POST",
      headers: cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {},
      body: file,
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d?.error?.message || `HTTP ${r.status}`);
    return { path: String(d.path ?? ""), abs: String(d.abs ?? "") };
  }
  // 发送前上传全部附件，返回拼进任务文本的路径引用块；全部成功才清预览条（失败保留可重试）
  async function flushAttachments(taskId) {
    if (!attach.length) return "";
    const lines = [];
    try {
      for (const a of attach) {
        const r = await uploadFile(a.file, taskId);
        lines.push(`- ${a.img ? "图片" : "文件"}（${a.name}）：${r.abs || r.path}`);
      }
    } catch (e) {
      const msg = String(e?.message ?? e);
      // 失败要显眼：告警黄（非致命，任务照常发送可重传）
      addStep(
        `附件上传失败：${msg}${
          /404|未知接口/.test(msg) ? "（本地 relay 版本过旧，重启 DSH web 服务后重试）" : ""
        }。附件已保留，可直接重发`,
        "warn",
      );
      return null;
    }
    clearAttach();
    return `\n\n[附件已保存，请用文件读取工具按以下路径逐个查看后结合内容处理任务]\n${lines.join("\n")}`;
  }

  function setStatus(text) {
    statusEl.textContent =
      text.length > 160 ? `${text.slice(0, 160)}…（完整内容见步骤列表）` : text;
  }
  function setRunning(running) {
    runBtn.hidden = running;
    stopBtn.hidden = !running;
    inputEl.disabled = running;
  }
  let curThink = null; // 连续思考行的折叠组（DSH 风格：收起一行摘要，点开看片段）
  let replayCollapsed = false; // 会话回放加载后：新回合的过程行直接收进「执行过程」折叠条（对齐 DSH web UI 观感）
  // markdown 渲染：marked + DOMPurify（README 级：表格/嵌套列表/引用块等）；链接强制新标签打开
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener");
    }
  });
  // 裸 URL 自动链接保护：先把未包链的裸 URL 包成 <...> 再交给 marked，
  // 防止 URL 里的 * _ 等字符被当 markdown 强调语法解析坏（复制出的链接变形失效）。
  // 跳过代码段（围栏/行内，split 捕获组奇数位）与已有 markdown 链接 ](...) 里的 URL
  function autolinkBareUrls(src) {
    return String(src)
      .split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g)
      .map((seg, i) =>
        i % 2
          ? seg
          : seg.replace(
              /(?<![\w"'=<(])https?:\/\/[^\s<>()\[\]{}"'「」『』《》〈〉（）【】。，；：！？、…—·]+(?<![.,;:!?'"。，；：！？、…])/g,
              (u) => `<${u}>`,
            ),
      )
      .join("");
  }
  function renderMd(src) {
    return DOMPurify.sanitize(marked.parse(autolinkBareUrls(String(src)), { breaks: true, gfm: true }), {
      ADD_ATTR: ["target"],
    });
  }
  // ---------- GenUI（```dsh-ui 围栏，@changfenhuang/dsh-genui 插件）----------
  // runtime 与预装资产由 relay 的 /plugins/@changfenhuang/dsh-genui/assets/ 提供（vendor 自 npm 0.15.0），
  // 面板 sandbox iframe 内渲染；echarts 图表/声明式组件（布局/展示/chart/本地交互）全保真，
  // mermaid/scene3d/map 按 spec 关键词懒加载对应资产，缺失时 runtime 自行降级提示
  let relayBase = ""; // api() 每次刷新，addStep 渲染 GenUI iframe 时引用
  function buildGenuiFrame(specText) {
    let spec;
    try {
      spec = JSON.parse(specText);
    } catch {
      return null; // 残缺/流式中的 spec → 保留原代码块
    }
    if (!spec || typeof spec !== "object" || !Array.isArray(spec.items)) return null;
    const locale = (navigator.language || "zh").toLowerCase().startsWith("zh") ? "zh" : "en";
    const base = `${relayBase}/plugins/@changfenhuang/dsh-genui/assets`;
    const s = specText; // 关键词命中才加载重型引擎资产（mermaid 3.4MB/three/maplibre）
    const assetScripts = [
      "icons",
      "echarts-core",
      "echarts-full",
      ...(s.includes("mermaid") ? ["mermaid"] : []),
      ...(s.includes("three") || s.includes("scene3d") ? ["three"] : []),
      ...(s.includes("maplibre") || s.includes('"map"') ? ["maplibre"] : []),
      "standalone-runtime",
    ]
      .map((n) => `<script src="${base}/${n}.js"><\/script>`)
      .join("\n");
    const boot = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:#fff;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
#genui-root{padding:8px}
#genui-err{display:none;padding:8px;font-size:12px;color:#8a8f99}
</style></head><body>
<div id="genui-root"></div><div id="genui-err"></div>
${assetScripts}
<script>
(function(){
  var spec = ${JSON.stringify(spec).replace(/</g, "\\u003c")};
  var root = document.getElementById("genui-root");
  function report(){ try{ parent.postMessage({type:"genui-height",h:document.documentElement.scrollHeight},"*"); }catch(e){} }
  function fail(msg){
    root.style.display="none";
    var err=document.getElementById("genui-err");
    err.style.display="block";
    err.textContent="此 GenUI 组件需图形引擎支持，请在 DSH web UI 查看完整渲染（"+msg+"）";
    report();
  }
  try{
    if(!window.__GenuiStandalone__) return fail("runtime 未加载，请确认 relay 已启动");
    window.__GenuiStandalone__.mount(root,{format:"dsh-genui",version:1,spec:spec,presentation:{locale:${JSON.stringify(locale)},theme:"light"}});
    new MutationObserver(function(){ setTimeout(report,60); }).observe(document.body,{subtree:true,childList:true});
    setTimeout(report,300);
  }catch(e){ fail(e&&e.message||String(e)); }
})();
<\/script></body></html>`;
    const f = document.createElement("iframe");
    f.className = "genui-frame";
    f.setAttribute("sandbox", "allow-scripts"); // 无 allow-same-origin：spec 与宿主页完全隔离
    f.srcdoc = boot;
    f.style.height = "200px";
    return f;
  }
  function addUserBubble(text) {
    // 用户输入：右侧深色气泡（轻量混排，其余事件仍是日志行）；附件路径块不原样回显，图形化为缩略图/文件 chip
    const el = document.createElement("div");
    el.className = "step me";
    const attBlock = text.match(/\n?\[附件已保存[^\]]*\]\n((?:- .+(?:\n|$))+)/);
    if (!attBlock) {
      el.textContent = text;
    } else {
      el.textContent = text.slice(0, attBlock.index).trim() || "（附件）";
      const row = document.createElement("div");
      row.className = "att-row";
      for (const line of attBlock[1].trim().split("\n")) {
        const mm = line.match(/^- (?:图片|文件)（(.+?)）：(.+)$/);
        if (!mm) continue;
        const [, name, p] = mm;
        const rel = `dsh-relay-uploads/${String(p).split(/[\\/]/).pop()}`; // 上传端点固定目录，从任意路径形态还原相对路径
        if (/\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i.test(rel)) {
          const img = document.createElement("img");
          img.alt = name;
          img.title = `${name}（点击查看原图）`;
          img.addEventListener("click", () => window.open(img.src, "_blank"));
          row.appendChild(img);
          readCfg().then((cfg) => {
            img.src = `${String(cfg.baseURL ?? "").replace(/\/+$/, "")}/file?taskId=${activeTaskId}&p=${encodeURIComponent(rel)}&token=${encodeURIComponent(cfg.apiKey ?? "")}`;
          });
        } else {
          const chip = document.createElement("span");
          chip.className = "fchip";
          chip.textContent = `📄 ${name}`;
          row.appendChild(chip);
        }
      }
      el.appendChild(row);
    }
    stepsEl.appendChild(el);
    stepsEl.scrollTop = stepsEl.scrollHeight;
  }
  // 过程行收进最后一个「执行过程」折叠条（无则新建）；回放后新回合的过程行走这里，面板保持聚焦最终回复
  function appendProcessRow(el) {
    let det = [...stepsEl.querySelectorAll(".proc-box")].pop();
    if (!det) {
      det = document.createElement("details");
      det.className = "proc-box";
      const sum = document.createElement("summary");
      sum.textContent = "执行过程";
      const body = document.createElement("div");
      body.className = "proc-body";
      det.append(sum, body);
      stepsEl.insertBefore(det, stepsEl.firstChild);
    }
    const body = det.querySelector(".proc-body");
    body.appendChild(el);
    det.querySelector("summary").textContent = `执行过程（${body.children.length} 步）`;
  }
  function addStep(text, isError = false, md = false) {
    if (!isError && /^(思考：|模型推理中…)/.test(text)) {
      if (!curThink || !curThink.isConnected) {
        const det = document.createElement("details");
        det.className = "think";
        const sum = document.createElement("summary");
        sum.textContent = "思考";
        const body = document.createElement("div");
        body.className = "think-body";
        det.append(sum, body);
        replayCollapsed ? appendProcessRow(det) : stepsEl.appendChild(det);
        curThink = det;
      }
      const line = document.createElement("div");
      line.textContent = text;
      const body = curThink.querySelector(".think-body");
      body.appendChild(line);
      body.scrollTop = body.scrollHeight;
      stepsEl.scrollTop = stepsEl.scrollHeight;
      return;
    }
    curThink = null;
    const div = document.createElement("div");
    div.className = isError === "warn" ? "step warn" : isError ? "step err" : md ? "step md" : "step";
    // 先入列再渲染：async 函数首个 await 前同步执行，若先调 renderMdCore，
    // core 已预加载时会同步跑完 isConnected 检查（此时 div 还没挂进文档，恒为离场）直接跳过渲染
    replayCollapsed && !isError && !md ? appendProcessRow(div) : stepsEl.appendChild(div);
    if (md) {
      // 首选：DSH 原版渲染核心（按需加载 core 产物）；失败/不可用降级 marked 轻量管线
      prewriteMdImages(text)
        .catch(() => text)
        .then((t) =>
          renderMdCore(div, t)
            .catch((e) => {
              // 渲染流程自身异常（理论上内部已兜底，此处防漏网之鱼静默丢内容）
              console.warn("[dsh-assistant] 渲染流程异常，降级 marked：", e);
              if (div.isConnected && !div.textContent.trim()) renderMdLegacy(div, t, "渲染流程异常");
            })
            .finally(() => rewriteLocalImgs(div).catch(() => {})),
        );
    } else div.textContent = text;
    stepsEl.scrollTop = stepsEl.scrollHeight;
  }

  // DSH 渲染核心渲染一步骤（异步等待 core 就绪；div 先入列保证步骤顺序）。
  // React 渲染是异步调度的，且后台标签页 rAF 会被冻结——所以用 setTimeout 多轮复查
  // （2s 内每 200ms 一次），内容迟迟不出或事后被清都兜底降级，绝不静默丢内容
  async function renderMdCore(div, text) {
    const core = coreApi ?? (await loadCore());
    if (!div.isConnected) {
      console.log("[dsh-assistant] 渲染目标已离场（新会话清空？），跳过渲染");
      return;
    }
    if (core) {
      try {
        core.renderDshMd(div, text, (specText) => buildGenuiFrame(specText));
        const deadline = Date.now() + 2000;
        while (div.isConnected && !div.textContent.trim() && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 200));
        }
        if (!div.isConnected) {
          console.warn("[dsh-assistant] 渲染中目标离场（2s 内被移出文档），内容丢弃。", {
            textLen: text.length,
          });
          return;
        }
        if (!div.textContent.trim()) {
          console.warn("[dsh-assistant] 渲染核心 2s 未产出内容，降级 marked。诊断：", {
            children: div.children.length,
            htmlLen: div.innerHTML.length,
          });
          renderMdLegacy(div, text, "核心2s未产出");
          appendRenderNote(div, "渲染核心未产出内容，已降级轻量渲染");
        } else {
          // 内容出现过又消失（React 迟到崩溃/卸载）：半秒后复查补绘
          await new Promise((r) => setTimeout(r, 500));
          if (div.isConnected && !div.textContent.trim()) {
            console.warn("[dsh-assistant] 渲染核心内容事后丢失，降级重绘。诊断：", {
              children: div.children.length,
              htmlLen: div.innerHTML.length,
            });
            renderMdLegacy(div, text, "内容事后丢失");
            appendRenderNote(div, "渲染内容丢失，已降级重绘");
          }
        }
        verifyVisible(div, "core");
        stepsEl.scrollTop = stepsEl.scrollHeight;
        return;
      } catch (e) {
        console.warn("[dsh-assistant] DSH 渲染失败，降级 marked：", e);
        if (!div.isConnected) return;
        appendRenderNote(div, `DSH 渲染异常：${String(e?.message ?? e).slice(0, 120)}`);
      }
    }
    renderMdLegacy(div, text, core ? "核心渲染异常" : "核心不可用");
    await new Promise((r) => setTimeout(r, 200));
    if (div.isConnected && !div.textContent.trim()) {
      // marked 也产出为空：直接显示原文，内容绝不消失
      div.textContent = text;
      appendRenderNote(div, "markdown 渲染为空，已显示原文");
    }
    verifyVisible(div, "legacy");
  }
  function appendRenderNote(div, msg) {
    const note = document.createElement("div");
    note.className = "render-note";
    note.textContent = `⚠ ${msg}`;
    div.appendChild(note);
  }
  // 本地相对路径图片兜底：img 相对 src 是相对网页 URL 解析的，而模型写的是相对 DSH agent
  // 工作区的路径 → 直接加载必碎。渲染完成后统一改写成 relay /file 端点（按 taskId 定位
  // 工作区返回文件）/img 缓存端点（relay 已改写的 /img?u=… 补 base+token）；失败再兜占位，避免碎图标
  function hookImgFallback(img, src) {
    // /img 缓存端点失败先回退原始 URL（浏览器直拉，带用户登录 cookie，不受服务器出网限制
    // ——server 部署的 relay 可能拉不通外网/自身公网域名），仍失败才换占位提示
    const showTip = () => {
      if (!img.isConnected) return;
      const tip = document.createElement("div");
      tip.className = "img-fallback";
      tip.textContent = `⚠ 图片加载失败：${img.getAttribute("alt") || src}`;
      img.replaceWith(tip);
    };
    img.onerror = () => {
      img.onerror = null;
      if (!img.isConnected) return;
      if (!img.dataset.origTried && /\/img\?u=/.test(src)) {
        img.dataset.origTried = "1";
        try {
          const u = new URL(src, location.href).searchParams.get("u");
          if (u && /^https?:/i.test(u)) {
            img.onerror = showTip;
            img.src = u; // 回退原始 URL：浏览器直拉
            return;
          }
        } catch {}
      }
      showTip();
    };
  }
  // 渲染前 md 文本预处理：把本地图 src 预改写为 relay 绝对地址。DSH 渲染核心只对 http(s)
  // 绝对地址输出 <img>，相对路径/无协议 src（含 relay 改写的 /img /file）只渲染成 alt 文字
  // 占位 span——必须在渲染前补全协议，否则面板里图片「根本不展示」。跳过代码段；http(s)
  // 保持原样；改写后的绝对地址会让渲染后 rewriteLocalImgs 的补 token/兜底逻辑自然跳过改写分支
  async function prewriteMdImages(text) {
    if (!/!\[[^\]]*\]\([^()]+\)/.test(String(text))) return text;
    const cfg = await readCfg();
    const base = String(cfg.baseURL ?? "").replace(/\/+$/, "");
    const token = cfg.apiKey ? `&token=${encodeURIComponent(cfg.apiKey)}` : "";
    const abs = (src) => {
      if (/^(https?:|data:|blob:)/i.test(src)) return null;
      if (/^\/img\?/.test(src)) return `${base}${src}${token}`;
      if (activeTaskId) return `${base}/file?taskId=${activeTaskId}&p=${encodeURIComponent(src)}${token}`;
      return null;
    };
    return String(text)
      .split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g) // 奇数位为代码段，不处理
      .map((seg, i) =>
        i % 2
          ? seg
          : seg.replace(/(!\[[^\]]*\]\()([^()\s]+)(\))/g, (m, pre, src, post) => {
              const a = abs(src);
              return a ? pre + a + post : m;
            }),
      )
      .join("");
  }
  async function rewriteLocalImgs(div) {
    if (!div.isConnected) return;
    const cfg = await readCfg();
    const base = String(cfg.baseURL ?? "").replace(/\/+$/, "");
    for (const img of div.querySelectorAll("img")) {
      const src = img.getAttribute("src") ?? "";
      if (!src || /^(https?:|data:|blob:)/i.test(src)) {
        if (/^https?:/i.test(src) && !img.dataset.errHooked) {
          img.dataset.errHooked = "1";
          hookImgFallback(img, src);
        }
        continue;
      }
      if (img.dataset.localRewritten) continue;
      img.dataset.localRewritten = "1";
      // relay 图片缓存端点（md 下发前已改写为 /img?u=…）：补 relay base 与 token 直取缓存
      if (/^\/img\?/.test(src)) {
        img.src = `${base}${src}${cfg.apiKey ? `&token=${encodeURIComponent(cfg.apiKey)}` : ""}`;
        hookImgFallback(img, src);
        continue;
      }
      if (!activeTaskId) continue; // 任务工作区相对路径需要 taskId 定位，无任务时不改写
      img.src = `${base}/file?taskId=${activeTaskId}&p=${encodeURIComponent(src)}${cfg.apiKey ? `&token=${encodeURIComponent(cfg.apiKey)}` : ""}`;
      hookImgFallback(img, src);
    }
  }
  // 内容已提交进 DOM 但视觉高度为 0（样式层不可见，控制台无任何报错）：直接在面板上标注并吐诊断，
  // 避免这种「内容在但看不见」的情况只能靠用户肉眼看空白排查
  function verifyVisible(div, source) {
    if (!div.isConnected || !div.textContent.trim() || div.offsetHeight > 0) return;
    // 面板最小化（display:none）或步骤收进折叠条时高度必然为 0，属正常不可见，不算渲染事故
    if (panel.hidden || div.closest("details:not([open])")) return;
    const first = div.firstElementChild;
    const cs = first ? getComputedStyle(first) : null;
    const diag = {
      source,
      children: div.children.length,
      textLen: div.textContent.length,
      offsetHeight: div.offsetHeight,
      firstChildStyle: cs
        ? {
            display: cs.display,
            visibility: cs.visibility,
            opacity: cs.opacity,
            color: cs.color,
            fontSize: cs.fontSize,
            height: cs.height,
          }
        : null,
    };
    console.warn("[dsh-assistant] 内容已渲染但视觉高度为 0（疑似样式不可见）。诊断：", diag);
    appendRenderNote(div, "内容已渲染但不可见（高度 0），请把控制台 [dsh-assistant] 诊断发我");
  }

  // 对齐 DSH web UI：回合结束后把过程步骤（执行/等待/思考）收进可折叠条，突出最终回复。
  // 已有折叠条则归并进去（结果之后才到的收尾行也统一收纳），保持整回合只有一个大折叠
  function collapseProcess() {
    const items = [...stepsEl.children].filter(
      (el) =>
        (el.classList.contains("step") &&
          !el.classList.contains("md") &&
          !el.classList.contains("me") &&
          !el.classList.contains("err")) ||
        el.classList.contains("think"),
    );
    let det = stepsEl.querySelector(":scope > .proc-box");
    if (det) {
      // 已有折叠条（结果落地时建过）：归并后到的收尾行，计数同步刷新
      if (!items.length) return;
      const body = det.querySelector(".proc-body");
      for (const el of items) body.appendChild(el);
      det.querySelector("summary").textContent = `执行过程（${body.children.length} 步）`;
      return;
    }
    if (items.length < 2) return; // 过程太短不折
    det = document.createElement("details");
    det.className = "proc-box";
    const sum = document.createElement("summary");
    sum.textContent = `执行过程（${items.length} 步）`;
    const body = document.createElement("div");
    body.className = "proc-body";
    det.append(sum, body);
    stepsEl.insertBefore(det, items[0]);
    for (const el of items) body.appendChild(el);
  }

  // 降级统计埋点：legacy 备胎触发次数 + 最近原因（localStorage 持久，诊断面板展示）。
  // 目的：为「是否彻底移除 marked 备胎」的决策积累真实触发率数据
  const LEGACY_STAT_KEY = "dsh-assistant-legacy-stat";
  function readLegacyStat() {
    try {
      const s = JSON.parse(localStorage.getItem(LEGACY_STAT_KEY) || "{}");
      return { count: s.count || 0, lastReason: s.lastReason || "", lastAt: s.lastAt || "" };
    } catch {
      return { count: 0, lastReason: "", lastAt: "" };
    }
  }
  function bumpLegacyStat(reason) {
    try {
      const s = readLegacyStat();
      s.count += 1;
      s.lastReason = String(reason).slice(0, 120);
      s.lastAt = new Date().toLocaleString();
      localStorage.setItem(LEGACY_STAT_KEY, JSON.stringify(s));
    } catch {
      /* localStorage 不可用（隐私模式等）不影响渲染本身 */
    }
  }
  // marked 轻量渲染（DSH 管线失败时的 fallback）
  function renderMdLegacy(div, text, reason) {
    bumpLegacyStat(reason || "未知原因");
    try {
      div.innerHTML = renderMd(text);
    } catch (e) {
      console.warn("[dsh-assistant] marked 渲染失败，显示原文：", e);
      div.textContent = text;
      return;
    }
    // ```dsh-ui 围栏 → GenUI sandbox iframe 渲染（解析失败保留代码块）
    for (const pre of [...div.querySelectorAll("pre code.language-dsh-ui")].map((c) => c.closest("pre"))) {
      if (!pre) continue;
      const frame = buildGenuiFrame(pre.textContent);
      if (frame) pre.replaceWith(frame);
    }
    // 普通围栏代码：语法着色 + 右上角语言标签（对齐 DSH web UI；hljs 失败/缺失时保留纯色代码块）
    for (const pre of div.querySelectorAll("pre")) {
      const code = pre.querySelector("code");
      if (!code) continue;
      try {
        globalThis.hljs?.highlightElement(code);
      } catch {
        /* 高亮失败不影响渲染 */
      }
      const m = /language-([\w#+-]+)/.exec(code.className);
      if (m) {
        const tag = document.createElement("span");
        tag.className = "lang";
        tag.textContent = m[1];
        pre.appendChild(tag);
      }
    }
  }

  // ---------- 回合回复操作条：复制 + 用量与时间（对齐 DSH web UI）----------
  function fmtTok(n) {
    n = Math.round(Number(n) || 0);
    if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
    return String(n);
  }
  function flashTip(tip, text) {
    tip.textContent = text;
    tip.hidden = false;
    setTimeout(() => {
      tip.hidden = true;
    }, 2000);
  }
  // 挂到最后一条 md 回复下方；已有操作条不重复挂（面板刷新重放事件时也只挂一次）
  function attachActionBar(taskId, usage) {
    const mds = stepsEl.querySelectorAll(".step.md");
    const target = mds[mds.length - 1];
    if (!target || target.querySelector(".act-bar")) return;
    const text = target.textContent; // 挂条前取纯文本供复制
    const bar = document.createElement("div");
    bar.className = "act-bar";
    const tip = document.createElement("span");
    tip.className = "tip";
    tip.hidden = true;
    const copyBtn = document.createElement("button");
    copyBtn.title = "复制";
    copyBtn.setAttribute("aria-label", "复制");
    copyBtn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // 内网 http 页面非安全上下文 clipboard 不可用，退回 execCommand
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      flashTip(tip, "已复制");
    });
    const usageEl = document.createElement("span");
    usageEl.className = "meta";
    const total =
      Number(usage?.total) || (Number(usage?.input) || 0) + (Number(usage?.output) || 0);
    usageEl.textContent = total > 0 ? `${fmtTok(total)} tok` : "";
    const timeEl = document.createElement("span");
    timeEl.className = "meta";
    // 本回合耗时（面板提交 → 回合结束）；无起点（如刷新后恢复）回落显示完成时刻
    if (turnStartMs > 0) {
      const s = (Date.now() - turnStartMs) / 1000;
      timeEl.textContent = s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m${Math.round(s % 60)}s`;
    } else timeEl.textContent = new Date().toTimeString().slice(0, 5);
    const sp = document.createElement("span");
    sp.className = "sp";
    bar.append(copyBtn, tip, sp, usageEl, timeEl);
    target.appendChild(bar);
    stepsEl.scrollTop = stepsEl.scrollHeight;
  }

  // 配置优先级：覆盖层（扩展=chrome.storage / 页面=localStorage）> zip 注入(扩展)/mountPanel(init)(页面) > 默认值
  async function readCfg() {
    const o = await cfgOverrides();
    const zip = isExt ? globalThis.DEFAULTS : null; // zip 注入 config.js 先于本脚本加载
    const cfg = { ...DEFAULTS, ...INIT }; // init 含 script 标签 data-* 自动挂载传入的 token/baseURL，必须参与合并
    if (zip?.baseURL) cfg.baseURL = zip.baseURL;
    if (zip?.apiKey) cfg.apiKey = zip.apiKey; // zip 注入的 token 权威，storage 残留值不得覆盖
    // baseURL/token 允许覆盖层切换远程 relay，留空回落 init/默认值
    cfg.baseURL = o.baseURL || cfg.baseURL;
    cfg.apiKey = o.token || cfg.apiKey;
    cfg.customPrompt = o.customPrompt || cfg.customPrompt;
    // 旧档位名迁移：read/browser/browserFx→page；页面版封顶 L4 且档位名必须合法（all/L5 等非法值→dsh）
    cfg.aiLevel =
      { read: "page", browser: "page", browserFx: "page" }[o.aiLevel] || o.aiLevel || cfg.aiLevel;
    if (!isExt && (cfg.aiLevel === "all" || !["none", "page", "site", "dsh"].includes(cfg.aiLevel)))
      cfg.aiLevel = "dsh";
    // 会话级显式设置优先；未设置（空）回落页面全局
    cfg.showFx = sessFx !== "" ? sessFx === "1" : o.showFx === true || cfg.showFx === true;
    cfg.workspace = o.workspace || cfg.workspace;
    return cfg;
  }
  async function api(path, opts = {}) {
    const cfg = await readCfg();
    relayBase = cfg.baseURL; // GenUI iframe runtime 地址引用；页面版 core 加载 URL 也基于此
    void loadCore(); // 预取渲染核心（不阻塞；失败静默降级 marked）
    const r = await fetch(`${cfg.baseURL}${path}`, {
      ...opts,
      headers: {
        ...(cfg.apiKey
          ? { authorization: `Bearer ${cfg.apiKey}` }
          : {}), // token 留空 = 代理鉴权模式：凭据由后端代理统一注入，前端不暴露口令
        ...(opts.body ? { "content-type": "application/json" } : {}),
      },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error?.message || `HTTP ${r.status}`);
    return data;
  }

  // tabKey：每标签页唯一且跨导航稳定（http 内网页面非安全上下文，randomUUID 可能缺失）
  let tabKey = sessionStorage.getItem("dshAiTabKey");
  if (!tabKey)
    sessionStorage.setItem(
      "dshAiTabKey",
      (tabKey = crypto.randomUUID?.() ?? `t${Date.now()}-${Math.random().toString(36).slice(2)}`),
    );

  const pageKey = () => location.host + location.pathname; // 经验 key，去 query 防单据 id 碎片化

  // ---------- 页面命令执行器 ----------
  let pc = null;
  async function ensureController() {
    if (!pc) {
      // page-agent 注入：扩展版走 web_accessible_resources（构建期 IS_EXT 折叠保留此分支）
      if (IS_EXT) await import(chrome.runtime.getURL("vendor/page-agent.js"));
      // 页面版与面板同域同世界，相对路径动态 import（构建期内联；复用 extension/vendor 唯一副本）
      else await import("../../extension/vendor/page-agent.js");
      pc = new window.PageController({ enableMask: true, highlightLabelOpacity: 0 });
    }
    return pc;
  }
  const wrap = (r) => ({ ok: !!r?.success, message: String(r?.message ?? "") });

  function normText(s) {
    return (s || "").replace(/\s+/g, "");
  }
  // 按标签找输入框：label[for] → label 包裹 → UI 库表单项容器
  function findInputByLabel(label) {
    const target = normText(label);
    let loose = null;
    for (const lb of document.querySelectorAll("label")) {
      const text = normText(lb.textContent);
      if (text !== target && !(loose === null && text && text.includes(target))) continue;
      const input =
        (lb.htmlFor && document.getElementById(lb.htmlFor)) ||
        lb.querySelector("input,textarea") ||
        lb.parentElement?.querySelector("input,textarea");
      if (input) {
        if (text === target) return input;
        loose = input;
      }
    }
    if (loose) return loose;
    for (const item of document.querySelectorAll(
      '.el-form-item,.ant-form-item,[class*="form-item"],[class*="FormItem"]',
    )) {
      const lt = item.querySelector('label,[class*="label"]');
      if (lt && normText(lt.textContent) === target) return item.querySelector("input,textarea");
    }
    return null;
  }
  // 日期/下拉等只读组件拒绝直填，指引走点击路径
  function fillByLabel(label, value) {
    const input = findInputByLabel(label);
    if (!input)
      return {
        ok: false,
        message: `未找到标签为"${label}"的输入框，请改用 browser_get_state 后按索引操作`,
      };
    if (
      input.tagName === "INPUT" &&
      (input.readOnly ||
        input.closest(
          ".el-date-editor,.el-select,.el-autocomplete,.el-cascader,.el-dropdown,[class*=datepicker],[class*=date-picker],[class*=DatePicker],[class*=select],[class*=dropdown]",
        ))
    )
      return {
        ok: false,
        message: `"${label}" 是日期/下拉选择类组件（只读），直接填写赋不上值：请先用 browser_click 点击该字段展开面板/选项列表，再点击具体选项或日期格子（日期面板可用翻页箭头切换年月）`,
      };
    // 原型 setter 绕过 Vue/React 劫持，再派发事件触发框架响应
    const proto = input.tagName === "TEXTAREA" ? HTMLTextAreaElement : HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(proto.prototype, "value").set;
    input.focus();
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.blur();
    return { ok: true, message: `已填写"${label}" = "${value}"` };
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // 收集可见下拉选项（限定 scope 避免多个面板串扰）：精确匹配优先，其次包含
  function findOptionIn(scope, target) {
    let loose = null;
    for (const el of scope.querySelectorAll(
      '.el-select-dropdown__item,.el-cascader-node,.el-dropdown-menu__item,.ant-select-item,.ant-dropdown-menu-item,li[class*="option"],[class*="select-item"]',
    )) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const t = normText(el.textContent);
      if (!t || t.length > 40) continue;
      if (t === target) return el;
      if (loose === null && t.includes(target)) loose = el;
    }
    return loose;
  }
  // 打开中的下拉浮层选择器（Element Plus 隐藏面板 aria-hidden=true；antd hidden class）
  const OPEN_POPPER = '.el-popper[aria-hidden="false"], .ant-select-dropdown:not(.ant-select-dropdown-hidden)';
  // 优先当前激活面板（Element Plus 隐藏面板 aria-hidden=true；antd hidden class），找不到再全局兜底
  function findDropdownOption(text) {
    const target = normText(text);
    const active = document.querySelectorAll(OPEN_POPPER);
    for (const scope of active) {
      const hit = findOptionIn(scope, target);
      if (hit) return hit;
    }
    return findOptionIn(document, target);
  }
  // 组件库无关兜底：点开后「新出现/新可见」元素里找文本匹配的选项行（任何库的下拉都是点击后浮层出现）
  function findNewOption(before, text) {
    const target = normText(text);
    let best = null;
    let loose = null;
    for (const el of document.querySelectorAll("body *")) {
      if (before.has(el)) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const t = normText(el.textContent);
      if (!t || t.length > 40) continue;
      if (t === target) {
        // 父子同文本取最深（避免命中面板容器）
        if (!best || best.contains(el)) best = el;
      } else if (!loose && t.includes(target)) loose = el;
    }
    return best ?? loose;
  }
  function clickOption(el) {
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"])
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
  }
  // 兜底：面板第一个可见选项（优先激活面板类名行，未知库取新增可见叶子）
  function pickFirstOption(before) {
    const active = document.querySelectorAll(OPEN_POPPER);
    const sel =
      '.el-select-dropdown__item,.el-cascader-node,.el-dropdown-menu__item,.ant-select-item,.ant-dropdown-menu-item,li[class*="option"]';
    for (const scope of active.length ? active : [document]) {
      for (const el of scope.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return el;
      }
    }
    if (!before) return null;
    for (const el of document.querySelectorAll("body *")) {
      if (before.has(el) || ![...el.children].every((c) => !normText(c.textContent))) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && normText(el.textContent)) return el;
    }
    return null;
  }
  // 下拉点选同样过高危确认（行操作菜单「删除」项可经 browser_select 触达）；返回拒绝结果或 null
  async function confirmOptionClick(el) {
    if (el && isDangerClick(el) && !(await askDangerConfirm(el)))
      return {
        ok: false,
        message: "用户拒绝了该高危操作，禁止重试；如确需执行请先向用户说明理由",
      };
    return null;
  }

  // 下拉一步到位：原生 select 直选；自定义下拉（el-select/antd 等）点开面板按文本点选
  // 残留浮层收口：上轮失败的旧面板不关，下轮 get_state 会让面板选项占索引（漂移）且两面板并存匹配串台
  function closeLeftoverPoppers() {
    const active = document.querySelector(
      OPEN_POPPER + ", .el-picker-panel, .el-cascader__dropdown",
    );
    if (!active) return false;
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"])
      document.body.dispatchEvent(
        new MouseEvent(type, { bubbles: true, cancelable: true, view: window }),
      );
    return true;
  }
  async function selectByText(index, text) {
    const label = `（index ${index}）`;
    if (text == null || String(text).trim() === "")
      return { ok: false, message: `browser_select${label} 的 text 为空，禁止盲选` };
    const c = await ensureController();
    const native = wrap(await c.selectOption(index, String(text)));
    if (native.ok) return native;
    let denied = await confirmOptionClick(c.selectorMap.get(index)?.ref); // 打开面板的点击也可能落在删除按钮上
    if (denied) return denied;
    // 点开前先收掉残留面板（上一轮失败留下的），防两面板并存让索引漂移、选项匹配串台
    if (closeLeftoverPoppers()) await sleep(250);
    // 点开前快照：点开后新出现的浮层 = 面板（类名识别不到的组件库也能找到选项）
    const before = new Set();
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) before.add(el);
    }
    const open = wrap(await c.clickElement(index));
    if (!open.ok) return { ok: false, message: `打开下拉失败${label}：${open.message}` };
    await sleep(400);
    const opt = findDropdownOption(text) ?? findNewOption(before, text);
    if (!opt) {
      // 匹配不到就默认选第一个，字段不留空；模型可在后续步骤改选
      const fallback = pickFirstOption(before);
      if (!fallback)
        return {
          ok: false,
          message: `下拉面板中未找到「${text}」且无可见选项${label}，请 browser_click 该字段后重试`,
        };
      denied = await confirmOptionClick(fallback);
      if (denied) return denied;
      clickOption(fallback);
      await sleep(300);
      const picked = normText(fallback.textContent).slice(0, 40);
      return {
        ok: true,
        message: `未找到「${text}」，已默认选第一个「${picked}」；如需其他值请重新 browser_select 指定`,
      };
    }
    denied = await confirmOptionClick(opt);
    if (denied) return denied;
    clickOption(opt);
    await sleep(300);
    return { ok: true, message: `已选择「${text}」` };
  }

  // 推断输入框所属字段的标签文本（label[for] → aria-label → placeholder → 表单容器 label → 表格表头/左格）
  function fieldLabel(el) {
    if (!el) return "";
    const grab = (n) => (n?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 30);
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) return grab(l);
    }
    const aria = el.getAttribute("aria-label");
    if (aria) return aria.trim().slice(0, 30);
    const ph = el.getAttribute("placeholder");
    if (ph) return ph.trim().slice(0, 30);
    const item = el.closest(".el-form-item,[class*=form-item],[class*=FormItem]");
    const lb = item?.querySelector(".el-form-item__label,label,[class*=label]");
    if (lb && !lb.contains(el)) return grab(lb);
    const td = el.closest("td");
    if (td) {
      const tr = td.parentElement;
      const idx = [...tr.children].indexOf(td);
      const head = tr.closest("table")?.querySelectorAll("thead th")[idx];
      if (head) return grab(head);
      return grab(td.previousElementSibling);
    }
    return "";
  }

  // 高危操作点击二次确认：命中删除/支付/发送/提交等不可逆语义的元素先在面板弹确认卡，用户点「确认执行」才放行
  const DANGER_RE =
    /删除|移除|清空|销毁|作废|注销|撤销|卸载|格式化|支付|付款|转账|汇款|退款|结算|提交订单|确认收货|提交|发送|发布|递交|delete|remove|destroy|purge|pay|payment|checkout|transfer|refund|submit|send|publish/i;
  function isDangerClick(el) {
    if (!el) return false;
    const attrs = ["title", "aria-label", "class", "data-action"]
      .map((a) => el.getAttribute(a) || "")
      .join(" ");
    return DANGER_RE.test(`${el.textContent || ""} ${attrs}`);
  }
  function askDangerConfirm(el) {
    return new Promise((resolve) => {
      const label = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 50) || "(无文本)";
      const tip = document.createElement("div");
      tip.className = "ct";
      tip.textContent = `即将执行高危操作「${label}」（删除/支付/发送类，可能不可逆），确认执行？`;
      const ok = document.createElement("button");
      ok.className = "qsub";
      ok.textContent = "确认执行";
      const no = document.createElement("button");
      no.className = "qopt";
      no.textContent = "取消";
      let tick;
      const done = (v) => {
        clearInterval(tick);
        cboxEl.hidden = true;
        cboxEl.replaceChildren();
        resolve(v);
      };
      ok.addEventListener("click", () => done(true));
      no.addEventListener("click", () => done(false));
      cboxEl.replaceChildren(tip, ok, no);
      cboxEl.hidden = false;
      cboxEl.scrollIntoView({ block: "nearest" });
      setStatus("等待高危操作确认");
      tick = setInterval(() => cancelRequested && done(false), 500); // 手动停止视为取消
    });
  }

  async function runTool(tool, args) {
    const c = await ensureController();
    // 操作轨迹特效：独立开关 showFx，开启且档位≠L1（none）时显示模拟光标（hideMask 兜底收掉已展示的）
    const cfg = await readCfg();
    const wantFx = cfg.showFx === true && cfg.aiLevel !== "none";
    try {
      if (wantFx) await c.showMask();
      else await c.hideMask();
    } catch {
      /* 无 mask 不影响操作 */
    }
    switch (tool) {
      case "browser_get_state": {
        const st = await c.getBrowserState();
        return { ok: true, message: `${st.header}\n\n${st.content}\n\n${st.footer}` };
      }
      case "browser_click": {
        const denied = await confirmOptionClick(c.selectorMap.get(args.index)?.ref);
        if (denied) return denied;
        return wrap(await c.clickElement(args.index));
      }
      case "browser_input": {
        const r = wrap(await c.inputText(args.index, args.text));
        if (r.ok) {
          // 回显字段标签：让模型每步都能发现「值填进了不相干字段」并自行纠正
          const el = c.selectorMap.get(args.index)?.ref;
          const label = fieldLabel(el);
          if (label)
            r.message = `已填入 index:${args.index}（该处标签:「${label}」）= ${String(args.text).slice(0, 40)}。若标签与你要填的字段不符，立即用 browser_input 重新填正确位置`;
        }
        return r;
      }
      case "browser_select":
        return selectByText(args.index, args.text);
      case "browser_scroll": {
        const dir = ["up", "down", "left", "right"].includes(args.direction)
          ? args.direction
          : "down";
        const px = Number(args.amount) > 0 ? Number(args.amount) : undefined;
        return wrap(
          dir === "left" || dir === "right"
            ? await c.scrollHorizontally({ right: dir === "right", pixels: px })
            : await c.scroll({ down: dir === "down", pixels: px }),
        );
      }
      case "browser_fill_by_label":
        return fillByLabel(args.label, args.text);
      case "browser_execute_js": {
        const r = wrap(await c.executeJavascript(args.code));
        if (!r.ok && /unsafe-eval|Content Security Policy|Refused to evaluate/i.test(r.message)) {
          // 页面 CSP 拦 eval：扩展版走 debugger 兜底（background Runtime.evaluate 不受 CSP 限制）
          if (isExt) {
            const bg = await new Promise((res) =>
              chrome.runtime.sendMessage({ type: "dsh-exec-js", code: args.code }, (v) =>
                res(v ?? { ok: false, message: "❌ background 无响应" }),
              ),
            );
            return bg;
          }
          return {
            ok: false,
            message: `${r.message}（页面版无 debugger 兜底：请宿主页面 CSP 放开 unsafe-eval，或避免 browser_execute_js）`,
          };
        }
        return r;
      }
      case "browser_navigate": {
        const raw = String(args?.url ?? "").trim();
        let target;
        try {
          target = new URL(raw);
        } catch {
          return { ok: false, message: `URL 无效：${raw.slice(0, 100)}（必须是 http/https 绝对地址）` };
        }
        if (!/^https?:$/.test(target.protocol))
          return { ok: false, message: "URL 必须是 http/https 绝对地址" };
        // 同域含子域校验（L3/L4；L5 all 导航不限域）：站点键 = hostname 末两段（IP 与单段主机名原样）
        const siteKey = (h) => {
          h = String(h ?? "").toLowerCase();
          return /^\d+\.\d+\.\d+\.\d+$/.test(h) || !h.includes(".")
            ? h
            : h.split(".").slice(-2).join(".");
        };
        if (cfg.aiLevel !== "all" && siteKey(target.hostname) !== siteKey(location.hostname))
          return {
            ok: false,
            message: `智能等级限制：仅允许同域（含子域）导航，目标 ${target.hostname} 与当前站点 ${location.hostname} 不同域，已拦截。`,
          };
        // 断点续传：命令回传才 settle，导航后新页面 loader 重轮询会再次收到本命令，
        // 此时目标已是当前页 → 直接回成功，模型即可继续操作新页面
        if (target.href === location.href)
          return { ok: true, message: `已导航到 ${target.href}，新页面已就绪` };
        setTimeout(() => {
          location.href = target.href;
        }, 50); // 略等结果回传 fetch 发出再跳转
        return { ok: true, message: `正在导航到 ${target.href}，新页面就绪后继续操作` };
      }
      default:
        return { ok: false, message: `未知命令：${tool}` };
    }
  }

  // ---------- 原生弹窗拦截（dialog-hook.js 主世界钩子，任务期启用） ----------
  const dialogLog = [];
  window.addEventListener("message", (e) => {
    if (e.data?.__dshDialog) dialogLog.push(e.data.__dshDialog);
    // GenUI iframe 内容高度自适应
    if (e.data?.type === "genui-height" && typeof e.data.h === "number") {
      const f = [...stepsEl.querySelectorAll("iframe.genui-frame")].find(
        (x) => x.contentWindow === e.source,
      );
      if (f) f.style.height = `${Math.min(Math.max(e.data.h, 60), 2400)}px`;
    }
  });
  const setDialogHook = (mode) => window.postMessage({ __dshDialogCtl: { mode } }, "*");
  // 取走本轮命令期间累积的弹窗记录，转成结果附注
  function drainDialogs(mark) {
    const lines = dialogLog.splice(mark).map((d) => {
      const ans =
        d.type === "alert"
          ? "已关闭"
          : d.type === "confirm"
            ? d.cancelled
              ? "已自动取消（高危操作护栏不放行）"
              : "已自动确认"
            : "已填默认值提交";
      return `${d.type}「${String(d.text).slice(0, 120)}」→ ${ans}`;
    });
    return lines.length ? `\n⚠️ 拦截到原生弹窗：${lines.join("；")}` : "";
  }

  async function executeCommand(cmd) {
    const mark = dialogLog.length;
    const r = await executeCommandInner(cmd);
    const note = drainDialogs(mark);
    return note ? { ...r, message: r.message + note } : r;
  }

  async function executeCommandInner(cmd) {
    try {
      if (cmd.tool !== "browser_batch") return await runTool(cmd.tool, cmd.args ?? {});
      const steps = Array.isArray(cmd.args?.steps) ? cmd.args.steps : [];
      if (!steps.length) return { ok: false, message: "browser_batch：steps 为空" };
      const results = [];
      const succeeded = []; // 成功步骤原文：relay 存剧本用（剔除失败步）
      for (const [i, s] of steps.entries()) {
        if (cancelRequested)
          return {
            ok: false,
            succeededSteps: succeeded,
            message: `已手动停止（第 ${i + 1} 步起共 ${steps.length - i} 步未执行）`,
          };
        const r = await runTool(s?.tool, s?.args ?? {});
        results.push(`第${i + 1}步 ${s?.tool}：${r.ok ? "成功" : `失败（${r.message}）`}`);
        if (r.ok) succeeded.push(s);
        if (!r.ok && cmd.args?.stopOnError)
          return {
            ok: false,
            succeededSteps: succeeded,
            message: `批量在第 ${i + 1} 步失败后停止（${steps.length - i - 1} 步未执行）：\n${results.join("\n")}`,
          };
      }
      const fails = results.filter((r) => r.includes("失败"));
      return {
        ok: !fails.length,
        succeededSteps: succeeded,
        message: fails.length
          ? `批量完成 ${steps.length} 步，其中 ${fails.length} 步失败：\n${results.join("\n")}`
          : `批量完成全部 ${steps.length} 步`,
      };
    } catch (e) {
      return { ok: false, message: String(e?.message ?? e) };
    }
  }

  // ---------- 任务轮询与提交 ----------
  let activeTaskId = 0;
  let activeSessionId = "";
  let cancelRequested = false; // 本地停止标志：中断 batch 循环、跳过后续命令执行
  // 当前回合起点（面板提交 → 回合结束），操作条据此显示回合耗时；sessionStorage 持久化刷新后仍可算
  let turnStartMs = Number(sessionStorage.getItem("dshAiTurnStart")) || 0;
  // 清除 get_state 留下的元素索引标注框（vendor 只在路由变化时清理，任务结束需主动清）
  function clearHighlights() {
    try {
      for (const f of window._highlightCleanupFunctions || []) typeof f === "function" && f();
      window._highlightCleanupFunctions = [];
      document.querySelectorAll(".playwright-highlight-container").forEach((n) => n.remove());
    } catch {
      /* 清理失败不影响任务收尾 */
    }
  }
  // 任务收尾共享重置：停止标志/输入态/弹窗钩子/高亮残留/模拟光标/提问卡一次清干净
  function resetTask() {
    activeTaskId = 0;
    cancelRequested = false;
    chatMode = false;
    replayCollapsed = false; // 新任务恢复正常流动视图（首回合过程行平铺可见）
    sessionStorage.removeItem("dshAiTask");
    setRunning(false);
    setDialogHook("off");
    clearHighlights();
    closeLeftoverPoppers(); // 顺手收掉残留下拉浮层
    try {
      pc?.hideMask(); // 收起模拟光标，交还页面给用户
    } catch {
      /* 清理失败不影响任务收尾 */
    }
    hideQuestion();
    hideApproval();
  }
  // 会话未结束也可切换：先自动停掉进行中的回合（等同点停止，pending 命令由 relay 收敛、会话保留可切回续聊）
  async function stopRunningTurn() {
    if (activeTaskId && !stopBtn.hidden) {
      try {
        await api("/task/cancel", { method: "POST", body: JSON.stringify({ taskId: activeTaskId }) });
      } catch {
        /* 停止失败不阻断切换：旧任务若仍 running，relay 守卫会兜底提示 */
      }
    }
  }
  function finishTask(d) {
    const tid = activeTaskId; // resetTask 会清零，先留作反馈归属
    resetTask();
    const label = d.status === "done" ? "完成" : d.status === "cancelled" ? "已停止" : "失败";
    setStatus(d.statusText || label); // 状态栏只放状态词
    // 已停止=用户主动取消非致命，走告警黄；真正失败才是错误红
    addStep(d.statusText || label, d.status === "cancelled" ? "warn" : d.status !== "done");
    if (d.status === "done") attachActionBar(tid, d.usage);
  }
  function halt(e) {
    resetTask();
    addStep(`出错：${e.message}`, true);
    setStatus(
      `出错：${e.message}${/fetch|network|Failed/i.test(e.message) ? "（请确认本地 DSH 已启动，127.0.0.1:9916）" : ""}`,
    );
  }

  // ---------- 斜杠命令：/plan 计划模式、/compact 压缩（relay 转调 DSH 官方服务） ----------
  const menuEl = $(".menu");
  function closeMenu() {
    menuEl.hidden = true;
    menuEl.replaceChildren();
  }
  function showMenu(items) {
    menuEl.replaceChildren(
      ...items.map((it) => {
        if (it.head) {
          const h = document.createElement("div");
          h.className = "head";
          h.textContent = it.head;
          return h;
        }
        const b = document.createElement("button");
        const label = document.createElement("span");
        label.className = "l";
        label.textContent = it.label;
        const sub = document.createElement("span");
        sub.className = "g";
        sub.textContent = it.sub ?? "";
        b.append(label, sub);
        b.addEventListener("click", () => {
          closeMenu();
          it.onClick();
        });
        return b;
      }),
    );
    menuEl.hidden = false;
  }
  async function runSlash(body, desc) {
    // /compact 等命令要等 DSH 跑完（如压缩需一轮模型总结，几十秒），先给反馈避免像没执行
    setStatus(`${desc}执行中`);
    try {
      const r = await api(`/task/${activeTaskId}/command`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      addStep(r.message);
      setStatus(r.message);
    } catch (e) {
      addStep(`${desc}失败：${e.message}`, "warn"); // 命令失败不致命，会话仍可继续
      setStatus(`${desc}失败：${e.message}`);
    }
  }
  // 面板命令菜单：输入 / 弹出（模型跟随 DSH 设置，不做 /model 切换；其他命令仍可手输透传）
  // 技能目录来自 DSH sessionSkillCatalog（按任务缓存）；调用 = 把 /技能名 作为回合文本提交（DSH 手势识别展开）
  let skillCache = null; // { taskId, list: [{name, description}] }
  async function ensureSkills() {
    if (!activeTaskId) return [];
    if (skillCache?.taskId === activeTaskId) return skillCache.list;
    try {
      const d = await api(`/skills?taskId=${activeTaskId}`);
      skillCache = { taskId: activeTaskId, list: d.skills ?? [] };
    } catch {
      skillCache = { taskId: activeTaskId, list: [] };
    }
    return skillCache.list;
  }
  function showCommandMenu() {
    setStatus("选择命令");
    const runCmd = (cmd) => {
      inputEl.value = cmd;
      autoGrow();
      run();
    };
    const items = [
      { head: "命令" },
      { label: "计划模式（进入或退出）", sub: "/plan", onClick: () => runCmd("/plan") },
      { label: "压缩上下文", sub: "/compact", onClick: () => runCmd("/compact") },
    ];
    ensureSkills().then((skills) => {
      if (menuEl.hidden) return; // 菜单已被关掉（如用户继续输入）
      if (!skills.length) {
        setStatus(activeTaskId ? "DSH 技能目录为空或获取失败" : "发起任务后，菜单会列出 DSH 技能");
        return;
      }
      showMenu([
        ...items,
        { head: "技能" },
        ...skills.map((s) => {
          const desc = s.description || "";
          return {
            label: s.name,
            sub: desc.slice(0, 15) + (desc.length > 15 ? "…" : ""),
            onClick: () => runCmd(`/${s.name}`),
          };
        }),
      ]);
    });
    showMenu(items);
  }
  // ---------- 历史会话列表：面板发起过的会话存 localStorage，点开切换并回放历史 ----------
  const SESS_KEY = "dshAiSessions"; // [{sessionId, taskId, title, prompt, fx, ts}]，taskId 可能因 relay 重启重挂后变化
  const SESS_CAP = 30;
  let sessPrompt = sessionStorage.getItem("dshAiSessPrompt") || ""; // 会话级 prompt：随会话保存切换，新会话清空；提交时拼接在页面全局 prompt 后
  let sessFx = sessionStorage.getItem("dshAiSessFx") ?? ""; // 会话级特效："1"/""（空=回落页面全局配置）
  function setSessField(key, storeKey, v) {
    v = String(v ?? "");
    sessionStorage.setItem(storeKey, v);
    if (activeSessionId) {
      const entry = loadSessionList().find((s) => s.sessionId === activeSessionId);
      if (entry) saveSessionEntry({ ...entry, [key]: v }); // 回写会话条目，切换/回放后仍在
    }
    return v;
  }
  const setSessPrompt = (v) => (sessPrompt = setSessField("prompt", "dshAiSessPrompt", v));
  const setSessFx = (v) => (sessFx = setSessField("fx", "dshAiSessFx", v));
  function loadSessionList() {
    try {
      const list = JSON.parse(localStorage.getItem(SESS_KEY));
      return Array.isArray(list) ? list.filter((s) => s?.sessionId) : [];
    } catch {
      return [];
    }
  }
  function saveSessionEntry(entry) {
    const prev = loadSessionList().find((s) => s.sessionId === entry.sessionId);
    if (prev && entry.prompt === undefined) entry.prompt = prev.prompt; // 未显式给 prompt 时保留旧值（切换回放路径）
    if (prev && entry.fx === undefined) entry.fx = prev.fx; // 同上，特效会话级值
    const list = loadSessionList().filter((s) => s.sessionId !== entry.sessionId);
    list.unshift(entry);
    localStorage.setItem(SESS_KEY, JSON.stringify(list.slice(0, SESS_CAP)));
  }
  function fmtTime(ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  function hideSessions() {
    sessboxEl.classList.remove("show");
  }
  function toggleSessions() {
    if (sessboxEl.classList.contains("show")) return hideSessions();
    setboxEl.classList.remove("show"); // 与设置抽屉互斥（同一停靠位）
    sessListEl.replaceChildren();
    const list = loadSessionList();
    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "暂无历史会话（发起任务后自动记录）";
      sessListEl.appendChild(empty);
    }
    for (const entry of list) {
      const row = document.createElement("div");
      row.className = "srow";
      const title = document.createElement("span");
      title.className = "s-title";
      title.textContent = (entry.title || "").slice(0, 10) || "(无标题)"; // 行内仍显示前 10 字符
      title.title = entry.title || "";
      const id = document.createElement("span");
      id.className = "s-id";
      id.textContent = entry.sessionId;
      id.title = entry.sessionId;
      const time = document.createElement("span");
      time.className = "s-time";
      time.textContent = fmtTime(entry.ts);
      row.append(title, id, time);
      row.addEventListener("click", () => loadSession(entry));
      sessListEl.appendChild(row);
    }
    sessboxEl.style.width = panel.getBoundingClientRect().width + "px"; // 宽度对齐面板（面板可拖宽）
    sessboxEl.classList.add("show"); // 右侧抽屉：从右滑入盖住面板（收回向右）
  }
  // 切换到历史会话：拉取历史回放（relay 会按 sessionId 重挂被清理的记录），此后与 live 会话无异（可续聊/可操作页面）
  async function loadSession(entry) {
    await stopRunningTurn(); // 旧回合进行中也放行切换：先自动停掉（会话保留）
    pollGen++; // 停掉当前任务轮询
    resetTask();
    if (coreApi) for (const el of stepsEl.children) coreApi.unmountDshRd(el);
    stepsEl.replaceChildren();
    hideSessions();
    setStatus("正在加载会话历史…");
    try {
      const d = await api(
        `/task/${entry.taskId}/history?sessionId=${encodeURIComponent(entry.sessionId)}&tab=${encodeURIComponent(tabKey)}`,
      );
      entry.taskId = d.taskId; // relay 重启后重挂，taskId 可能变化，回写列表
      saveSessionEntry(entry);
      activeTaskId = d.taskId;
      activeSessionId = entry.sessionId;
      setSessPrompt(entry.prompt || ""); // 会话级 prompt 随会话切换
      setSessFx(entry.fx ?? ""); // 特效随会话切换
      sessionStorage.setItem("dshAiTask", String(d.taskId));
      chatMode = true; // 历史会话一律会话模式：可继续输入
      for (const ev of d.events ?? []) {
        if (ev.user) addUserBubble(ev.text);
        else addStep(ev.text, false, ev.md);
      }
      collapseProcess(); // 历史回放的执行过程折叠（与 live 终态折叠口径一致），突出最终回复
      replayCollapsed = true; // 此后新回合的过程行直接收进折叠条（对齐 DSH web UI 观感），直到开新会话
      addStep(`已切换到会话 ${d.taskId}（共 ${d.events?.length ?? 0} 条记录），可直接继续输入`);
      setStatus(d.statusText || "对话中（可继续输入）");
      setRunning(false);
      setDialogHook("off");
      hideSessions(); // 加载成功滑回会话视图（回放内容已在下方就绪）
      pollLoop(d.taskId, d.seq); // 从历史末尾续接轮询，不重不漏
    } catch (e) {
      hideSessions(); // 失败也要滑回，让错误信息可见
      halt(e);
    }
  }
  $(".sessions").addEventListener("click", toggleSessions);
  sessboxEl.querySelector(".sback").addEventListener("click", hideSessions);

  // 抽屉吸顶位置上下拖动（会话/设置共用同一停靠位与记忆）：按住标题栏改 top（0 ~ 视口高-60）
  const SESS_TOP_KEY = "dshAiSessTop";
  const sessTopClamp = (t) => Math.min(Math.max(t, 0), window.innerHeight - 60); // 就地 clamp（clamp 定义在后方，此处引用会 TDZ）
  const drawers = [sessboxEl, setboxEl];
  try {
    const t = parseFloat(localStorage.getItem(SESS_TOP_KEY)); // null→NaN，恰好跳过无记忆场景
    if (Number.isFinite(t)) drawers.forEach((box) => (box.style.top = sessTopClamp(t) + "px"));
  } catch {}
  for (const box of drawers)
    box.querySelector(".shead").addEventListener("mousedown", (e) => {
      if (e.button !== 0 || e.target.closest(".sback")) return;
      e.preventDefault();
      const y0 = e.clientY;
      const t0 = box.getBoundingClientRect().top;
      const onMove = (ev) =>
        (box.style.top = sessTopClamp(Math.round(t0 + ev.clientY - y0)) + "px");
      const onUp = () => {
        window.removeEventListener("mousemove", onMove, true);
        window.removeEventListener("mouseup", onUp, true);
        try {
          localStorage.setItem(SESS_TOP_KEY, String(Math.round(parseFloat(box.style.top))));
        } catch {}
      };
      window.addEventListener("mousemove", onMove, true);
      window.addEventListener("mouseup", onUp, true);
    });

  // 「+」开新会话：断开当前任务绑定（终止轮询），下一条输入新建任务会话；旧会话仍可在 DSH web UI 回看
  async function newChat() {
    await stopRunningTurn(); // 旧回合进行中也放行：先自动停掉（会话保留）
    pollGen++; // 旧轮询循环检测到代际变化自行退出
    resetTask();
    clearAttach(); // 清掉未发送的粘贴附件（blob 预览一并释放）
    activeSessionId = ""; // 新会话：会话级配置一并回落全局
    setSessPrompt("");
    setSessFx("");
    if (coreApi) for (const el of stepsEl.children) coreApi.unmountDshRd(el); // 卸载 DSH 渲染的 React root
    stepsEl.replaceChildren();
    setStatus("空闲（输入即新任务）");
  }

  let pollGen = 0; // 轮询代际：新轮询启动后旧的自行退出（防双循环重复轮询）
  async function pollLoop(taskId, startAfter = 0) {
    const myGen = ++pollGen;
    let after = startAfter;
    let wasRunning = null; // chat 模式运行态变化检测（避免每轮重复切 hook）
    let procCollapsed = false; // 本回合过程步骤是否已折叠（终态折一次，新回合重置）
    let idleMs = 800; // chat 空闲轮询间隔（无动静翻倍退避至 4s，有动静恢复 800ms）
    let netDownSince = 0; // 网络断连起点（0=连接正常）：瞬时抖动静默重试，不再一断就红字报错吓用户
    try {
      while (true) {
        if (myGen !== pollGen) return;
        let d;
        try {
          d = await api(
            `/task/${taskId}/poll?after=${after}&tab=${encodeURIComponent(tabKey)}`,
          );
        } catch (e) {
          if (!/fetch|network|failed/i.test(String(e?.message ?? e))) throw e; // 非网络错误照旧上抛
          if (!netDownSince) {
            netDownSince = Date.now();
            setStatus("与本地助手连接中断，重连中…");
          }
          if (Date.now() - netDownSince > 60000) {
            // 超过 1 分钟仍连不上才降级：文案平静可操作，不再显示英文 NetworkError
            resetTask();
            addStep(
              "与本地助手（relay）断开超过 1 分钟，已停止监听。请确认 DSH web 服务正在运行，之后可在「历史会话」中切回本会话继续。",
              "warn", // 告警橙而非错误红：断连可恢复，不是任务失败
            );
            setStatus("本地助手连接断开");
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        if (netDownSince) {
          netDownSince = 0; // 重连成功：恢复状态栏（任务绑定未清，无缝续接）
          setStatus(d.statusText || "对话中（可继续输入）");
        }
        for (const ev of d.events ?? []) {
          if (ev.user)
            addUserBubble(ev.text); // 用户消息统一由 relay 事件回显（本地发送不重复画）
          else addStep(ev.text, false, ev.md);
          if (ev.md && !procCollapsed) {
            procCollapsed = true; // 结果一落地就折叠其上的过程步骤，突出最终回复，不等终态
            collapseProcess();
          }
          after = Math.max(after, ev.seq);
        }
        if (d.statusText) {
          setStatus(d.statusText);
          // 回合终态（已完成/已失败/任务失败/会话模式回合结束）：把本轮过程步骤收进折叠条，对齐 DSH web UI；新回合开始时重置
          const done = /已完成|已失败|任务失败|对话中（可继续输入）|对话中（上一回合异常）/.test(d.statusText);
          if (done) {
            collapseProcess(); // 终态兜底清扫：结果后才到的收尾行也归入同一折叠条（已有条则归并）
            procCollapsed = true;
          } else if (!done) procCollapsed = false;
        }
        if (d.command) {
          // 已请求停止：不再执行，回传占位结果（relay 侧 cancel 已 settle，此为兜底）后等终态
          const value = cancelRequested
            ? { ok: false, message: "任务已手动停止" }
            : await executeCommand(d.command);
          await api("/task/result", {
            method: "POST",
            body: JSON.stringify({ taskId, commandId: d.command.commandId, value }),
          });
          continue;
        }
        if (d.approval) showApproval(d.approval);
        else hideApproval();
        if (d.question) showQuestion(d.question);
        else if (!qboxEl.hidden && qboxEl.dataset.ap !== "1") hideQuestion();
        if (d.chat) {
          // 会话模式：常驻不终态；回合中禁输入显示停止，空闲恢复输入并放慢轮询（relay 对 chat 空闲立即返回）
          chatMode = true;
          const r = d.status === "running";
          if (wasRunning !== r) {
            wasRunning = r;
            setRunning(r);
            setDialogHook(r ? "on" : "off");
            if (!r) {
              attachActionBar(taskId, d.usage); // 回合结束：最后一条回复挂操作条（含刷新重放首拍）
              try {
                pc?.hideMask(); // 回合结束收起模拟光标与点击特效，页面交还用户
              } catch {
                /* 清理失败不影响收尾 */
              }
              closeLeftoverPoppers(); // 顺手收掉回合残留下拉浮层（仅切换拍一次，不动用户手开的下拉）
            }
          }
          // 会话模式回合结束不走 finishTask/resetTask（任务常驻），空闲期每次 poll 清索引标注（防切换拍漏清）
          if (!r) clearHighlights();
          // 空闲退避：运行中/有新事件/命令/提问/审批 → 保持 800ms 快轮询；持续空闲 → 800ms 翻倍至 4s 封顶，省空闲期代理流量
          idleMs =
            r || (d.events?.length ?? 0) > 0 || d.command || d.question || d.approval
              ? 800
              : Math.min(idleMs * 2, 4000);
          if (!r) await new Promise((resolve) => setTimeout(resolve, idleMs));
          continue;
        }
        if (d.status !== "running") {
          finishTask(d);
          return;
        }
      }
    } catch (e) {
      halt(e);
    }
  }

  let chatMode = false; // 会话模式：当前任务为 relay 常驻 chat，输入走 /task/:id/message 续聊
  async function run() {
    let task = inputEl.value.trim();
    if (!task && attach.length) task = "请查看附件内容并处理"; // 纯附件发送：给 agent 一句指令
    if (!task) return;
    inputEl.value = "";
    autoGrow();
    // 「记住：xxx」→ 存本页经验，不执行任务
    const memo = task.match(/^记住[：:]\s*(.+)$/);
    if (memo) {
      const text = memo[1].trim();
      if (!text) {
        setStatus("要记住的内容不能为空");
        return;
      }
      try {
        await api("/memory", { method: "POST", body: JSON.stringify({ host: pageKey(), text }) });
        setStatus(`已记住（${pageKey()}）：${text}`);
      } catch (e) {
        setStatus(`记忆保存失败：${e.message}（请确认本地 DSH 已启动）`);
      }
      return;
    }
    // 斜杠输入：/ 弹命令菜单；/技能名 命中目录 → 落到下方按普通文本提交（DSH 手势识别展开技能）；
    // 其余整行透传给 DSH 命令注册表（/plan、/plan off、/compact、/permission…）
    if (/^\//.test(task)) {
      if (/^\/$/.test(task)) {
        showCommandMenu();
        return;
      }
      if (!activeTaskId) {
        setStatus("请先发起任务或点 + 开启会话");
        return;
      }
      const name = task.replace(/^\//, "").trim().split(/\s+/)[0];
      if (!(await ensureSkills()).some((s) => s.name === name)) {
        addUserBubble(task);
        runSlash({ action: task.replace(/^\//, "") }, "命令");
        return;
      }
    }
    if (activeTaskId && !chatMode) {
      // 旧任务回合未结束也可直接发起新任务：先自动停掉旧回合（会话保留），后续走新任务分支
      await stopRunningTurn();
    }
    if (chatMode && activeTaskId) {
      // 会话续聊：同一会话提交新回合（可追问、可继续操作页面）
      try {
        const att = await flushAttachments(activeTaskId);
        if (att === null) return; // 附件上传失败：预览条保留，不提交
        cancelRequested = false;
        setDialogHook("on");
        await api(`/task/${activeTaskId}/message`, {
          method: "POST",
          body: JSON.stringify({ text: task + att, tabKey }),
        });
        turnStartMs = Date.now(); // 续聊新回合起点（操作条据此显示回合耗时）
        sessionStorage.setItem("dshAiTurnStart", String(turnStartMs));
        setRunning(true);
        // 气泡由 relay 的 user 事件经 poll 回显（刷新重放也能恢复），本地不重复画
        setStatus("已提交，DSH agent 执行中");
      } catch (e) {
        halt(e);
      }
      return;
    }
    if (stepsEl.childNodes.length) {
      const sep = document.createElement("div");
      sep.className = "divider";
      sep.textContent = "── 新任务 ──";
      stepsEl.appendChild(sep);
    }
    clearHighlights(); // 兜底清掉上一任务可能残留的索引标注（首条气泡由 relay 的 user 事件经 poll 回显，刷新/切会话回放不丢）
    turnStartMs = Date.now(); // 新任务回合起点（操作条据此显示回合耗时）
    sessionStorage.setItem("dshAiTurnStart", String(turnStartMs));
    try {
      const { customPrompt, aiLevel, workspace } = await readCfg();
      const att = await flushAttachments(null);
      if (att === null) return; // 附件上传失败：预览条保留，不提交
      const d = await api("/task", {
        method: "POST",
        body: JSON.stringify({
          text: task + att,
          url: location.href,
          title: document.title,
          pageKey: pageKey(),
          customPrompt: [customPrompt, sessPrompt].filter(Boolean).join("\n"), // 页面全局 + 会话级 拼接下发
          aiLevel: aiLevel || "dsh",
          workspace: workspace || "",
          tabKey,
        }),
      });
      activeTaskId = d.taskId;
      activeSessionId = d.sessionId;
      sessionStorage.setItem("dshAiTask", String(d.taskId));
      saveSessionEntry({ sessionId: d.sessionId, taskId: d.taskId, title: task.slice(0, 200), prompt: sessPrompt, fx: sessFx, ts: Date.now() }); // 存 200 字符，列表行只显示前 10、悬停提示全文
      cancelRequested = false;
      setRunning(true);
      setDialogHook("on");
      addStep(`已创建 DSH 会话：${d.sessionId}（可在 DSH web UI 查看/追问）`);
      setStatus("任务已提交，DSH agent 执行中");
      pollLoop(d.taskId);
    } catch (e) {
      halt(e);
    }
  }

  // ---------- DSH 提问卡：ask_user_question 挂起时面板内直接作答（经 relay 走官方 answer 注入） ----------
  let qCallId = "";
  function hideQuestion() {
    qCallId = "";
    qboxEl.hidden = true;
    qboxEl.replaceChildren();
    delete qboxEl.dataset.ap; // 清审批标记，防后续 hideApproval 误伤提问卡
  }
  function showQuestion(q) {
    if (qCallId === q.callId) return; // 同一问题已渲染（poll 幂等）
    qCallId = q.callId;
    qboxEl.replaceChildren();
    const picks = q.questions.map(() => new Set()); // 每问已选项
    const inputs = [];
    const el = (tag, cls, text) => {
      const n = document.createElement(tag);
      n.className = cls;
      if (text) n.textContent = text;
      qboxEl.append(n);
      return n;
    };
    q.questions.forEach((item, i) => {
      if (item.header) el("div", "qh", item.header);
      el("div", "qt", item.question);
      if (item.options?.length) {
        for (const label of item.options) {
          const b = el("button", "qopt", label);
          b.addEventListener("click", () => {
            if (item.multiSelect)
              picks[i].has(label) ? picks[i].delete(label) : picks[i].add(label);
            else {
              picks[i].clear();
              picks[i].add(label);
            }
            refreshHighlight();
          });
        }
      } else {
        inputs[i] = el("input", "qin");
        inputs[i].placeholder = "自定义回答";
      }
    });
    const sub = el("button", "qsub", "提交回答");
    sub.addEventListener("click", async () => {
      const answers = q.questions.map((item, i) => ({
        id: item.id,
        selected: [...picks[i]],
        ...(inputs[i]?.value.trim() ? { custom: inputs[i].value.trim() } : {}),
      }));
      const bad = answers.findIndex((a) => !a.selected.length && !a.custom);
      if (bad >= 0) {
        setStatus(`第 ${bad + 1} 问尚未作答`);
        return;
      }
      sub.disabled = true;
      try {
        await api(`/task/${activeTaskId}/answer`, {
          method: "POST",
          body: JSON.stringify({ callId: q.callId, answers }),
        });
        // 回答气泡由 relay answerRoute 以 user 事件下发（会唤醒挂起的 poll），本地不再 addStep 防重复
        hideQuestion();
      } catch (e) {
        setStatus(`回答失败：${e.message}`);
        sub.disabled = false;
      }
    });
    qboxEl.hidden = false;
    setStatus("等待回答");
    function refreshHighlight() {
      // 按渲染顺序重刷所有选项按钮高亮（与 picks 对齐）
      const btns = [...qboxEl.querySelectorAll(".qopt")];
      let bi = 0;
      q.questions.forEach((item, i) => {
        if (!item.options?.length) return;
        for (const label of item.options) btns[bi++]?.classList.toggle("on", picks[i].has(label));
      });
    }
  }

  // ---------- DSH 权限审批卡：越权请求（如写工作区外文件）原本只在 DSH web UI 弹，这里面板内直接批 ----------
  let approvalKey = "";
  function hideApproval() {
    approvalKey = "";
    if (qboxEl.dataset.ap === "1") {
      qboxEl.hidden = true;
      qboxEl.replaceChildren();
      delete qboxEl.dataset.ap;
    }
  }
  function showApproval(a) {
    const key = `${a.toolName}|${a.reason}`;
    if (approvalKey === key && qboxEl.dataset.ap === "1") return; // 同一审批已渲染（poll 幂等）
    approvalKey = key;
    hideQuestion(); // 审批与提问互斥（agent 阻塞在审批上不可能同时提问）
    qboxEl.dataset.ap = "1";
    qboxEl.replaceChildren();
    const el = (tag, cls, text) => {
      const n = document.createElement(tag);
      n.className = cls;
      if (text) n.textContent = text;
      qboxEl.append(n);
      return n;
    };
    el("div", "qh", "等待审批（可能越权，请确认）");
    el("div", "qt", a.reason || `工具 ${a.toolName} 请求越权执行`);
    const row = el("div", "");
    row.style.cssText = "display:flex;gap:8px;margin-top:2px";
    const reject = document.createElement("button");
    reject.className = "qopt";
    reject.textContent = "拒绝";
    const allow = document.createElement("button");
    allow.className = "qopt";
    allow.textContent = "允许一次";
    allow.style.cssText = "background:#1a1a1a;color:#fff;border-color:#1a1a1a";
    row.append(reject, allow);
    const answer = async (outcome) => {
      reject.disabled = allow.disabled = true;
      try {
        await api(`/task/${activeTaskId}/approval`, {
          method: "POST",
          body: JSON.stringify({ outcome }),
        });
        // 决定气泡由 relay approvalRoute 以 user 事件下发，本地不重复画
        hideApproval();
      } catch (e) {
        setStatus(`审批提交失败：${e.message}`);
        reject.disabled = allow.disabled = false;
      }
    };
    reject.addEventListener("click", () => answer("rejected"));
    allow.addEventListener("click", () => answer("allowed-once"));
    qboxEl.hidden = false;
  }

  async function stop() {
    if (!activeTaskId) return;
    const taskId = activeTaskId;
    cancelRequested = true; // 立即生效：中断 batch 每步循环、跳过后续命令
    setStatus("正在停止…");
    // 兜底先行：无论 /task/cancel 是否及时返回，3s 内强制恢复输入态（正常时 poll 会更快带回）
    setTimeout(() => {
      if (activeTaskId === taskId && !stopBtn.hidden) {
        setRunning(false);
        clearHighlights(); // 兜底：poll 迟迟带不回空闲态时也把索引标注清掉
        setStatus(chatMode ? "已停止（会话保持）" : "已停止");
      }
    }, 3000);
    try {
      await api("/task/cancel", { method: "POST", body: JSON.stringify({ taskId }) });
    } catch (e) {
      setStatus(`停止失败：${e.message}`);
    }
  }

  runBtn.addEventListener("click", run);
  stopBtn.addEventListener("click", stop);
  $(".newchat").addEventListener("click", newChat);
  $(".settings").addEventListener("click", async () => {
    if (isExt) {
      chrome.runtime.sendMessage({ type: "open-options" });
      return;
    }
    if (setboxEl.classList.contains("show")) {
      setboxEl.classList.remove("show"); // 抽屉开合同会话列表：加/去 show
      return;
    }
    sessboxEl.classList.remove("show"); // 与会话抽屉互斥（同一停靠位）
    const cfg = await readCfg();
    const esc = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
    setboxEl.querySelector(".slist").innerHTML = `
      <label>Relay 地址</label><input class="s-url" value="${esc(cfg.baseURL)}"${isExt ? "" : " disabled"}>
      <label>Relay Token</label><input class="s-token" value="${esc(cfg.apiKey)}"${isExt ? "" : " disabled"}>
      <label>工作区（DSH 会话按此目录归组，留空不分组）</label><input class="s-ws" value="${esc(cfg.workspace)}" placeholder="/绝对路径/到/工作区"${isExt ? "" : " disabled"}>
      <label>智能等级</label>
      <select class="s-scope"${isExt ? "" : " disabled"}><option value="none">L1：仅问答（不触碰页面）</option><option value="page">L2：本页面读写（禁导航）</option><option value="site">L3：站内浏览（同域含子域可导航）</option><option value="dsh">L4：页面+DSH 工具（默认）</option>${isExt ? '<option value="all">L5：DSH 全量+浏览器全量</option>' : ""}</select>
      <label>特效（会话级，随会话保存切换；未设置时回落页面全局）</label>
      <select class="s-fx"><option value="">未设置（回落全局）</option><option value="1">开（模拟光标 + 操作特效）</option><option value="0">关（静默执行）</option></select>
      <label>本会话 prompt（随会话保存切换，与页面全局 prompt 拼接后随任务下发）</label><textarea class="s-prompt" placeholder="当前会话的专属要求，如输出格式、固定流程">${esc(sessPrompt)}</textarea>
      ${
        isExt
          ? `<div class="row2"><button class="save">保存</button><button class="clear">清除本机覆盖</button></div>`
          : `<div class="diag">页面版配置由 script 标签 data-* 固定，修改需更新引入处标签</div>`
      }
      <div class="diag">面板 v${esc(PANEL_VERSION)} · 渲染核心${
        coreApi ? "已加载（DSH 管线）" : corePromise ? "加载中…" : "未加载（降级 marked 轻量渲染）"
      }</div>
      <div class="diag">备胎渲染统计（评估移除 marked 用）：${(() => {
        const st = readLegacyStat();
        return st.count
          ? `已触发 ${st.count} 次，最近「${esc(st.lastReason)}」@ ${esc(st.lastAt)}`
          : "从未触发";
      })()}</div>`;
    const scopeEl = setboxEl.querySelector(".s-scope");
    if (scopeEl) scopeEl.value = cfg.aiLevel;
    const fxEl = setboxEl.querySelector(".s-fx");
    if (fxEl) fxEl.value = sessFx;
    // 会话级配置：prompt/特效输入即存（change 失焦触发），随会话保存切换；页面版同样可编辑
    setboxEl.querySelector(".s-prompt").addEventListener("change", (e) => {
      setSessPrompt(e.target.value);
      setStatus("本会话 prompt 已更新");
    });
    fxEl.addEventListener("change", (e) => {
      setSessFx(e.target.value);
      setStatus(e.target.value === "" ? "特效回落页面全局配置" : "本会话特效已更新");
    });
    setboxEl.style.width = panel.getBoundingClientRect().width + "px"; // 宽度对齐面板（同会话抽屉）
    setboxEl.classList.add("show"); // 右侧抽屉滑入
    if (!isExt) return; // 页面版只读展示，无保存/清除
    // 保存即写配置覆盖（扩展=chrome.storage，readCfg 每次请求现读，下个任务即生效）；留空 = 移除该项覆盖
    setboxEl.querySelector(".save").addEventListener("click", async () => {
      const v = (sel) => setboxEl.querySelector(sel).value.trim();
      await cfgSave({
        baseURL: v(".s-url"),
        token: v(".s-token"),
        workspace: v(".s-ws"),
        aiLevel: v(".s-scope"), // 特效已会话级，不进全局覆盖
      });
      setboxEl.classList.remove("show");
      setStatus("已保存");
    });
    // 清除全部本机覆盖，回落 zip 注入值 / mountPanel(init) / 默认值
    setboxEl.querySelector(".clear").addEventListener("click", async () => {
      await cfgClear();
      setboxEl.classList.remove("show");
      setStatus("已清除");
    });
  });
  setboxEl.querySelector(".sback").addEventListener("click", () => setboxEl.classList.remove("show"));
  function autoGrow() {
    inputEl.style.height = "auto";
    inputEl.style.height = `${Math.min(inputEl.scrollHeight, 120)}px`;
  }
  // 输入 / 实时弹命令菜单（对齐官方交互），其他内容收起
  inputEl.addEventListener("input", () => {
    autoGrow();
    if (inputEl.value === "/") showCommandMenu();
    else closeMenu();
  });
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      run();
    }
  });

  // 面板几何：吸顶右侧全高（上下各回 8px），仅宽度可拖拽记忆（左下手柄往左拖变宽，最小 380px），localStorage
  const GEO_KEY = "dshAiPanelGeo";
  const MIN_W = 380;
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const geo = (() => {
    try { return JSON.parse(localStorage.getItem(GEO_KEY)) || {}; } catch { return {}; }
  })();
  if (geo.w) panel.style.width = clamp(Number(geo.w) || MIN_W, MIN_W, window.innerWidth - MIN_W) + "px";
  const saveGeo = () => {
    const r = panel.getBoundingClientRect();
    try {
      localStorage.setItem(GEO_KEY, JSON.stringify({ w: Math.round(r.width) }));
    } catch {}
  };
  const startDrag = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const w0 = panel.getBoundingClientRect().width, x0 = e.clientX;
    const maxW = () => window.innerWidth - MIN_W; // 至少给页面留 380px
    const onMove = (ev) => {
      panel.classList.add("dragging");
      // 左下手柄：往左拖变宽，面板锚定右上角、高度固定不动
      panel.style.width = clamp(w0 + (x0 - ev.clientX), MIN_W, maxW()) + "px";
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("mouseup", onUp, true);
      setTimeout(() => panel.classList.remove("dragging"), 0);
      saveGeo();
    };
    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("mouseup", onUp, true);
  };
  $(".grip").addEventListener("mousedown", startDrag);

  const tab = $(".tab");
  // 停靠标签：默认右下角，可上下拖动（范围限制在页面内），位置 localStorage 记忆；拖动后松手不触发展开
  const TAB_Y_KEY = "dshAiTabY";
  const tabClamp = (top, h) => clamp(top, 0, window.innerHeight - h);
  try {
    const y = parseFloat(localStorage.getItem(TAB_Y_KEY)); // null→NaN，恰好跳过无记忆场景
    if (Number.isFinite(y)) tab.style.top = tabClamp(y, 22) + "px"; // 有记忆值：从 bottom 定位切换为 top 定位
  } catch {}
  let tabDragged = false;
  tab.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const r = tab.getBoundingClientRect();
    const y0 = e.clientY, top0 = r.top;
    let moved = false;
    const onMove = (ev) => {
      if (Math.abs(ev.clientY - y0) > 3) moved = true;
      tab.style.top = tabClamp(top0 + (ev.clientY - y0), r.height) + "px";
      tab.style.bottom = "auto";
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("mouseup", onUp, true);
      if (moved) {
        tabDragged = true; // click 在 mouseup 后触发：刚拖动完这几次点击不当成展开
        try { localStorage.setItem(TAB_Y_KEY, String(Math.round(parseFloat(tab.style.top)))); } catch {}
      }
    };
    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("mouseup", onUp, true);
  });
  window.addEventListener("resize", () => {
    // 窗口变矮后把标签拉回页面内
    if (tab.style.top) tab.style.top = tabClamp(parseFloat(tab.style.top), 22) + "px";
  });
  tab.addEventListener("click", () => {
    if (tabDragged) {
      tabDragged = false;
      return;
    }
    tab.hidden = true;
    panel.hidden = false;
    // 最小化期间渲染的内容当时因 display:none 跳过了可见性校验，展开后补查一次
    for (const d of stepsEl.querySelectorAll(".step.md")) verifyVisible(d, "recheck");
    inputEl.focus();
  });
  $(".collapse").addEventListener("click", () => {
    panel.hidden = true;
    tab.hidden = false;
  });
  // 扩展版：工具栏图标点击 toggle 侧栏（展开↔收起为顶部标签）；页面版标签即唯一切换入口
  if (isExt) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type === "toggle-panel") {
        const show = panel.hidden;
        panel.hidden = !show;
        tab.hidden = show;
        if (show) inputEl.focus();
      }
    });
  }

  // 页面刷新后恢复任务监听
  const savedTask = Number(sessionStorage.getItem("dshAiTask")) || 0;
  if (savedTask) {
    activeTaskId = savedTask;
    setRunning(true);
    setDialogHook("on");
    setStatus("正在恢复任务监听…");
    pollLoop(savedTask);
  } else {
    setStatus("空闲");
  }
} // mountPanel
