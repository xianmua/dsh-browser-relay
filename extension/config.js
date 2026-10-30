// 共享默认配置（manifest 中先于 loader.js 加载）；baseURL 为 relay 根地址
// 注意必须挂到 globalThis：loader.js 经 globalThis.DEFAULTS 读 zip 注入值，顶层 const 不进全局对象
globalThis.DEFAULTS = {
  baseURL: "http://127.0.0.1:9916",
  apiKey: "", // relay token，由 zip 下载时注入，勿提交到 git
  customPrompt: "", // 用户个性化要求，随任务发给 DSH agent（默认行为规则已内置于 relay prompt，此处只放用户自定义）
  aiLevel: "dsh", // 智能等级：L1 仅问答 / L2 本页面读写 / L3 站内（同域含子域）/ L4 页面+DSH 工具 / L5 全量，设置页可改
  showFx: false, // 模拟光标+操作特效独立开关（默认关，与档位解绑；开启且档位≠L1 才显示）
  workspace: "", // 工作区：DSH 会话按此目录归组（填绝对路径，留空不分组），设置页可改
};
