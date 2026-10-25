// 运行环境适配层：单一源码同时服务扩展版与页面版（esbuild --define:IS_EXT 折叠 import 分支）
// isExt 运行时探测：扩展 content script 中 chrome.runtime.id 存在；页面上下文 chrome.runtime 为 undefined

export const isExt = typeof chrome !== "undefined" && !!chrome.runtime?.id;

// 配置覆盖读取：扩展用 chrome.storage（baseURLOverride/tokenOverride 与 options 设置页共用同一组 key，
// customPrompt/toolScope 直接存值）；页面版用 localStorage dshAssistant.*
export async function cfgOverrides() {
  if (isExt) {
    const st = await chrome.storage.local.get({
      baseURLOverride: "",
      tokenOverride: "",
      customPrompt: "",
      toolScope: "",
    });
    return {
      baseURL: String(st.baseURLOverride ?? "").trim(),
      token: String(st.tokenOverride ?? "").trim(),
      customPrompt: st.customPrompt || "",
      toolScope: st.toolScope || "",
    };
  }
  const ls = (k) => localStorage.getItem(`dshAssistant.${k}`) ?? "";
  return {
    baseURL: ls("baseURL"),
    token: ls("token"),
    customPrompt: ls("customPrompt"),
    toolScope: ls("toolScope"),
  };
}

// 配置覆盖写入（设置弹层保存）：留空值 = 移除覆盖
export async function cfgSave({ baseURL, token, toolScope, customPrompt }) {
  if (isExt) {
    const put = {};
    if (baseURL) put.baseURLOverride = baseURL;
    if (token) put.tokenOverride = token;
    if (toolScope) put.toolScope = toolScope;
    if (customPrompt) put.customPrompt = customPrompt;
    await chrome.storage.local.set(put);
    return;
  }
  const put = (k, v) =>
    v ? localStorage.setItem(`dshAssistant.${k}`, v) : localStorage.removeItem(`dshAssistant.${k}`);
  put("baseURL", baseURL);
  put("token", token);
  put("toolScope", toolScope);
  put("customPrompt", customPrompt);
}

// 清除全部配置覆盖，回落 zip 注入值 / mountPanel(init) / 默认值
export async function cfgClear() {
  if (isExt) {
    await chrome.storage.local.remove([
      "baseURLOverride",
      "tokenOverride",
      "customPrompt",
      "toolScope",
    ]);
    return;
  }
  for (const k of ["baseURL", "token", "toolScope", "customPrompt"])
    localStorage.removeItem(`dshAssistant.${k}`);
}