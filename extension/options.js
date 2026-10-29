// 设置页：Relay 地址/Token 切换（baseURLOverride/tokenOverride，新 key 防旧版残留）+ 工作区 + 智能等级 + 自定义指令
const FIELDS = ["baseURLOverride", "tokenOverride", "workspace", "aiLevel", "customPrompt"];

// DEFAULTS 兜底回填，保存后以 storage 为准
async function load() {
  const cfg = await chrome.storage.local.get(DEFAULTS);
  for (const f of FIELDS) {
    document.getElementById(f).value = cfg[f] ?? "";
  }
  document.getElementById("baseURLOverride").placeholder = DEFAULTS.baseURL;
  document.getElementById("tokenOverride").placeholder = "内置口令已注入";
}

async function save() {
  const cfg = {};
  for (const f of FIELDS) {
    cfg[f] = document.getElementById(f).value.trim();
  }
  await chrome.storage.local.set(cfg);
  const tip = document.getElementById("tip");
  tip.textContent = "已保存";
  setTimeout(() => (tip.textContent = ""), 2000);
}

document.getElementById("save").addEventListener("click", save);
// 扩展版本号亮出来（排查「改了没生效/zip 里版本落后」）
document.getElementById("ver").textContent = `扩展版本 v${chrome.runtime.getManifest().version}`;
load();
