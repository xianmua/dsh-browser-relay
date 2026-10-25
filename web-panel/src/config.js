// 共享默认配置（npm 版：不再经 manifest/zip 注入，由宿主 mountPanel(init) 传入或本文件默认值）；baseURL 为 relay 根地址
export const DEFAULTS = {
  baseURL: "http://127.0.0.1:9916",
  apiKey: "", // relay token，由宿主 mountPanel(init) 传入或 localStorage 覆盖，勿提交到 git
  customPrompt: "", // 用户个性化要求，随任务发给 DSH agent（默认行为规则已内置于 relay prompt，此处只放用户自定义）
  toolScope: "browser", // 工具范围：browser=仅页面操作工具；all=开放 DSH 其他插件工具（如接口取数）
};
