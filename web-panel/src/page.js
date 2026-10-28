// 页面版入口（esbuild --define:IS_EXT=false --global-name=DshAssistant → panel/dsh-assistant.min.js）
// dialog-hook 先于业务代码执行，尽早接管原生弹窗
import "../../extension/content/dialog-hook.js";
import { mountPanel } from "./loader.js";
export { mountPanel };

// <script src="…/dsh-assistant.min.js" data-token="…" data-base-url="…" data-workspace="…" data-prompt="…"> 属性自动挂载（无属性则由宿主手动调 mountPanel）
const tag = document.currentScript;
if (tag && (tag.dataset.token || tag.dataset.baseUrl || tag.dataset.workspace || tag.dataset.prompt)) {
  const init = {};
  if (tag.dataset.token) init.apiKey = tag.dataset.token;
  if (tag.dataset.baseUrl) init.baseURL = tag.dataset.baseUrl;
  if (tag.dataset.workspace) init.workspace = tag.dataset.workspace;
  if (tag.dataset.prompt) init.customPrompt = tag.dataset.prompt;
  mountPanel(init);
}
