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
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.type = "module";
      s.src = `${relayBase}/dsh-md-core.js`;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`core 加载失败：${s.src}`));
      document.head.appendChild(s);
    });
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
      /* 最小化态：页面右上角（距右边 100px）的浅灰停靠条，点向下箭头展开右侧栏 */
      .tab {
        position: fixed; top: 0; right: 100px; width: 76px; height: 22px; z-index: 2147483646;
        background: #f0f0f0; color: #888; border: 1px solid #e2e2e2; border-top: none;
        border-radius: 0 0 8px 8px;
        display: flex; align-items: center; justify-content: center; cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,.18); transition: background .15s ease, box-shadow .15s ease;
      }
      .tab:hover { background: #e4e4e4; color: #555; box-shadow: 0 6px 16px rgba(0,0,0,.24); }
      .tab svg { width: 12px; height: 12px; }
      .panel {
        position: fixed; top: 0; right: 0; height: 700px; width: 380px;
        background: #fff; border-left: 1px solid rgba(0,0,0,.08);
        box-shadow: -8px 0 24px rgba(0,0,0,.12); z-index: 2147483647;
        display: flex; flex-direction: column; font-size: 14px; color: #333; overflow: hidden;
        animation: drop .2s ease-out;
      }
      .panel.dragging { animation: none; user-select: none; }
      /* 左下角缩放手柄：面板锚定右上角，往左拖变宽、往下拖变高（最小 380×400） */
      .grip {
        position: absolute; bottom: 0; left: 0; width: 18px; height: 18px; z-index: 5;
        cursor: nesw-resize; touch-action: none; border-radius: 0 0 0 12px;
        background: repeating-linear-gradient(135deg, transparent 0 4px, #d4d4d4 4px 6px);
      }
      .grip:hover { background: repeating-linear-gradient(135deg, transparent 0 4px, #a8a8a8 4px 6px); }
      @keyframes drop {
        from { opacity: 0; transform: translateY(-48px); }
        to { opacity: 1; transform: none; }
      }
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
      .status-line { padding: 9px 16px; font-size: 13px; color: #888; border-bottom: 1px solid #f5f5f5; min-height: 36px; }
      .steps {
        flex: 1; min-height: 0; overflow-y: auto; padding: 8px 16px 12px;
        color: #555; font-size: 13px; line-height: 1.9; white-space: pre-wrap; word-break: break-all;
      }
      .steps::-webkit-scrollbar { width: 4px; }
      .steps::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
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
        position: absolute; inset: 0; z-index: 30; background: #fff;
        display: flex; flex-direction: column;
        transform: translateX(-100%); visibility: hidden;
        transition: transform .22s cubic-bezier(.22,1,.36,1), visibility .22s;
      }
      .sessbox.show { transform: translateX(0); visibility: visible; }
      .sessbox .shead { display: flex; align-items: center; gap: 6px; padding: 10px 14px; border-bottom: 1px solid #f0f0f0; font-size: 13px; font-weight: 600; color: #444; }
      .sessbox .sback { width: 24px; height: 24px; border: none; background: none; cursor: pointer; color: #999; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; padding: 0; font-size: 16px; line-height: 1; }
      .sessbox .sback:hover { color: #333; background: #f0f0f0; }
      .sessbox .slist { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 8px; }
      .sessbox .slist::-webkit-scrollbar { width: 4px; }
      .sessbox .slist::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
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
      .step.err {
        color: #c5221f; background: #fdf0ef; border-radius: 6px;
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
      details.think .think-body::-webkit-scrollbar { width: 4px; }
      details.think .think-body::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
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
        font-size: 14px; outline: none; background: #fff; transition: border-color .15s;
        resize: none; font-family: inherit; line-height: 1.5; min-height: 40px; max-height: 120px; overflow-y: auto;
        scrollbar-width: none;
      }
      .input-row textarea::-webkit-scrollbar { display: none; }
      .input-row textarea:focus { border-color: #1a1a1a; }
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
      .qbox { border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; padding: 8px 16px 10px; font-size: 13px; max-height: 40%; overflow-y: auto; }
      .cbox { border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; padding: 8px 16px 10px; font-size: 13px; }
      .cbox .ct { margin: 2px 0 8px; }
      .qbox .qh { color: #999; font-size: 12px; margin: 4px 0 2px; }
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
      .setbox { border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; padding: 8px 16px 10px; font-size: 13px; }
      .setbox label { display: block; color: #999; font-size: 12px; margin: 6px 0 2px; }
      .setbox input, .setbox select, .setbox textarea { width: 100%; box-sizing: border-box; padding: 5px 8px; font-size: 13px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; }
      .setbox textarea { resize: vertical; min-height: 56px; }
      .setbox .row2 { display: flex; gap: 8px; margin-top: 8px; }
      .setbox .row2 button { flex: 1; padding: 6px 0; font-size: 13px; border-radius: 6px; cursor: pointer; }
      .setbox .save { border: none; background: #1a1a1a; color: #fff; }
      .setbox .clear { border: 1px solid #ddd; background: #fff; color: #666; }
      .setbox .diag { margin-top: 8px; color: #bbb; font-size: 11px; }
    </style>
    <div class="tab" title="展开 AI 助手"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div>
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
      <div class="qbox" hidden></div>
      <div class="cbox" hidden></div>
      <div class="setbox" hidden></div>
      <div class="steps"></div>
      <div class="menu" hidden></div>
      <div class="sessbox">
        <div class="shead"><button class="sback" title="返回">‹</button><span>历史会话</span></div>
        <div class="slist"></div>
      </div>
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
  // markdown 渲染：marked + DOMPurify（README 级：表格/嵌套列表/引用块等）；链接强制新标签打开
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener");
    }
  });
  function renderMd(src) {
    return DOMPurify.sanitize(marked.parse(String(src), { breaks: true, gfm: true }), {
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
    // 用户输入：右侧深色气泡（轻量混排，其余事件仍是日志行）
    const el = document.createElement("div");
    el.className = "step me";
    el.textContent = text;
    stepsEl.appendChild(el);
    stepsEl.scrollTop = stepsEl.scrollHeight;
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
        stepsEl.appendChild(det);
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
    div.className = isError ? "step err" : md ? "step md" : "step";
    // 先入列再渲染：async 函数首个 await 前同步执行，若先调 renderMdCore，
    // core 已预加载时会同步跑完 isConnected 检查（此时 div 还没挂进文档，恒为离场）直接跳过渲染
    stepsEl.appendChild(div);
    if (md) {
      // 首选：DSH 原版渲染核心（按需加载 core 产物）；失败/不可用降级 marked 轻量管线
      renderMdCore(div, text)
        .catch((e) => {
          // 渲染流程自身异常（理论上内部已兜底，此处防漏网之鱼静默丢内容）
          console.warn("[dsh-assistant] 渲染流程异常，降级 marked：", e);
          if (div.isConnected && !div.textContent.trim()) renderMdLegacy(div, text);
        })
        .finally(() => rewriteLocalImgs(div).catch(() => {}));
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
          renderMdLegacy(div, text);
          appendRenderNote(div, "渲染核心未产出内容，已降级轻量渲染");
        } else {
          // 内容出现过又消失（React 迟到崩溃/卸载）：半秒后复查补绘
          await new Promise((r) => setTimeout(r, 500));
          if (div.isConnected && !div.textContent.trim()) {
            console.warn("[dsh-assistant] 渲染核心内容事后丢失，降级重绘。诊断：", {
              children: div.children.length,
              htmlLen: div.innerHTML.length,
            });
            renderMdLegacy(div, text);
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
    renderMdLegacy(div, text);
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
  // 工作区返回文件）；加载失败再兜一层占位，避免碎图标
  async function rewriteLocalImgs(div) {
    if (!activeTaskId || !div.isConnected) return;
    const cfg = await readCfg();
    const base = String(cfg.baseURL ?? "").replace(/\/+$/, "");
    for (const img of div.querySelectorAll("img")) {
      const src = img.getAttribute("src") ?? "";
      if (!src || /^(https?:|data:|blob:)/i.test(src)) continue;
      if (img.dataset.localRewritten) continue;
      img.dataset.localRewritten = "1";
      img.src = `${base}/file?taskId=${activeTaskId}&p=${encodeURIComponent(src)}&token=${encodeURIComponent(cfg.apiKey)}`;
      img.onerror = () => {
        img.onerror = null;
        if (!img.isConnected) return;
        const tip = document.createElement("div");
        tip.className = "img-fallback";
        tip.textContent = `⚠ 图片加载失败：${img.getAttribute("alt") || src}`;
        img.replaceWith(tip);
      };
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

  // 对齐 DSH web UI：回合结束后把过程步骤（执行/等待/思考）收进可折叠条，突出最终回复
  function collapseProcess() {
    const items = [...stepsEl.children].filter(
      (el) =>
        (el.classList.contains("step") &&
          !el.classList.contains("md") &&
          !el.classList.contains("me") &&
          !el.classList.contains("err")) ||
        el.classList.contains("think"),
    );
    if (items.length < 2) return; // 过程太短不折
    const det = document.createElement("details");
    det.className = "proc-box";
    const sum = document.createElement("summary");
    sum.textContent = `执行过程（${items.length} 步）`;
    const body = document.createElement("div");
    body.className = "proc-body";
    det.append(sum, body);
    stepsEl.insertBefore(det, items[0]);
    for (const el of items) body.appendChild(el);
  }

  // marked 轻量渲染（DSH 管线失败时的 fallback）
  function renderMdLegacy(div, text) {
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
    // 旧档位名迁移：read/browser/browserFx→page；页面版封顶 L4（all→dsh）
    cfg.aiLevel =
      { read: "page", browser: "page", browserFx: "page" }[o.aiLevel] || o.aiLevel || cfg.aiLevel;
    if (!isExt && cfg.aiLevel === "all") cfg.aiLevel = "dsh";
    cfg.showFx = o.showFx === true || cfg.showFx === true;
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
        authorization: `Bearer ${cfg.apiKey}`,
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
  // 下拉点选同样过删除确认（行操作菜单「删除」项可经 browser_select 触达）；返回拒绝结果或 null
  async function confirmOptionClick(el) {
    if (el && isDeleteClick(el) && !(await askDeleteConfirm(el)))
      return {
        ok: false,
        message: "用户拒绝了该删除操作，禁止重试；如确需删除请先向用户说明理由",
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

  // 删除类点击二次确认：命中删除语义的元素先在面板弹确认卡，用户点「确认删除」才执行
  const DELETE_RE = /删除|移除|清空|销毁|delete|remove/i;
  function isDeleteClick(el) {
    if (!el) return false;
    const attrs = ["title", "aria-label", "class", "data-action"]
      .map((a) => el.getAttribute(a) || "")
      .join(" ");
    return DELETE_RE.test(`${el.textContent || ""} ${attrs}`);
  }
  function askDeleteConfirm(el) {
    return new Promise((resolve) => {
      const label = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 50) || "(无文本)";
      const tip = document.createElement("div");
      tip.className = "ct";
      tip.textContent = `即将点击删除类操作「${label}」，确认执行？`;
      const ok = document.createElement("button");
      ok.className = "qsub";
      ok.textContent = "确认删除";
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
      setStatus("等待删除确认");
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
        // 同域含子域校验（L3/L4）：站点键 = hostname 末两段（IP 与单段主机名原样）
        const siteKey = (h) => {
          h = String(h ?? "").toLowerCase();
          return /^\d+\.\d+\.\d+\.\d+$/.test(h) || !h.includes(".")
            ? h
            : h.split(".").slice(-2).join(".");
        };
        if (siteKey(target.hostname) !== siteKey(location.hostname))
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
              ? "已自动取消（删除护栏不放行）"
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
  }
  function finishTask(d) {
    const tid = activeTaskId; // resetTask 会清零，先留作反馈归属
    resetTask();
    const label = d.status === "done" ? "完成" : d.status === "cancelled" ? "已停止" : "失败";
    setStatus(d.statusText || label); // 状态栏只放状态词
    addStep(d.statusText || label, d.status !== "done");
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
      addStep(`${desc}失败：${e.message}`, true);
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
  const SESS_KEY = "dshAiSessions"; // [{sessionId, taskId, title, ts}]，taskId 可能因 relay 重启重挂后变化
  const SESS_CAP = 30;
  function loadSessionList() {
    try {
      const list = JSON.parse(localStorage.getItem(SESS_KEY));
      return Array.isArray(list) ? list.filter((s) => s?.sessionId) : [];
    } catch {
      return [];
    }
  }
  function saveSessionEntry(entry) {
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
      title.textContent = entry.title || "(无标题)";
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
    sessboxEl.classList.add("show"); // 全面板覆盖层：从左滑出盖住内容区
  }
  // 切换到历史会话：拉取历史回放（relay 会按 sessionId 重挂被清理的记录），此后与 live 会话无异（可续聊/可操作页面）
  async function loadSession(entry) {
    if (inputEl.disabled) {
      setStatus("请等当前回合结束（或先点停止）");
      return;
    }
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
      sessionStorage.setItem("dshAiTask", String(d.taskId));
      chatMode = true; // 历史会话一律会话模式：可继续输入
      for (const ev of d.events ?? []) {
        if (ev.user) addUserBubble(ev.text);
        else addStep(ev.text, false, ev.md);
      }
      collapseProcess(); // 历史回放的执行过程折叠（与 live 终态折叠口径一致），突出最终回复
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

  // 「+」开新会话：断开当前任务绑定（终止轮询），下一条输入新建任务会话；旧会话仍可在 DSH web UI 回看
  function newChat() {
    if (inputEl.disabled) {
      setStatus("请等当前回合结束（或先点停止）");
      return;
    }
    pollGen++; // 旧轮询循环检测到代际变化自行退出
    resetTask();
    if (coreApi) for (const el of stepsEl.children) coreApi.unmountDshRd(el); // 卸载 DSH 渲染的 React root
    stepsEl.replaceChildren();
    addStep("已开新会话：下一条输入将新建任务（旧会话可在 DSH web UI 回看）");
    setStatus("空闲（输入即新任务）");
  }

  let pollGen = 0; // 轮询代际：新轮询启动后旧的自行退出（防双循环重复轮询）
  async function pollLoop(taskId, startAfter = 0) {
    const myGen = ++pollGen;
    let after = startAfter;
    let wasRunning = null; // chat 模式运行态变化检测（避免每轮重复切 hook）
    let procCollapsed = false; // 本回合过程步骤是否已折叠（终态折一次，新回合重置）
    let idleMs = 800; // chat 空闲轮询间隔（无动静翻倍退避至 4s，有动静恢复 800ms）
    try {
      while (true) {
        if (myGen !== pollGen) return;
        const d = await api(
          `/task/${taskId}/poll?after=${after}&tab=${encodeURIComponent(tabKey)}`,
        );
        for (const ev of d.events ?? []) {
          if (ev.user)
            addUserBubble(ev.text); // 用户消息统一由 relay 事件回显（本地发送不重复画）
          else addStep(ev.text, false, ev.md);
          after = Math.max(after, ev.seq);
        }
        if (d.statusText) {
          setStatus(d.statusText);
          // 回合终态（已完成/已失败/任务失败/会话模式回合结束）：把本轮过程步骤收进折叠条，对齐 DSH web UI；新回合开始时重置
          const done = /已完成|已失败|任务失败|对话中（可继续输入）|对话中（上一回合异常）/.test(d.statusText);
          if (done && !procCollapsed) {
            procCollapsed = true;
            collapseProcess();
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
        if (d.question) showQuestion(d.question);
        else if (!qboxEl.hidden) hideQuestion();
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
          // 空闲退避：运行中/有新事件/命令/提问 → 保持 800ms 快轮询；持续空闲 → 800ms 翻倍至 4s 封顶，省空闲期代理流量
          idleMs =
            r || (d.events?.length ?? 0) > 0 || d.command || d.question
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
    const task = inputEl.value.trim();
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
      setStatus("已有进行中的任务，请先停止或等它结束");
      return;
    }
    if (chatMode && activeTaskId) {
      // 会话续聊：同一会话提交新回合（可追问、可继续操作页面）
      try {
        cancelRequested = false;
        setDialogHook("on");
        await api(`/task/${activeTaskId}/message`, {
          method: "POST",
          body: JSON.stringify({ text: task, tabKey }),
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
    addUserBubble(task);
    clearHighlights(); // 兜底清掉上一任务可能残留的索引标注
    turnStartMs = Date.now(); // 新任务回合起点（操作条据此显示回合耗时）
    sessionStorage.setItem("dshAiTurnStart", String(turnStartMs));
    try {
      const { customPrompt, aiLevel, workspace } = await readCfg();
      const d = await api("/task", {
        method: "POST",
        body: JSON.stringify({
          text: task,
          url: location.href,
          title: document.title,
          pageKey: pageKey(),
          customPrompt: customPrompt || "",
          aiLevel: aiLevel || "dsh",
          workspace: workspace || "",
          tabKey,
        }),
      });
      activeTaskId = d.taskId;
      sessionStorage.setItem("dshAiTask", String(d.taskId));
      saveSessionEntry({ sessionId: d.sessionId, taskId: d.taskId, title: task.slice(0, 10), ts: Date.now() });
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

  async function stop() {
    if (!activeTaskId) return;
    const taskId = activeTaskId;
    cancelRequested = true; // 立即生效：中断 batch 每步循环、跳过后续命令
    setStatus("正在停止…");
    try {
      await api("/task/cancel", { method: "POST", body: JSON.stringify({ taskId }) });
      setStatus("已请求停止…");
      // 兜底：relay 已确认停止，正常 1s 内 poll 会带回空闲态；超时未恢复则强制恢复输入
      setTimeout(() => {
        if (activeTaskId === taskId && !stopBtn.hidden) {
          setRunning(false);
          clearHighlights(); // 兜底：poll 迟迟带不回空闲态时也把索引标注清掉
          setStatus(chatMode ? "已停止（会话保持）" : "已停止");
        }
      }, 3000);
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
    if (!setboxEl.hidden) {
      setboxEl.hidden = true;
      return;
    }
    const cfg = await readCfg();
    const esc = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
    setboxEl.innerHTML = `
      <label>Relay 地址</label><input class="s-url" value="${esc(cfg.baseURL)}">
      <label>Relay Token</label><input class="s-token" value="${esc(cfg.apiKey)}">
      <label>工作区（DSH 会话按此目录归组，留空不分组）</label><input class="s-ws" value="${esc(cfg.workspace)}" placeholder="/绝对路径/到/工作区">
      <label>智能等级</label>
      <select class="s-scope"><option value="none">L1：仅问答（不触碰页面）</option><option value="page">L2：本页面读写（禁导航）</option><option value="site">L3：站内浏览（同域含子域可导航）</option><option value="dsh">L4：页面+DSH 工具（默认）</option>${isExt ? '<option value="all">L5：DSH 全量+浏览器全量</option>' : ""}</select>
      <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" class="s-fx" style="width:auto"> 显示模拟光标与操作特效</label>
      <label>自定义 prompt（随任务发给 agent）</label><textarea class="s-prompt" placeholder="对当前业务页的全局要求，如输出格式、固定流程">${esc(cfg.customPrompt)}</textarea>
      <div class="row2"><button class="save">保存</button><button class="clear">清除本机覆盖</button></div>
      <div class="diag">面板 v${esc(PANEL_VERSION)} · 渲染核心${
        coreApi ? "已加载（DSH 管线）" : corePromise ? "加载中…" : "未加载（降级 marked 轻量渲染）"
      }</div>`;
    setboxEl.querySelector(".s-scope").value = cfg.aiLevel;
    setboxEl.querySelector(".s-fx").checked = cfg.showFx === true;
    setboxEl.hidden = false;
    // 保存即写配置覆盖（扩展=chrome.storage / 页面=localStorage，readCfg 每次请求现读，下个任务即生效）；留空 = 移除该项覆盖
    setboxEl.querySelector(".save").addEventListener("click", async () => {
      const v = (sel) => setboxEl.querySelector(sel).value.trim();
      await cfgSave({
        baseURL: v(".s-url"),
        token: v(".s-token"),
        workspace: v(".s-ws"),
        aiLevel: v(".s-scope"),
        customPrompt: v(".s-prompt"),
        showFx: setboxEl.querySelector(".s-fx").checked,
      });
      setboxEl.hidden = true;
      setStatus("已保存");
    });
    // 清除全部本机覆盖，回落 zip 注入值 / mountPanel(init) / 默认值
    setboxEl.querySelector(".clear").addEventListener("click", async () => {
      await cfgClear();
      setboxEl.hidden = true;
      setStatus("已清除");
    });
  });
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

  // 面板几何：顶部右侧停靠（默认宽 380px、高 700px），宽高记忆（左下手柄拖拽调节，最小 380×400），localStorage
  const GEO_KEY = "dshAiPanelGeo";
  const MIN_W = 380, MIN_H = 400;
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const geo = (() => {
    try { return JSON.parse(localStorage.getItem(GEO_KEY)) || {}; } catch { return {}; }
  })();
  if (geo.w) panel.style.width = clamp(Number(geo.w) || MIN_W, MIN_W, window.innerWidth - MIN_W) + "px";
  if (geo.h) panel.style.height = clamp(Number(geo.h) || MIN_H, MIN_H, window.innerHeight - 8) + "px";
  const saveGeo = () => {
    const r = panel.getBoundingClientRect();
    try {
      localStorage.setItem(GEO_KEY, JSON.stringify({ w: Math.round(r.width), h: Math.round(r.height) }));
    } catch {}
  };
  const startDrag = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const r = panel.getBoundingClientRect();
    const w0 = r.width, h0 = r.height, x0 = e.clientX, y0 = e.clientY;
    const maxW = () => window.innerWidth - MIN_W; // 至少给页面留 380px
    const maxH = () => window.innerHeight - 8;
    const onMove = (ev) => {
      panel.classList.add("dragging");
      // 左下手柄：往左拖变宽、往下拖变高，面板锚定右上角不动
      panel.style.width = clamp(w0 + (x0 - ev.clientX), MIN_W, maxW()) + "px";
      panel.style.height = clamp(h0 + (ev.clientY - y0), MIN_H, maxH()) + "px";
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
  tab.addEventListener("click", () => {
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
