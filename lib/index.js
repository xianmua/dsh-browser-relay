// dsh-browser-relay：DSH 与浏览器之间的通信桥（cordis 插件，零第三方依赖）。
// 扩展任务在 DSH 创建会话由 agent 执行，页面操作经 browser_* 工具桥接回扩展；Bearer token 鉴权。

import http from "node:http";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { CORS_HEADERS, json } from "./apis/http.js";
import { memory, readMemory } from "./apis/memory.js";
import { readJson, writeJson } from "./apis/fs-json.js";
import { landing, extensionZip, assistantJs, coreJs, genuiAsset } from "./apis/wizard.js";
import {
  createTaskRoute,
  skillsRoute,
  commandRoute,
  messageRoute,
  answerRoute,
  pollRoute,
  resultRoute,
  cancelRoute,
} from "./apis/tasks.js";

const name = "browser-relay";
// tools：注册 browser_* 页面操作工具；其余服务任务时惰性获取
const inject = ["tools"];
const RELAY_VERSION = "0.5.23";

async function apply(ctx, config) {
  const port = Number(config?.port) > 0 ? Number(config.port) : 9916;
  const dshDir = path.join(os.homedir(), ".dsh");
  // 读小文件并去空白，失败返回空串
  async function readTrim(f) {
    try {
      return (await fs.promises.readFile(f, "utf8")).trim();
    } catch {
      return "";
    }
  }
  // 口令：patch 配置优先，否则读/生成 ~/.dsh/browser-relay-token（每机一把，防 drive-by）
  let tokenSource = "patch 配置";
  let token = String(config?.token ?? "");
  if (!token) {
    const tokenFile = path.join(dshDir, "browser-relay-token");
    tokenSource = tokenFile;
    token = await readTrim(tokenFile);
    if (!token) {
      token = crypto.randomBytes(24).toString("hex");
      await fs.promises.mkdir(dshDir, { recursive: true });
      await fs.promises.writeFile(tokenFile, token + "\n");
    }
  }
  if (!token) {
    throw new Error(`browser-relay: 鉴权口令为空（${tokenSource}）`);
  }

  // 操作剧本：同页成功执行过的 batch 步骤序列，下次同页面任务注入 prompt 免重新分析
  const playbookFile = path.join(dshDir, "browser-relay-playbook.json");
  const PLAYBOOK_PAGE_CAP = 3; // 每页保留剧本数
  async function savePlaybook(pageKey, steps) {
    try {
      const pb = await readJson(playbookFile);
      const list = (pb[pageKey] ?? []).filter(Boolean);
      list.push({ steps, ts: Date.now() });
      pb[pageKey] = list.slice(-PLAYBOOK_PAGE_CAP);
      await writeJson(playbookFile, pb);
    } catch {
      /* 剧本存取失败不影响任务 */
    }
  }
  const readPlaybook = async (pageKey) => ((await readJson(playbookFile))[pageKey] ?? []).slice(-2);

  // ---------- 浏览器任务桥：DSH 会话 ↔ 扩展命令执行 ----------
  const WATCH_INTERVAL_MS = 800; // 会话事件扫描间隔
  const tasks = new Map(); // taskId -> task
  const sessionTasks = new Map(); // sessionId -> task（工具按会话路由）
  let taskNonce = 0;

  // 取回合内最后一条非空 assistant 文本 + 回合结束原因
  function summarizeSession(session, firstSeq) {
    let text = "";
    let reason;
    for (let seq = firstSeq; seq < session.seq; seq++) {
      const ev = session.eventAt(seq);
      if (!ev) continue;
      if (ev.type === "assistant/message") {
        const joined = (ev.data?.message?.content ?? [])
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("");
        if (joined) text = joined;
      } else if (ev.type === "turn/end") {
        reason = ev.data?.reason;
      }
    }
    return { text, reason };
  }

  function wakePoll(task) {
    for (const w of task.pollWaiters.splice(0)) w();
  }
  function pushEvent(task, text, md, user) {
    // md 事件（assistant 回复）保留换行交扩展渲染 markdown；普通进度行压平截 160
    const line = md
      ? String(text).trim().slice(0, 8000)
      : String(text).replace(/\s+/g, " ").trim().slice(0, 160);
    if (!line) return;
    task.events.push(
      md
        ? { seq: ++task.seq, text: line, md: true }
        : user
          ? { seq: ++task.seq, text: line, user: true }
          : { seq: ++task.seq, text: line },
    );
    if (task.events.length > 200) task.events.splice(0, task.events.length - 200);
    wakePoll(task);
  }

  // 提问统一形状（两路检测共用）
  const toQuestion = (callId, questions) => ({
    callId: String(callId),
    questions: (questions ?? []).map((x) => ({
      id: String(x.id ?? ""),
      question: String(x.question ?? ""),
      header: x.header ? String(x.header) : "",
      options: (x.options ?? []).map((o) => String(o.label ?? "")),
      multiSelect: !!x.multiSelect,
    })),
  });

  // 开放提问应答器：面板会话抢先接管问题卡；非面板会话放行，120s 未答或中止撤卡放行官方兜底
  ctx.on(
    "user-questions/request",
    (request, next) => {
      const task = request?.agent?.session?.id ? sessionTasks.get(request.agent.session.id) : null;
      if (!task) return next();
      const heldCallId = String(request.wait?.callId ?? `open-${task.id}-${Date.now()}`);
      task.question = toQuestion(heldCallId, request.questions);
      task.statusText = "等待回答";
      pushEvent(task, task.question.questions.map((x) => x.question).join("；"));
      wakePoll(task);
      const withdraw = () => {
        if (task.question?.callId === heldCallId) {
          task.question = null;
          wakePoll(task);
        }
      };
      return new Promise((resolve) => {
        const done = (value) => {
          clearTimeout(timer);
          request.signal?.removeEventListener("abort", onAbort);
          if (task.openResolve === done) task.openResolve = null;
          resolve(value);
        };
        const onAbort = () => {
          withdraw();
          done(undefined);
        };
        const timer = setTimeout(() => {
          if (task.openResolve !== done) return;
          task.openResolve = null;
          withdraw();
          Promise.resolve(next()).then(done, done);
        }, 120_000);
        task.openResolve = done;
        request.signal?.addEventListener("abort", onAbort, { once: true });
      });
    },
    { global: true, prepend: true },
  );

  // 操作范围硬拦截（执行层）：browser 档只放行页面操作工具 + ask_user_question；
  // none 档（禁用页面操作/仅问答）只放行 ask_user_question；all 档与非面板会话不拦
  const PANEL_TOOLS = new Set([
    "browser_get_state",
    "browser_click",
    "browser_input",
    "browser_select",
    "browser_fill_by_label",
    "browser_scroll",
    "browser_execute_js",
    "browser_batch",
    "ask_user_question",
  ]);
  ctx.on(
    "tools/pre-execute",
    (exec, next) => {
      const task = exec?.agent?.session?.id ? sessionTasks.get(exec.agent.session.id) : null;
      if (!task || task.toolScope === "all") return next();
      const allowed = task.toolScope === "none" ? new Set(["ask_user_question"]) : PANEL_TOOLS;
      if (allowed.has(exec.name)) return next();
      return {
        kind: "deny",
        reason:
          task.toolScope === "none"
            ? `操作范围限制：本任务为「仅问答」模式，页面操作工具（browser_*）已被禁用，${exec.name} 已被拦截。请直接用文字回答用户问题，需要用户补充信息时用 ask_user_question 提问。`
            : `操作范围限制：本任务仅允许页面操作工具（browser_*），${exec.name} 已被拦截。请改用浏览器工具完成页面操作；字段值取任务文本或页面可见内容，缺失就填合理演示值并在总结里说明。`,
      };
    },
    { global: true, prepend: true },
  );

  // 工具执行 = 入队命令等扩展回传；exec.signal 中止时立即收敛
  function dispatchCommand(task, tool, args, exec) {
    return new Promise((resolve) => {
      const command = {
        commandId: `t${task.id}-c${++task.commandNonce}`,
        tool,
        args,
        settled: false,
        settle(value) {
          if (command.settled) return;
          command.settled = true;
          const i = task.pending.indexOf(command);
          if (i >= 0) task.pending.splice(i, 1);
          if (command.onAbort) exec.signal?.removeEventListener("abort", command.onAbort);
          resolve({
            ok: !!value?.ok,
            message: String(value?.message ?? ""),
            ...(Array.isArray(value?.succeededSteps)
              ? { succeededSteps: value.succeededSteps }
              : {}),
          });
        },
      };
      if (exec?.signal) {
        command.onAbort = () => command.settle({ ok: false, message: "命令已取消" });
        if (exec.signal.aborted) return command.onAbort();
        exec.signal.addEventListener("abort", command.onAbort, { once: true });
      }
      task.pending.push(command);
      pushEvent(task, `等待页面执行：${tool}`); // 内部唤醒挂起的轮询
    });
  }

  // 全局工具对所有 agent 可见：无关联任务时快速报错，避免普通聊天挂起
  const BRIDGE_TOOLS = [
    {
      name: "browser_get_state",
      description:
        "读取当前浏览器页面状态：返回 URL、标题和带索引的可交互元素列表（如 [12]<input placeholder=…>文本）。操作页面前先调用它获取元素索引。",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
    {
      name: "browser_click",
      description: "点击页面上指定索引的元素。",
      parameters: {
        type: "object",
        properties: { index: { type: "integer", description: "browser_get_state 返回的元素索引" } },
        required: ["index"],
        additionalProperties: false,
      },
    },
    {
      name: "browser_input",
      description: "向指定索引的输入框输入文本（自动清空原内容）。普通文本输入用这个。",
      parameters: {
        type: "object",
        properties: {
          index: { type: "integer", description: "元素索引" },
          text: { type: "string", description: "要输入的文本" },
        },
        required: ["index", "text"],
        additionalProperties: false,
      },
    },
    {
      name: "browser_select",
      description:
        "为指定索引的下拉框选择选项，一步完成（原生 select 与 el-select/antd 等自定义下拉都支持，内部自动点开面板按文本点选）。禁止先 browser_click 展开面板再找索引点击的多步走法。",
      parameters: {
        type: "object",
        properties: {
          index: { type: "integer", description: "元素索引" },
          text: { type: "string", description: "选项文本（完整匹配优先）" },
        },
        required: ["index", "text"],
        additionalProperties: false,
      },
    },
    {
      name: "browser_scroll",
      description: "滚动页面。direction 为 up/down/left/right，amount 为可选像素数（默认约 500）。",
      parameters: {
        type: "object",
        properties: {
          direction: { type: "string", enum: ["up", "down", "left", "right"] },
          amount: { type: "integer", description: "滚动像素数，可省略" },
        },
        required: ["direction"],
        additionalProperties: false,
      },
    },
    {
      name: "browser_fill_by_label",
      description: "按字段标签文案定位输入框并填写（在 browser_get_state 里找不到对应索引时用）。",
      parameters: {
        type: "object",
        properties: {
          label: { type: "string", description: "字段标签文案" },
          text: { type: "string", description: "要输入的文本" },
        },
        required: ["label", "text"],
        additionalProperties: false,
      },
    },
    {
      name: "browser_execute_js",
      description:
        "在页面里执行一段 JavaScript 并返回结果文本（谨慎使用，仅在前述工具无法完成时）。代码包在 async 函数体中执行，取返回值必须用顶层 return 语句（裸表达式的值不会被捕获）。",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "JS 语句（async 函数体），末尾用 return 返回要拿到的值",
          },
        },
        required: ["code"],
        additionalProperties: false,
      },
      timeoutMs: 60000,
    },
    {
      name: "browser_batch",
      description:
        "批量执行一组页面操作：扩展端本地连续执行全部步骤，一次调用即完成，远快于逐步调用。适合表单批量填写等确定性操作序列；依赖中间结果的操作（点击后要看结果再决定下一步）请用单步工具。默认不中断：全跑完后汇总每步成败，模型只需补处理失败项。步骤超过 10 个时拆成多次调用（每次 ≤10 步），前一批执行完立即发下一批，页面会更快开始动。",
      parameters: {
        type: "object",
        properties: {
          steps: {
            type: "array",
            description: "操作步骤列表，按顺序执行",
            items: {
              type: "object",
              properties: {
                tool: {
                  type: "string",
                  enum: [
                    "browser_click",
                    "browser_input",
                    "browser_select",
                    "browser_scroll",
                    "browser_fill_by_label",
                  ],
                  description: "单步工具名",
                },
                args: {
                  type: "object",
                  description:
                    '该工具的参数，如 {"index":12,"text":"张三"} 或 {"label":"试验负责人","text":"张三"}',
                },
              },
              required: ["tool", "args"],
              additionalProperties: false,
            },
          },
          stopOnError: {
            type: "boolean",
            description: "某步失败即停止后续步骤（默认 false，全跑完汇总）",
          },
        },
        required: ["steps"],
        additionalProperties: false,
      },
      timeoutMs: 300000,
    },
  ];
  for (const def of BRIDGE_TOOLS) {
    ctx.tools.register({
      name: def.name,
      description: def.description,
      parameters: def.parameters,
      output: {
        schema: {
          type: "object",
          properties: { ok: { type: "boolean" }, message: { type: "string" } },
          required: ["ok", "message"],
          additionalProperties: false,
        },
        render: (args, value) => [
          {
            type: "text",
            text: value?.ok
              ? String(value.message ?? "")
              : `Error: ${value?.message ?? "未知错误"}`,
          },
        ],
      },
      timeoutMs: def.timeoutMs ?? 120000,
      async execute(args, exec) {
        const sessionId = String(exec?.agent?.session?.id ?? "");
        const task = sessionId ? sessionTasks.get(sessionId) : null;
        if (!task)
          return {
            ok: false,
            message:
              "当前会话没有关联的浏览器页面任务：请在浏览器扩展「页面 AI 助手」面板发起任务后，再使用 browser_* 工具。",
          };
        if (task.status !== "running")
          return { ok: false, message: `页面任务已结束（${task.status}），无法继续操作页面。` };
        const result = await dispatchCommand(task, def.name, args ?? {}, exec);
        // batch 结束 → 成功步记入剧本（局部失败也存，剔除失败步），下次同页面任务直接复用
        const savedSteps = result?.succeededSteps;
        if (
          def.name === "browser_batch" &&
          task.pageKey &&
          Array.isArray(savedSteps) &&
          savedSteps.length
        )
          savePlaybook(task.pageKey, savedSteps).catch?.(() => {});
        // output schema 只声明 ok/message（additionalProperties:false），succeededSteps 仅本地存剧本用，
        // 塞进返回值会被 DSH 校验拒收（invalid output），每步失败详情也跟着丢失
        return { ok: !!result?.ok, message: String(result?.message ?? "") };
      },
    });
  }

  // 提交回合；reasoningEffort 压思考档位，模型未声明该档位时降级重试
  function makeSubmit(sessionId) {
    const sc = ctx.get("sessionController"); // 惰性获取（任务时才可用）
    const submitPrompt = (text, effort) => {
      const requestId = crypto.randomUUID();
      // 扫描器据此跳过面板自己的提交（本地已回显）
      sessionTasks.get(sessionId)?.ownRequestIds?.add(requestId);
      // signal 与 requestId 必传（缺失时会话事件快照拒绝）
      return sc.prompt(
        {
          sessionId,
          requestId,
          content: [{ type: "text", text }],
          ...(effort ? { reasoningEffort: String(effort) } : {}),
        },
        new AbortController().signal,
      );
    };
    const effort = config?.reasoningEffort ? String(config.reasoningEffort) : "low";
    return async (text) => {
      try {
        await submitPrompt(text, effort);
      } catch (e) {
        if (
          !/UNSUPPORTED_REASONING_EFFORT|does not support reasoning effort/i.test(
            String(e?.message ?? e),
          )
        )
          throw e;
        await submitPrompt(text, undefined);
      }
    };
  }

  // 任务记录工厂：构造记录 + 注册路由 + 流式订阅 + 会话事件扫描（任务与 chat 会话共用）
  function newTaskRecord({ tabKey, pageKey, sessionId, agent, status, statusText, toolScope }) {
    const task = {
      id: ++taskNonce,
      sessionId: String(sessionId),
      agent,
      tabKey: String(tabKey),
      pageKey: String(pageKey ?? ""),
      status,
      statusText,
      toolScope: toolScope === "all" || toolScope === "none" ? toolScope : "browser", // 操作范围：硬拦截见 tools/pre-execute 守卫
      events: [],
      seq: 0,
      commandNonce: 0,
      pending: [],
      pollWaiters: [],
      firstSeq: agent.session.seq,
      cursor: agent.session.seq,
      timer: null,
      lastToolName: "", // 最近一次工具调用：终态前判断是否校验过页面
      ownRequestIds: new Set(), // 面板提交的 requestId，扫描器据此跳过（本地已回显）
      recheckUsed: false,
      streamBuf: "",
      streamKind: "",
      lastStreamPush: 0,
      lastPoll: 0, // 最近一次面板轮询时间（懒清理判定：会话模式 30 分钟无轮询才清）
      disposeStream: null,
      chat: false, // 会话模式：任务回合结束后置 true，此后经 /task/:id/message 续聊
      question: null, // 待答问题 {callId, questions}：DSH ask_user_question 挂起时非空（官方 userQuestions 服务检测）
      usage: { input: 0, output: 0, total: 0 }, // 本回合 token 用量（turn/start 重置，step/end 累加，终态随 poll 下发）
    };
    tasks.set(task.id, task);
    sessionTasks.set(task.sessionId, task);
    // 流式帧（思考/正文增量不落会话事件）→ 面板实时可见；2.5s 节流防刷屏
    task.disposeStream = ctx.on(
      "agent/assistant-stream",
      ({ agent: subject, frame }) => {
        if (subject.session.id !== task.sessionId || task.status !== "running") return;
        if (frame.type === "start") {
          pushEvent(task, "模型推理中…");
          return;
        }
        if (frame.type !== "chunk") return;
        const c = frame.chunk;
        if (c.type !== "reasoning-delta" && c.type !== "text-delta") return;
        const kind = c.type === "reasoning-delta" ? "思考" : "回复";
        if (kind !== task.streamKind) {
          task.streamBuf = "";
          task.streamKind = kind;
        }
        task.streamBuf = (task.streamBuf + c.text).slice(-600);
        const now = Date.now();
        if (now - task.lastStreamPush < 2500) return;
        task.lastStreamPush = now;
        const tail = task.streamBuf.replace(/\s+/g, " ").trim().slice(-120);
        if (tail) pushEvent(task, `${kind}：${tail}`);
      },
      { global: true },
    );
    // 会话事件扫描：tool/call 与 assistant 文本 → 面板进度行
    const watchSessionEvents = () => {
      try {
        const s = agent.session;
        for (; task.cursor < s.seq; task.cursor++) {
          const ev = s.eventAt(task.cursor);
          if (!ev) continue;
          if (ev.type === "tool/call") {
            task.lastToolName = String(ev.data?.name ?? "");
            let a = "";
            try {
              a = JSON.stringify(JSON.parse(ev.data?.arguments ?? "{}"));
            } catch {
              a = String(ev.data?.arguments ?? "");
            }
            pushEvent(
              task,
              `执行：${ev.data?.name ?? "?"}${a && a !== "{}" ? ` ${a.slice(0, 100)}` : ""}`,
            );
          } else if (ev.type === "user/message") {
            // DSH 侧消息透出（web UI 追问/输入）：面板自己的提交与回答注入已本地回显，跳过
            const msg = ev.data?.message ?? ev.data;
            const src = msg?.source;
            if (
              src?.kind !== "user-question-reply" &&
              !(src?.rpcId && task.ownRequestIds?.has(src.rpcId))
            ) {
              const t = (msg?.content ?? [])
                .filter((b) => b.type === "text")
                .map((b) => b.text)
                .join("")
                .trim();
              if (t) pushEvent(task, `DSH 侧：${t}`);
            }
          } else if (ev.type === "assistant/message") {
            const t = (ev.data?.message?.content ?? [])
              .filter((b) => b.type === "text")
              .map((b) => b.text)
              .join("")
              .trim();
            if (t) pushEvent(task, t, true);
          } else if (ev.type === "turn/start") {
            task.usage = { input: 0, output: 0, total: 0 }; // 新回合从零累计
          } else if (ev.type === "step/end") {
            const u = ev.data?.usage ?? {};
            const inp = Number(u.inputTokens ?? 0) || 0;
            const out = Number(u.outputTokens ?? 0) || 0;
            task.usage.input += inp;
            task.usage.output += out;
            task.usage.total += Number(u.totalTokens ?? inp + out) || 0;
          }
        }
      } catch {
        /* 会话读取异常不中断扫描 */
      }
      // DSH 提问检测：投影服务兜底（覆盖超时转待答场景）
      try {
        const q = (ctx.get("sessionProjections")?.stateOf?.(agent.session, "userQuestions")
          ?.questions?.active ?? [])[0];
        if (q && task.answeredCallId !== String(q.callId)) {
          const fresh = task.question?.callId !== q.callId;
          task.question = toQuestion(q.callId, q.questions);
          if (fresh) {
            pushEvent(task, task.question.questions.map((x) => x.question).join("；"));
            task.statusText = "等待回答";
            wakePoll(task);
          }
        } else if (task.question && !task.openResolve) {
          // 投影已无该问题且 answerer 未持有 → 撤卡；answerer 直写的问题还在等作答时保留
          task.question = null;
          if (task.status === "running") task.statusText = "执行中";
          wakePoll(task);
        }
      } catch {
        /* 提问服务不可用不中断扫描 */
      }
    };
    task.timer = setInterval(watchSessionEvents, WATCH_INTERVAL_MS);
    task.watchSessionEvents = watchSessionEvents;
    return task;
  }

  // 会话续聊：回合结束回 chat 态（不终态，可继续输入）；用户在场不做自动复核
  function armChatIdle(task) {
    task.agent
      .whenIdle()
      .then(() => {
        task.watchSessionEvents();
        if (task.status !== "running") return; // 已被手动停止
        if (task.question) {
          armChatIdle(task); // DSH 提问挂起等待回答：保持 running 态，回答注入后回合继续
          return;
        }
        task.status = "chat";
        task.statusText = "对话中（可继续输入）";
        // 回合结束不再推事件行：面板操作条（复制/用量/时间）已是结束信号
      })
      .catch((e) => {
        if (task.status !== "running") return;
        // 控制台打印完整错误与堆栈（cause 是 fetch 链路的底层失败：DNS/连接/TLS/超时），便于定位是哪一跳挂的
        console.error(
          `[dsh-browser-relay] 任务 #${task.id} 回合异常（chat 模式）：`,
          e?.stack || String(e?.message ?? e),
          e?.cause ? `\n  cause: ${e.cause?.stack || e.cause?.message || e.cause}` : "",
        );
        task.status = "chat";
        task.statusText = "对话中（上一回合异常）";
        pushEvent(task, `回合异常：${String(e?.message ?? e)}`);
      });
  }

  // 按工作区路径创建会话：先解析/登记 workspace（DSH 侧栏按工作区分组会话），
  // 服务缺失或路径不可注册时退回 { cwd } 直建（Ungrouped 会话，cwd 仍指向该目录）
  async function createSessionInWorkspace(workspacePath) {
    const sc = ctx.get("sessionController");
    const ws = String(workspacePath || "").trim();
    if (!ws) return sc.create({});
    try {
      const reg = ctx.get("workspaceRegistry");
      // resolveByPath 收字符串路径；传 { path } 对象在当前 DSH 版本会抛错 → 吞错后退 Ungrouped 会话（不进工作区分组）
      let w = reg?.resolveByPath ? await reg.resolveByPath(ws) : null;
      if (!w?.id)
        w = (await ctx.get("workspaceController")?.create?.({ path: ws })) ?? null;
      if (w?.id) {
        const r = await sc.create({ workspaceId: w.id });
        // 保险：宿主 sc.create({ workspaceId }) 若未等价 GUI 的挂载路径，显式补挂一次
        try {
          await w.attachSession?.(r.sessionId);
        } catch {
          /* 已挂载或接口缺失不影响会话 */
        }
        return r;
      }
    } catch {
      /* 工作区解析/登记失败，退 cwd 直建 */
    }
    return sc.create({ cwd: ws });
  }

  async function createTask({ text, url, title, pageKey, customPrompt, toolScope, workspace, tabKey }) {
    await ctx
      .get("loader")
      ?.await?.()
      .catch?.(() => {}); // 确保 preset/模型等已挂载
    const sc = ctx.get("sessionController");
    const agents = ctx.get("agents");
    if (!sc || !agents)
      throw new Error("DSH 会话服务不可用（browser-relay 需在 dsh web 环境内运行）");
    let memText = "";
    try {
      const items = ((await readMemory())[pageKey] ?? []).slice(-5);
      if (items.length)
        memText = `本页历史经验（必须遵守）：\n${items.map((s) => `- ${s}`).join("\n")}\n`;
    } catch {
      /* 记忆缺失不影响任务 */
    }
    // 本页历史成功步骤：直接复用序列（仅替换具体值），跳过页面结构分析
    let playbookText = "";
    try {
      const list = await readPlaybook(pageKey);
      if (list.length)
        playbookText = `本页上次成功执行过的操作步骤（索引可能与当前页面略有偏移，值需按本次任务替换；结构未变时直接照此执行，禁止重新逐项分析页面）：\n${list
          .map(
            (p, i) =>
              `剧本${i + 1}：${(p.steps ?? [])
                .map((s) => `${s?.tool}(${JSON.stringify(s?.args ?? {})})`)
                .join("；")
                .slice(0, 1500)}`,
          )
          .join("\n")}\n`;
    } catch {
      /* 剧本缺失不影响任务 */
    }
    // 操作范围：默认只放 browser_*（防乱调研）；开放档护栏仍保留；none 档纯问答不触碰页面
    const tail = [playbookText, memText, customPrompt ? `用户附加要求：${customPrompt}\n` : "", `任务：${text}`]
      .filter(Boolean)
      .join("\n");
    const prompt =
      toolScope === "none"
        ? [
            `你正在通过用户的浏览器扩展「页面 AI 助手」与用户对话。本次任务为「仅问答」模式：禁止调用任何页面操作工具（browser_*），不要读取或操作页面，直接基于任务文本与你的知识作答。`,
            `规则：需要用户补充信息时用 ask_user_question 提问（最多一轮）；回答用简洁中文；统计数据优先输出 dsh-ui GenUI 图表组件（bar/line/pie preset，附一句话结论），一般对比信息用 markdown 表格；禁止用 ASCII 字符画表格或图表。`,
            tail,
          ].join("\n")
        : [
            `你正在通过用户的浏览器扩展「页面 AI 助手」操控用户当前打开的网页（${title || "未提供标题"}：${url || "未提供 URL"}）。`,
            `可用工具：browser_get_state 读取带索引的页面元素；browser_click/browser_input/browser_select 按索引操作；browser_fill_by_label 按标签文案填写；browser_scroll 滚动；browser_execute_js 执行 JS（谨慎，部分页面被 CSP 拦截，失败一次即改用 DOM 工具，禁止重试）；browser_batch 批量执行多步确定性操作（如整表单填写，一次调用完成全部步骤，务必优先用它替代逐字段调用）。get_state 里带 data-dsh-state="error" 的元素是红框校验失败/必填未填字段（页面上显示为红框），带 data-dsh-state="required" 的是必填字段：表单任务必须优先处理 error 字段，全部填完才算完成。`,
            `规则（速度优先，这是「操作页面」任务，不是调研任务）：${
              toolScope === "all"
                ? `0) 页面操作优先用 8 个浏览器工具（browser_get_state/click/input/select/fill_by_label/scroll/execute_js/batch）；确需查询后端/其他系统数据时可使用 DSH 提供的其他插件工具（如接口请求），但仅限为完成本任务取数，取完立即回到页面操作主线，严禁翻阅文档、执行命令行、令牌兑换、网页搜索等与任务无关的操作；字段值优先取任务文本或页面可见内容，仍缺失才查数，查不到就填合理演示值并在总结里说明；`
                : `0) 全程只允许调用 8 个浏览器工具（browser_get_state/click/input/select/fill_by_label/scroll/execute_js/batch），严禁调用其他任何工具（接口请求、网页抓取、命令行、搜索、读写文件、令牌兑换等一律禁止），严禁查后端系统取数求证；字段值直接取任务文本或页面可见内容，缺失就填合理演示值并在总结里说明；`
            }0.5) 思考必须极简：一两句话决定动作即执行，禁止在思考里推演「索引↔字段」映射、罗列多套方案或反复推翻自己——get_state 结果里每个元素已带相邻标签文案，直接按对应关系执行，填错了看工具结果修正即可；1) 若上面带了本页操作剧本：把剧本当步骤参考（省去 get_state 分析），第一步直接 browser_batch 只执行与本次任务相关的步骤，**值一律取本次任务文本**；任务没给值的字段跳过该步，剧本里的旧值（人名/旧日期等）一律不得照抄进无关字段（填错字段比留空更糟）；某步失败看结果修正；每次 browser_input 的结果都带该处字段的「标签回显」，发现标签与目标字段不符（如把人名填进了订单号/日期/标题）必须立即重填正确索引，填错了宁可跳过也不留错值；人名只能填进人员类字段，订单号/编号/日期/标题类字段缺失时给符合其格式含义的演示值（如单号 SYDG2026xxxx、日期用今天），禁止拿人名或无关文本充数；无剧本时第一步 browser_get_state 了解页面，之后把能确定的所有 input/select/click 步骤放进 browser_batch 提交，完成后一次 get_state 校验；步骤总数超过 10 个时必须按页面区块拆成多个 browser_batch，每批最多 10 步，逐批连续下发（一批执行完立即规划下一批，禁止把所有步骤攒成一个大 batch 慢慢写）；2) browser_get_state 整个任务最多调 2-3 次（首次、批量后校验、失败排查），禁止每步操作后都调；3) 下拉字段直接用 browser_select(索引, "选项文本") 一步完成（自定义下拉会自动展开面板点选；匹配不到会自动选第一个，需要特定值时看返回的说明重新指定）；日期/日期范围字段禁止直接填写：先 browser_click 点击字段打开日历面板，面板出现后 browser_get_state 查看日期格子的索引，再逐个点击格子（范围日期先点开始日期格子再点结束日期格子，跨月用面板上的翻页箭头）；4) browser_execute_js 的分工：允许注入 HTML/CSS/JS 修改页面展示（插入元素、改样式、隐藏/高亮模块等），注入代码里附带必要的读取（querySelector 定位、getBoundingClientRect 查位置、读现有样式等）属于注入的前置步骤，完全允许；但禁止把它当 browser_get_state 的替代品去批量抓取页面内容/结构来回答问题（读页面一律用 browser_get_state），也禁止从页面里 fetch 后端接口调研数据；5) 禁止点击「返回/后退/取消」类导航按钮离开当前编辑页；6) 同一操作连续失败 2 次必须换策略或如实报告，禁止死循环重试；7) 页面原生 alert/confirm/prompt 已被自动拦截（confirm 自动确认、prompt 填默认值），弹窗文本附在工具结果里，注意据此调整后续操作，删除/提交类按钮点击前务必核实语义；8) 完成后用一句简洁中文总结结果（面板渲染 markdown：统计数据优先输出 dsh-ui GenUI 图表组件（bar/line/pie preset，附一句话结论），一般对比信息用 markdown 表格，禁止用 ASCII 字符画表格或图表）。`,
            tail,
          ].join("\n");
    const { sessionId } = await createSessionInWorkspace(workspace);
    try {
      await sc.rename({ sessionId, title: String(text).slice(0, 80) });
    } catch {
      /* 标题服务缺失不影响任务 */
    }
    const agent = agents.get(sessionId);
    if (!agent) throw new Error(`会话 ${sessionId} 已创建但拿不到 Agent 句柄`);
    const task = newTaskRecord({
      tabKey,
      pageKey,
      sessionId,
      agent,
      status: "running",
      statusText: "执行中",
      toolScope,
      pageMode,
    });
    pushEvent(task, "任务已提交，DSH agent 执行中");
    // 回合结束 → flush + 汇总最终回复；操作后未校验页面时自动追加一轮复核（防漏填收工，每任务最多 1 次）
    const armIdleWatch = () => {
      agent
        .whenIdle()
        .then(async () => {
          if (task.status !== "running") return; // 已被手动取消等终态覆盖
          task.watchSessionEvents(); // 补扫尾部事件，保证 lastToolName 最新
          if (task.question) {
            armIdleWatch(); // DSH 提问挂起等待回答：不终态不清监听，回答注入后回合继续，届时再兑现
            return;
          }
          if (task.lastToolName && task.lastToolName !== "browser_get_state" && !task.recheckUsed) {
            task.recheckUsed = true;
            pushEvent(task, "自动复核：最后操作后未见页面校验，要求模型逐项核对");
            try {
              await submitWithEffort(
                "（自动复核）你宣布了完成，但最后一次操作后没有校验页面。请立即 browser_get_state 核对：任务要求的每个字段是否都已填写/选择、是否提交成功；有遗漏用 browser_batch 补齐并重新提交，全部确认后用一句话总结（列出已处理字段清单）。",
              );
            } catch (e) {
              console.log(`[dsh-browser-relay] 复核回合提交失败：${String(e?.message ?? e)}`);
            }
            armIdleWatch();
            return;
          }
          try {
            await ctx.get("sessions")?.flush?.(agent.session);
          } catch (e) {
            console.log(`[dsh-browser-relay] 会话 flush 失败：${String(e?.message ?? e)}`);
          }
          const { text: finalText, reason } = summarizeSession(agent.session, task.firstSeq);
          const ok = reason?.kind === "completed";
          const errText = reason?.error?.message || reason?.error?.code || "";
          if (ok) {
            if (finalText) {
              // 扫描器已把最后一条 assistant/message push 进列表，与总结相同时不再重复
              const lastMd = [...task.events].reverse().find((e) => e.md);
              if (lastMd?.text !== finalText) pushEvent(task, finalText, true);
            } else pushEvent(task, "完成：无总结文本");
          } else {
            pushEvent(
              task,
              `任务失败（回合异常 ${reason?.kind ?? "unknown"}）${errText ? `：${errText}` : ""}`.slice(
                0,
                160,
              ),
            );
          }
          // 不销毁任务：转「会话模式」保留上下文，后续输入经 /task/:id/message 续聊
          task.chat = true;
          task.status = "chat";
          task.statusText = ok ? "已完成，可继续输入" : "已失败，可重试或换说法";
          console.log(
            `[dsh-browser-relay] 任务 #${task.id} 回合结束：${ok ? "完成" : "失败"}，转入会话模式`,
          );
        })
        .catch((e) => {
          if (task.status !== "running") return;
          // 宿主回合收尾环节自身异常时（如 Desktop 0.2.1-rc.3 的 session.eventList TypeError），
          // 事件流可能已完整（工具与总结都完成）：先按会话内容判定，别急着判失败
          task.watchSessionEvents();
          const { text: finalText, reason } = summarizeSession(agent.session, task.firstSeq);
          const rescued = reason?.kind === "completed";
          if (!rescued) {
            console.error(
              `[dsh-browser-relay] 任务 #${task.id} 回合失败：`,
              e?.stack || String(e?.message ?? e),
              e?.cause ? `\n  cause: ${e.cause?.stack || e.cause?.message || e.cause}` : "",
            );
            task.chat = true;
            task.status = "chat";
            task.statusText = "已失败，可重试或换说法";
            pushEvent(task, `回合异常：${String(e?.message ?? e)}`);
            return;
          }
          if (finalText) {
            const lastMd = [...task.events].reverse().find((e) => e.md);
            if (lastMd?.text !== finalText) pushEvent(task, finalText, true);
          } else pushEvent(task, "完成：无总结文本");
          task.chat = true;
          task.status = "chat";
          task.statusText = "已完成，可继续输入";
          console.log(
            `[dsh-browser-relay] 任务 #${task.id} 回合实际已完成（宿主收尾异常被容错：${String(e?.message ?? e).slice(0, 120)}）`,
          );
        });
    };
    // 回合提交放后台：POST /task 立即返回 taskId（面板随即开始轮询）。sc.prompt 在回合被模型侧接受前会挂起，
    // 若 await 它，模型网关卡死时创建接口会跟着无限 pending（.104 实测）；提交失败置 error 态，经 poll 下发面板
    const submitWithEffort = makeSubmit(sessionId);
    submitWithEffort(prompt)
      .then(() => armIdleWatch())
      .catch((e) => {
        console.error(
          `[dsh-browser-relay] 任务 #${task.id} 回合提交失败：`,
          e?.stack || String(e?.message ?? e),
          e?.cause ? `\n  cause: ${e.cause?.stack || e.cause?.message || e.cause}` : "",
        );
        task.status = "error";
        const detail = [e?.details?.reason, e?.cause?.message].filter(Boolean).join("；");
        task.statusText =
          `任务提交失败：${String(e?.message ?? e)}${detail ? `（${String(detail).slice(0, 200)}）` : ""}`.slice(
            0,
            300,
          );
        pushEvent(task, task.statusText);
      });
    // 懒清理（>50 时删最早）：非运行任务中，30 分钟无轮询的才清（面板早已关闭；活跃会话保留）
    if (tasks.size > 50) {
      for (const [id, t] of tasks) {
        if (tasks.size <= 50) break;
        if (
          t.status !== "running" &&
          (!t.chat || !t.lastPoll || Date.now() - t.lastPoll > 30 * 60 * 1000)
        ) {
          clearInterval(t.timer);
          t.disposeStream?.();
          tasks.delete(id);
          sessionTasks.delete(t.sessionId);
        }
      }
    }
    return task;
  }

  function settleAllTasks(reason) {
    for (const t of tasks.values()) {
      clearInterval(t.timer);
      t.disposeStream?.();
      for (const c of t.pending.splice(0)) c.settle({ ok: false, message: reason });
      if (t.status === "running") {
        t.status = "error";
        t.statusText = `任务失败（${reason}）`;
        pushEvent(t, reason); // pushEvent 内部已唤醒挂起的轮询
      }
    }
  }

  // ---------- 扩展分发：向导页 + zip 下载（lib/apis/wizard.js）----------

  // HTTP 路由：端点实现按能力域拆在 lib/apis/（http 工具 / memory / wizard 分发 / tasks 任务域）
  async function handleHttp(req, res) {
    const env = {
      ctx,
      config,
      port,
      token,
      version: RELAY_VERSION,
      tasks,
      pushEvent,
      createTask,
      makeSubmit,
      armChatIdle,
    };
    if (req.method === "GET" && req.url === "/") return landing(env, req, res);
    if (req.method === "GET" && req.url === "/dsh-assistant.min.js")
      return assistantJs(env, req, res);
    if (req.method === "GET" && req.url === "/dsh-md-core.js")
      return coreJs(env, req, res); // 页面版渲染核心独立产物（loader 按需 module 加载）
    if (req.method === "GET" && req.url?.startsWith("/plugins/@changfenhuang/dsh-genui/assets/"))
      return genuiAsset(env, req, res); // GenUI 独立运行时（dsh-ui 围栏 iframe 用）
    if (req.method === "POST" && req.url === "/memory") return memory(env, req, res);
    if (req.method === "POST" && req.url === "/task") return createTaskRoute(env, req, res);
    if (req.method === "GET" && req.url.startsWith("/skills")) return skillsRoute(env, req, res);
    if (req.method === "POST" && /^\/task\/\d+\/command$/.test(req.url ?? ""))
      return commandRoute(env, req, res);
    if (req.method === "POST" && /^\/task\/\d+\/message$/.test(req.url ?? ""))
      return messageRoute(env, req, res);
    if (req.method === "POST" && /^\/task\/\d+\/answer$/.test(req.url ?? ""))
      return answerRoute(env, req, res);
    if (req.method === "GET" && /^\/task\/\d+\/poll/.test(req.url ?? ""))
      return pollRoute(env, req, res);
    if (req.method === "POST" && req.url === "/task/result") return resultRoute(env, req, res);
    if (req.method === "POST" && req.url === "/task/cancel") return cancelRoute(env, req, res);
    if (req.method === "GET" && req.url === "/extension.zip") return extensionZip(env, req, res);
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }
    json(res, 404, { error: { message: "not found" } });
  }

  const server = http.createServer((req, res) => {
    handleHttp(req, res).catch((e) => {
      console.error(`[dsh-browser-relay] HTTP 异常 ${String(e?.message ?? e)}`);
      try {
        if (!res.headersSent) json(res, 500, { error: { message: String(e?.message ?? e) } });
        else res.destroy();
      } catch {
        /* 忽略 */
      }
    });
  });
  server.on("error", (e) =>
    console.error(`[dsh-browser-relay] 服务端错误 ${String(e?.message ?? e)}`),
  );
  const host = String(config?.host ?? "127.0.0.1"); // 默认仅本机；切远程监听改 patch host: 0.0.0.0
  server.listen(port, host, () => {
    console.log(
      `[dsh-browser-relay] 通信桥已启动 v${RELAY_VERSION} http://${host}:${port}（任务经 DSH 创建会话执行；口令来源 ${tokenSource}）`,
    );
  });

  ctx.effect(
    () => () => {
      settleAllTasks("relay 已停止");
      try {
        server.close();
      } catch {
        /* 忽略 */
      }
    },
    "browser-relay.server",
  );
}

export { apply, inject, name };
