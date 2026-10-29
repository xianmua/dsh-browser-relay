// 共享默认配置（npm 版：不再经 manifest/zip 注入，由宿主 mountPanel(init) 传入或本文件默认值）；baseURL 为 relay 根地址
export const DEFAULTS = {
  baseURL: "http://127.0.0.1:9916",
  apiKey: "", // relay token，由宿主 mountPanel(init) 传入或 localStorage 覆盖，勿提交到 git
  customPrompt: "", // 用户个性化要求，随任务发给 DSH agent（默认行为规则已内置于 relay prompt，此处只放用户自定义）
  aiLevel: "browser", // 智能等级 L1 仅问答 / L2 只读 / L3 页面操作·静默 / L4 AI操作演示（特效）/ L5 全量；特效随档位走（L4 开，其余静默）
  workspace: "", // 工作区：DSH 会话按此目录归组（填绝对路径，留空不分组）
};
