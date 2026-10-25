// 主世界原生弹窗钩子（document_start 先于页面脚本安装）：
// 任务期间拦截 alert/confirm/prompt——记录弹窗文本并自动应答，页面 JS 不被挂起；
// 任务外保持原样。与 loader.js（隔离世界）经 window.postMessage 双向通信。
(() => {
  const orig = { alert: window.alert, confirm: window.confirm, prompt: window.prompt };
  let on = false;

  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    const ctl = e.data?.__dshDialogCtl;
    if (ctl) on = ctl.mode === "on";
  });

  const report = (type, text, cancelled = false) => {
    try {
      window.postMessage({ __dshDialog: { type, text: String(text ?? ""), cancelled } }, "*");
    } catch {}
  };

  // 删除类确认弹窗不放行：页面常用原生 confirm 做删除护栏，命中删除词改自动取消
  const DELETE_RE = /删除|移除|清空|销毁|delete|remove/i;

  window.alert = (msg) => {
    if (on) return report("alert", msg);
    return orig.alert?.call(window, msg);
  };
  window.confirm = (msg) => {
    if (on) {
      const cancelled = DELETE_RE.test(String(msg ?? ""));
      report("confirm", msg, cancelled);
      return !cancelled; // 删除护栏自动取消，其余自动确认
    }
    return orig.confirm?.call(window, msg);
  };
  window.prompt = (msg, def) => {
    if (on) {
      report("prompt", msg);
      return def ?? "";
    }
    return orig.prompt?.call(window, msg, def);
  };
})();
