// 运行环境适配层：单一源码同时服务扩展版与页面版（esbuild --define:IS_EXT 折叠 import 分支）
// isExt 运行时探测：扩展 content script 中 chrome.runtime.id 存在；页面上下文 chrome.runtime 为 undefined

export const isExt = typeof chrome !== "undefined" && !!chrome.runtime?.id;

// 配置覆盖读取：扩展用 chrome.storage（baseURLOverride/tokenOverride 与 options 设置页共用同一组 key，
// customPrompt/aiLevel 直接存值）；页面版不用本机覆盖——script 标签 data-* 即唯一配置源，改配置改标签
export async function cfgOverrides() {
  if (isExt) {
    const st = await chrome.storage.local.get({
      baseURLOverride: "",
      tokenOverride: "",
      customPrompt: "",
      aiLevel: "",
      showFx: false,
      workspace: "",
    });
    return {
      baseURL: String(st.baseURLOverride ?? "").trim(),
      token: String(st.tokenOverride ?? "").trim(),
      customPrompt: st.customPrompt || "",
      aiLevel: st.aiLevel || "",
      showFx: st.showFx === true,
      workspace: st.workspace || "",
    };
  }
  return { baseURL: "", token: "", customPrompt: "", aiLevel: "", showFx: false, workspace: "" };
}

// 配置覆盖写入（设置弹层保存）：仅扩展版生效；页面版配置由 script 标签固定，写入是空操作
export async function cfgSave({ baseURL, token, aiLevel, customPrompt, showFx, workspace }) {
  if (!isExt) return;
  const put = {};
    if (baseURL) put.baseURLOverride = baseURL;
    if (token) put.tokenOverride = token;
    if (aiLevel) put.aiLevel = aiLevel;
    if (customPrompt) put.customPrompt = customPrompt;
    put.showFx = showFx === true;
    if (workspace) put.workspace = workspace;
    await chrome.storage.local.set(put);
}

// 清除全部配置覆盖，回落 zip 注入值 / mountPanel(init) / 默认值；页面版本无覆盖层，空操作
export async function cfgClear() {
  if (!isExt) return;
  await chrome.storage.local.remove([
    "baseURLOverride",
    "tokenOverride",
    "customPrompt",
    "aiLevel",
    "showFx",
    "workspace",
  ]);
}