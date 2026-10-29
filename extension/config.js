// 共享默认配置（manifest 中先于 loader.js 加载）；baseURL 为 relay 根地址
// 注意必须挂到 globalThis：loader.js 经 globalThis.DEFAULTS 读 zip 注入值，顶层 const 不进全局对象
globalThis.DEFAULTS = {
  baseURL: "http://127.0.0.1:9916",
  apiKey: "", // relay token，由 zip 下载时注入，勿提交到 git
  customPrompt: "", // 用户个性化要求，随任务发给 DSH agent（默认行为规则已内置于 relay prompt，此处只放用户自定义）
  aiLevel: "browser", // 智能等级：L1 仅问答 / L2 只读 / L3 页面操作·静默 / L4 AI操作演示（特效）/ L5 全量，设置页可改
  workspace: "", // 工作区：DSH 会话按此目录归组（填绝对路径，留空不分组），设置页可改
};
