// 任务域端点：创建任务/会话、模型目录、斜杠命令、长轮询、命令回传、停止、续聊
// 闭包依赖（tasks Map、createTask、makeSubmit、armChatIdle、pushEvent）经 env 注入

import { guard, json, jsonBody } from "./http.js";

const POLL_WAIT_MS = 25000; // 长轮询挂起上限

// 路由样板：鉴权 → URL 解 taskId → 404；返回 task 或 null（已应答）
function taskFromUrl(env, req, res, re, msg = "任务不存在或已清理") {
  if (!guard(req, res, env.token)) return null;
  const path = req.url.split("?")[0]; // 去掉 query 再匹配（poll 带 ?after=…）
  const task = env.tasks.get(Number(path.match(re)?.[1]));
  if (!task) {
    json(res, 404, { error: { message: msg } });
    return null;
  }
  return task;
}

// POST /task：创建普通任务（DSH 会话 + browser_* 工具桥）
export async function createTaskRoute(env, req, res) {
  if (!guard(req, res, env.token)) return;
  const p = await jsonBody(req);
  const text = String(p?.text ?? "").trim();
  const tabKey = String(p?.tabKey ?? "").trim();
  if (!text || !tabKey) {
    json(res, 400, { error: { message: "text 与 tabKey 均不能为空" } });
    return;
  }
  for (const t of env.tasks.values()) {
    if (t.tabKey === tabKey && t.status === "running") {
      json(res, 409, { error: { message: "该标签页已有进行中的任务" } });
      return;
    }
  }
  try {
    const task = await env.createTask({
      text,
      url: String(p?.url ?? ""),
      title: String(p?.title ?? ""),
      pageKey: String(p?.pageKey ?? ""),
      customPrompt: String(p?.customPrompt ?? "").trim(),
      aiLevel: String(p?.aiLevel ?? "dsh").trim(),
      workspace: String(p?.workspace ?? "").trim(),
      tabKey,
    });
    console.log(`[dsh-browser-relay] 任务 #${task.id} 已创建 DSH 会话 ${task.sessionId}`);
    json(res, 200, { taskId: task.id, sessionId: task.sessionId });
  } catch (e) {
    json(res, 500, { error: { message: `创建 DSH 会话失败：${String(e?.message ?? e)}` } });
  }
}

// GET /skills?taskId=N：技能目录；调用 = 把 /技能名 作为回合文本提交（DSH 手势识别自动展开技能内容）
export async function skillsRoute(env, req, res) {
  if (!guard(req, res, env.token)) return;
  const task = env.tasks.get(
    Number(new URL(req.url, "http://localhost").searchParams.get("taskId")),
  );
  if (!task) {
    json(res, 404, { error: { message: "任务不存在或已清理" } });
    return;
  }
  try {
    const catalog = env.ctx.get("sessionSkillCatalog");
    if (!catalog) {
      json(res, 400, { error: { message: "DSH 无技能服务" } });
      return;
    }
    const { skills } = await catalog.list({ sessionId: task.sessionId });
    json(res, 200, {
      skills: skills.map((s) => ({ name: s.name, description: s.description ?? "" })),
    });
  } catch (e) {
    json(res, 500, {
      error: { message: `技能目录获取失败：${String(e?.message ?? e)}`.slice(0, 300) },
    });
  }
}

// POST /task/:id/command：面板斜杠命令，整行转调 DSH 命令注册表
export async function commandRoute(env, req, res) {
  const task = taskFromUrl(env, req, res, /^\/task\/(\d+)\/command$/);
  if (!task) return;
  const p = await jsonBody(req);
  const action = String(p?.action ?? "")
    .replace(/^\//, "")
    .trim();
  try {
    const commands = env.ctx.get("commands");
    if (!commands) {
      json(res, 400, { error: { message: "DSH 命令服务不可用" } });
      return;
    }
    if (action === "compact" && task.status === "running") {
      json(res, 409, { error: { message: "当前回合执行中，请等结束或点停止" } });
      return;
    }
    // 整行透传，命令名与参数由 DSH 解析
    const execution = await commands.execute(
      task.agent,
      `/${action}`,
      [],
      new AbortController().signal,
    );
    if (!execution) {
      json(res, 400, { error: { message: `未知命令：/${action}` } });
      return;
    }
    const r = execution.result;
    json(res, 200, {
      ok: r.kind !== "error",
      message: String(r.text || (r.kind === "error" ? "命令执行失败" : "已执行")).slice(0, 300),
    });
  } catch (e) {
    json(res, 500, {
      error: { message: `命令执行失败：${String(e?.message ?? e)}`.slice(0, 300) },
    });
  }
}

// POST /task/:id/message：会话续聊，向 chat 任务所属会话提交新回合（browser_* 工具路由复用现有机制）
export async function messageRoute(env, req, res) {
  const task = taskFromUrl(env, req, res, /^\/task\/(\d+)\/message$/, "会话不存在或已清理");
  if (!task) return;
  if (!task.chat) {
    json(res, 400, {
      error: { message: "该会话不可续聊（回合尚未结束或已被清理，点面板 + 开新会话）" },
    });
    return;
  }
  if (task.status === "running") {
    json(res, 409, { error: { message: "当前回合执行中，请等结束或点停止" } });
    return;
  }
  const p = await jsonBody(req);
  const text = String(p?.text ?? "").trim();
  if (!text) {
    json(res, 400, { error: { message: "text 不能为空" } });
    return;
  }
  task.status = "running";
  task.statusText = "执行中";
  task.usage = { input: 0, output: 0, total: 0 }; // 新回合从零累计（兜底 turn/start 缺失）
  env.pushEvent(task, text, false, true); // user 事件：面板渲染为气泡（本地不再重复画）
  try {
    // 先启动回合再挂 whenIdle，防止空转的 whenIdle 提前兑现
    await env.makeSubmit(task.sessionId)(text);
    env.armChatIdle(task);
  } catch (e) {
    task.status = "chat";
    task.statusText = "对话中（回合提交失败）";
    env.pushEvent(task, `回合提交失败：${String(e?.message ?? e)}`);
  }
  json(res, 200, { ok: true, status: task.status });
}

// GET /task/:id/poll：长轮询；命令不标记投递（回传才 settle），扩展崩溃重轮询可重取
export async function pollRoute(env, req, res) {
  const u = new URL(req.url, "http://localhost");
  const task = taskFromUrl(env, req, res, /^\/task\/(\d+)\/poll$/);
  if (!task) return;
  if (String(u.searchParams.get("tab") ?? "") !== task.tabKey) {
    json(res, 403, { error: { message: "tabKey 不匹配" } });
    return;
  }
  const after = Number(u.searchParams.get("after") ?? 0) || 0;
  const respond = () => {
    task.lastPoll = Date.now(); // 懒清理判定：仍在被面板轮询的会话不清理
    const pending = task.pending[0] ?? null;
    json(res, 200, {
      taskId: task.id,
      status: task.status,
      statusText: task.statusText,
      chat: !!task.chat,
      question: task.question,
      usage: task.usage ?? null,
      seq: task.seq,
      events: task.events.filter((e) => e.seq > after),
      command: pending
        ? { commandId: pending.commandId, tool: pending.tool, args: pending.args }
        : null,
    });
  };
  // 有新事件/待执行命令/待答提问才立即返回；否则（含 chat 空闲态）挂起等 pushEvent 唤醒，超时兜底返回
  if (task.seq > after || task.pending.length > 0 || task.question) {
    respond();
    return;
  }
  // 无新内容：挂起等唤醒，超时返回当前状态
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    const i = task.pollWaiters.indexOf(finish);
    if (i >= 0) task.pollWaiters.splice(i, 1);
    try {
      respond();
    } catch {
      /* 客户端已断开 */
    }
  };
  task.pollWaiters.push(finish);
  const timer = setTimeout(finish, POLL_WAIT_MS);
}

// POST /task/:id/answer：回答 DSH 提问；挂起态经抢答应答器收敛，其余走官方应答服务
export async function answerRoute(env, req, res) {
  const task = taskFromUrl(env, req, res, /^\/task\/(\d+)\/answer$/);
  if (!task) return;
  const p = await jsonBody(req);
  const callId = String(p?.callId ?? "");
  const answers = Array.isArray(p?.answers) ? p.answers : [];
  if (!callId || !answers.length)
    return json(res, 400, { error: { message: "callId 与 answers 均不能为空" } });
  if (task.question?.callId !== callId)
    return json(res, 409, { error: { message: "没有待答问题或 callId 已过期" } });
  try {
    if (task.openResolve) {
      task.openResolve({ answers }); // 把答案递回挂起中的应答器
    } else {
      const uq = env.ctx.get("userQuestions");
      if (!uq) return json(res, 400, { error: { message: "DSH 提问服务不可用" } });
      await uq.answer(task.agent, callId, { answers });
    }
    task.answeredCallId = callId;
    task.question = null;
    task.statusText = "执行中";
    const text = answers
      .map((a) => a.custom || (a.selected ?? []).join("、"))
      .filter(Boolean)
      .join("；");
    env.pushEvent(task, text, false, true); // user 事件：面板渲染为气泡（提问回答与续聊消息同款）
    json(res, 200, { ok: true });
  } catch (e) {
    json(res, 500, {
      error: { message: `回答提交失败：${String(e?.message ?? e)}`.slice(0, 300) },
    });
  }
}

// GET /task/:id/history?sessionId=&tab=：会话历史回放（面板会话列表切换用）。
// taskId 必须 sessionId 匹配（relay 重启后编号会错位，防取错任务）；记录被清理时按 sessionId 重挂；
// 返回任务已推流的全量事件（重建/回放共用一个 seq 空间，面板从 resp.seq 续接 poll 不重不漏）
export async function historyRoute(env, req, res) {
  if (!guard(req, res, env.token)) return;
  const u = new URL(req.url, "http://localhost");
  const sessionId = String(u.searchParams.get("sessionId") ?? "").trim();
  const tab = String(u.searchParams.get("tab") ?? "");
  const byId = env.tasks.get(Number(u.pathname.match(/^\/task\/(\d+)\/history$/)?.[1]));
  let task = byId && byId.sessionId === sessionId ? byId : env.sessionTasks.get(sessionId) ?? null;
  if (!task && sessionId) task = env.reattachSession(sessionId, tab);
  if (!task) {
    json(res, 404, {
      error: { message: "会话已清理（relay 重启或超 30 分钟未轮询），无法加载历史；可在 DSH web UI 回看" },
    });
    return;
  }
  task.lastPoll = Date.now(); // 懒清理判定口径与 poll 对齐：刚切进来的会话不算闲置
  if (tab && task.tabKey !== tab) task.tabKey = tab; // 切换 = 接管：重绑到当前标签页，否则后续 poll 因 tabKey 校验 403
  json(res, 200, {
    taskId: task.id,
    status: task.status,
    statusText: task.statusText,
    chat: !!task.chat,
    seq: task.seq,
    events: task.events,
  });
}

// POST /task/result：扩展回传命令执行结果
export async function resultRoute(env, req, res) {
  if (!guard(req, res, env.token)) return;
  const p = await jsonBody(req);
  const task = env.tasks.get(Number(p?.taskId));
  const commandId = String(p?.commandId ?? "");
  const cmd = task?.pending.find((c) => c.commandId === commandId);
  if (!cmd) {
    json(res, 404, { error: { message: "命令不存在或已结束" } });
    return;
  }
  cmd.settle(p?.value);
  json(res, 200, { ok: true });
}

// POST /task/cancel：面板「停止」
export async function cancelRoute(env, req, res) {
  if (!guard(req, res, env.token)) return;
  const p = await jsonBody(req);
  const task = env.tasks.get(Number(p?.taskId));
  if (!task) {
    json(res, 404, { error: { message: "任务不存在" } });
    return;
  }
  if (task.status === "running") {
    // 先清理 pending 再 pushEvent：pushEvent 会唤醒挂起的 poll（此刻不能让它取到已废弃的命令）
    for (const c of task.pending.splice(0)) c.settle({ ok: false, message: "任务已手动停止" });
    // 停止只结束当前回合：任务转「会话模式」保留（可继续输入），面板「+」才是开新会话
    task.chat = true;
    task.status = "chat";
    task.statusText = "已停止，可继续输入";
    env.pushEvent(task, "已手动停止当前回合，会话保留");
    try {
      task.agent.cancel({ kind: "user" });
    } catch {
      /* agent 可能已退出 */
    }
  }
  json(res, 200, { ok: true, status: task.status });
}
