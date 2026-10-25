// 扩展版入口（esbuild --define:IS_EXT=true → extension/content/loader.js）
// content script（isolated world）：面板自动挂载，工具栏图标 toggle，配置经 zip 注入 config.js + chrome.storage
import { mountPanel } from "./loader.js";

mountPanel();
