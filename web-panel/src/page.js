// 页面版入口（esbuild --define:IS_EXT=false --global-name=DshAssistant → panel/dsh-assistant.min.js）
// dialog-hook 先于业务代码执行，尽早接管原生弹窗
import "../../extension/content/dialog-hook.js";
import { mountPanel } from "./loader.js";
export { mountPanel };

// <script src="…/dsh-assistant.min.js" data-token="…" data-base-url="…" data-workspace="…" data-prompt="…" data-ai-level="…"> 属性自动挂载（无属性则由宿主手动调 mountPanel）
const tag = document.currentScript;
if (tag && (tag.dataset.token || tag.dataset.baseUrl || tag.dataset.workspace || tag.dataset.prompt || tag.dataset.aiLevel)) {
  const init = {};
  if (tag.dataset.token) init.apiKey = tag.dataset.token;
  if (tag.dataset.baseUrl) init.baseURL = tag.dataset.baseUrl;
  if (tag.dataset.workspace) init.workspace = tag.dataset.workspace;
  if (tag.dataset.prompt) init.customPrompt = tag.dataset.prompt;
  // 智能等级：none/read/browser/browserFx/all（也接受 L1-L5 或大小写随意的档位写法）
  const scope = (tag.dataset.aiLevel || "").trim().toLowerCase();
  const scopeVal = { l1: "none", l2: "read", l3: "browser", l4: "browserFx", l5: "all", browserfx: "browserFx" }[scope] ?? scope;
  if (["none", "read", "browser", "browserFx", "all"].includes(scopeVal)) init.aiLevel = scopeVal;
  if (Object.keys(init).length) mountPanel(init);
}
