// installed by herdr
// managed by herdr; reinstalling or updating the integration overwrites this file.
// add custom hooks/plugins beside this file instead of editing it.
// HERDR_INTEGRATION_ID=pi
// HERDR_INTEGRATION_VERSION=9
// @ts-nocheck

import { appendFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

// ---------------------------------------------------------------------------
// LOCAL PATCH v2 (not upstream) — see README.md in this directory.
// Marker for apply.sh: HERDR_PI_PATCH
//
// The stock integration reports idle as soon as the main run settles, because
// Pi's ctx.isIdle() covers only the agent run and compaction — not background
// subagents (pi-subagents) or background tasks (pi-background-tasks). Herdr
// disables screen detection for Pi (full lifecycle hook authority), so nothing
// compensates: a pane with a live background agent reads as idle/done for the
// whole run. Measured 2026-09-16 on this machine.
// ---------------------------------------------------------------------------
const SUBAGENT_MANAGER_KEY = Symbol.for("pi-subagents:manager");
const BACKGROUND_REQUEST_CHANNEL = "pi-background-tasks:request:v1";
const BACKGROUND_RESPONSE_CHANNEL = "pi-background-tasks:response:v1";
const BACKGROUND_TERMINAL_CHANNEL = "pi-background-tasks:terminal:v1";
const BACKGROUND_REQUEST_SCHEMA = "pi-background-tasks.extension-request.v1";
const BACKGROUND_RESPONSE_SCHEMA = "pi-background-tasks.extension-response.v1";
const BACKGROUND_TERMINAL_SCHEMA = "pi-background-tasks.extension-terminal.v1";
const BACKGROUND_POLL_MS = 2000;
const BACKGROUND_REQUEST_TIMEOUT_MS = 2000;

// Set HERDR_PI_PATCH_DEBUG=1 (or =/path/to/log) to trace what the patch sees and
// publishes. One line per state change, per extension instance — this is how the
// cross-instance bug below was found.
const BACKGROUND_DEBUG_LOG = process.env.HERDR_PI_PATCH_DEBUG
  ? process.env.HERDR_PI_PATCH_DEBUG === "1"
    ? "/tmp/herdr-pi-patch-debug.log"
    : process.env.HERDR_PI_PATCH_DEBUG
  : undefined;
let backgroundInstanceSeq = 0;

function backgroundDebug(instanceId: number, message: string): void {
  if (BACKGROUND_DEBUG_LOG === undefined) {
    return;
  }
  try {
    appendFileSync(
      BACKGROUND_DEBUG_LOG,
      `${new Date().toISOString()} pid=${process.pid} inst=${instanceId} ${message}\n`,
    );
  } catch {
    // never let debug logging break the extension
  }
}

const backgroundRunningTaskIds = new Set<string>();
let backgroundRequestId: string | undefined;
let backgroundRequestSentAt = 0;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function backgroundSubagentsBusy(): boolean {
  return backgroundSubagentStatuses().some(
    (status) => status === "running" || status === "queued",
  );
}

function backgroundSubagentStatuses(): string[] {
  try {
    const manager = (globalThis as any)[SUBAGENT_MANAGER_KEY];
    if (manager === undefined) {
      return ["no-manager"];
    }
    // docs/rpc.md "The manager registry": the entry exposes
    // waitForAll/hasRunning/spawn/getRecord — not listAgents().
    if (typeof manager.hasRunning === "function") {
      return [manager.hasRunning() === true ? "running" : "none"];
    }
    const agents = manager?.listAgents?.();
    if (!Array.isArray(agents)) {
      return ["no-hasRunning"];
    }
    return agents.map((agent: any) => String(agent?.status ?? agent?.state ?? "unknown"));
  } catch {
    return ["error"];
  }
}

function backgroundWorkPending(): boolean {
  return backgroundRunningTaskIds.size > 0 || backgroundSubagentsBusy();
}

const HERDR_ENV = process.env.HERDR_ENV;
const socketPath = process.env.HERDR_SOCKET_PATH;
const socketEndpoint =
  process.platform === "win32" && socketPath ? `\\\\.\\pipe\\${socketPath}` : socketPath;
const paneId = process.env.HERDR_PANE_ID;
const source = "herdr:pi";

function enabled() {
  return HERDR_ENV === "1" && !!socketPath && !!paneId;
}

function sendRequestAttempt(request: unknown, timeoutMs: number): Promise<boolean> {
  if (!enabled()) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let done = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const finish = (delivered: boolean) => {
      if (done) return;
      done = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      socket.destroy();
      resolve(delivered);
    };

    const socket = net.createConnection(socketEndpoint!);
    socket.on("error", () => finish(false));
    socket.on("connect", () => socket.write(`${JSON.stringify(request)}\n`));
    socket.on("data", () => finish(true));
    socket.on("end", () => finish(false));
    timeout = setTimeout(() => finish(false), timeoutMs);
    timeout.unref?.();
  });
}

async function sendRequest(request: unknown): Promise<void> {
  if (await sendRequestAttempt(request, 500)) {
    return;
  }
  await sendRequestAttempt(request, 1500);
}

type AgentState = "working" | "blocked" | "idle";

type QueuedState = {
  state: AgentState;
  message?: string;
  seq: number;
};

let reportSeq = Date.now() * 1000;
let currentAgentSessionId: string | undefined;
let currentAgentSessionPath: string | undefined;

function nextReportSeq(): number {
  reportSeq += 1;
  return reportSeq;
}

function updateSessionRef(ctx: any): void {
  try {
    const file = ctx?.sessionManager?.getSessionFile?.();
    currentAgentSessionPath =
      typeof file === "string" &&
      (path.posix.isAbsolute(file) || path.win32.isAbsolute(file))
        ? file
        : undefined;
  } catch {
    currentAgentSessionPath = undefined;
  }

  try {
    const id = ctx?.sessionManager?.getSessionId?.();
    currentAgentSessionId = typeof id === "string" && id.length > 0 ? id : undefined;
  } catch {
    currentAgentSessionId = undefined;
  }
}

function withSessionRef(params: Record<string, unknown>): Record<string, unknown> {
  if (currentAgentSessionPath) {
    return { ...params, agent_session_path: currentAgentSessionPath };
  }
  if (currentAgentSessionId) {
    return { ...params, agent_session_id: currentAgentSessionId };
  }
  return params;
}

function currentSessionRef(): Record<string, unknown> | undefined {
  if (currentAgentSessionPath) {
    return { agent_session_path: currentAgentSessionPath };
  }
  if (currentAgentSessionId) {
    return { agent_session_id: currentAgentSessionId };
  }
  return undefined;
}

function reportSession(sessionStartSource?: string): Promise<void> {
  const sessionRef = currentSessionRef();
  if (!sessionRef) {
    return Promise.resolve();
  }

  return sendRequest({
    id: `${source}:session:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    method: "pane.report_agent_session",
    params: {
      pane_id: paneId,
      source,
      agent: "pi",
      seq: nextReportSeq(),
      session_start_source: sessionStartSource,
      ...sessionRef,
    },
  });
}

function sendState(state: AgentState, message?: string, seq = nextReportSeq()): Promise<void> {
  return sendRequest({
    id: `${source}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    method: "pane.report_agent",
    params: withSessionRef({
      pane_id: paneId,
      source,
      agent: "pi",
      state,
      message,
      seq,
    }),
  });
}

let sendInFlight = false;
let queuedState: QueuedState | undefined;

function queueState(state: AgentState, message?: string): void {
  queuedState = { state, message, seq: nextReportSeq() };
  if (!sendInFlight) {
    void drainStateQueue();
  }
}

async function drainStateQueue(): Promise<void> {
  if (sendInFlight) {
    return;
  }

  sendInFlight = true;
  try {
    while (queuedState) {
      const next = queuedState;
      queuedState = undefined;
      await sendState(next.state, next.message, next.seq);
    }
  } finally {
    sendInFlight = false;
    if (queuedState) {
      void drainStateQueue();
    }
  }
}

export default function (pi) {
  if (!enabled()) {
    return;
  }

  let agentActive = false;
  let blockedCount = 0;
  let blockedMessage: string | undefined;
  let lastState: AgentState | undefined;
  let lastMessage: string | undefined;
  let rootSession = false;

  function desiredState() {
    if (blockedCount > 0) {
      return { state: "blocked" as const, message: blockedMessage };
    }
    // LOCAL PATCH: background subagents/tasks keep the pane "working".
    if (agentActive || backgroundWorkPending()) {
      return { state: "working" as const, message: undefined };
    }
    return { state: "idle" as const, message: undefined };
  }

  function publishState(force = false) {
    const next = desiredState();
    if (!force && next.state === lastState && next.message === lastMessage) {
      return;
    }
    lastState = next.state;
    lastMessage = next.message;
    backgroundDebug(backgroundInstanceId, `publish ${next.state}`);
    queueState(next.state, next.message);
  }

  pi.events.on("herdr:blocked", (data) => {
    if (!rootSession) {
      return;
    }
    if (!data?.active) {
      blockedCount = Math.max(0, blockedCount - 1);
      if (blockedCount === 0) {
        blockedMessage = undefined;
      }
      publishState();
      return;
    }

    blockedCount += 1;
    blockedMessage = data.label;
    publishState();
  });

  pi.on("session_start", async (event, ctx) => {
    // TUI only: RPC/JSON/print modes are headless (no PTY herdr can display),
    // and RPC still reports hasUI=true, so mode is the reliable gate.
    if (ctx?.mode !== "tui") {
      return;
    }
    rootSession = true;
    updateSessionRef(ctx);
    await reportSession(event?.reason);
    // A reload can replace this extension mid-run without emitting another agent_start.
    agentActive = ctx?.isIdle?.() === false;
    publishState(true);
  });

  pi.on("agent_start", (_event, ctx) => {
    if (!rootSession) {
      return;
    }
    updateSessionRef(ctx);
    void reportSession();
    agentActive = true;
    publishState();
  });

  pi.on("agent_settled", (_event, ctx) => {
    if (!rootSession || ctx?.isIdle?.() !== true) {
      return;
    }

    agentActive = false;
    publishState();
  });

  // --- LOCAL PATCH: keep reporting "working" while background work runs -----
  // The stock integration settles to idle when the main run ends. Poll the two
  // documented background registries so the pane stays "working" until the
  // subagents/tasks it spawned are done. publishState() dedupes, so the poll
  // only sends to herdr when the state actually changes.
  function requestBackgroundStatus(): void {
    const now = Date.now();
    if (
      backgroundRequestId !== undefined &&
      now - backgroundRequestSentAt < BACKGROUND_REQUEST_TIMEOUT_MS
    ) {
      return;
    }
    const requestId = `bg-${now}-${Math.random().toString(36).slice(2, 8)}`;
    backgroundRequestId = requestId;
    backgroundRequestSentAt = now;
    try {
      pi.events.emit(BACKGROUND_REQUEST_CHANNEL, {
        schema_version: BACKGROUND_REQUEST_SCHEMA,
        request_id: requestId,
        operation: "status",
        payload: {},
      });
    } catch {
      backgroundRequestId = undefined;
    }
  }

  // Only the pane's own TUI session may report. Subagents/child sessions load
  // this extension too (rootSession stays false for them); without this gate two
  // instances fight over one pane's state and the badge flaps between
  // working/done. Measured 2026-09-16.
  const backgroundInstanceId = ++backgroundInstanceSeq;
  let backgroundLastDebug: string | undefined;

  function backgroundDebugChange(line: string): void {
    if (line === backgroundLastDebug) {
      return;
    }
    backgroundLastDebug = line;
    backgroundDebug(backgroundInstanceId, line);
  }

  pi.events.on(BACKGROUND_RESPONSE_CHANNEL, (value: unknown) => {
    if (!rootSession) return;
    if (!isPlainRecord(value)) return;
    if (value.schema_version !== BACKGROUND_RESPONSE_SCHEMA) return;
    if (typeof value.request_id !== "string" || value.operation !== "status") return;
    if (backgroundRequestId !== undefined && value.request_id !== backgroundRequestId) {
      return;
    }
    backgroundRequestId = undefined;
    const result = value.ok === true ? value.result : undefined;
    const tasks =
      isPlainRecord(result) && Array.isArray(result.tasks) ? result.tasks : [];
    backgroundRunningTaskIds.clear();
    for (const task of tasks) {
      if (isPlainRecord(task) && typeof task.id === "string" && task.status === "running") {
        backgroundRunningTaskIds.add(task.id);
      }
    }
    publishState();
  });

  pi.events.on(BACKGROUND_TERMINAL_CHANNEL, (value: unknown) => {
    if (!rootSession) return;
    if (!isPlainRecord(value)) return;
    if (value.schema_version !== BACKGROUND_TERMINAL_SCHEMA) return;
    const task = value.task;
    if (!isPlainRecord(task) || typeof task.id !== "string") return;
    if (task.status === "running") {
      backgroundRunningTaskIds.add(task.id);
    } else {
      backgroundRunningTaskIds.delete(task.id);
    }
    publishState();
  });

  const backgroundPoll = setInterval(() => {
    if (!rootSession) {
      backgroundDebugChange("idle-skip: not the pane's TUI session");
      return;
    }
    requestBackgroundStatus();
    publishState();
    backgroundDebugChange(
      `poll: desired=${desiredState().state} agentActive=${agentActive} subagents=[${backgroundSubagentStatuses().join(",")}] bgTasks=${backgroundRunningTaskIds.size}`,
    );
  }, BACKGROUND_POLL_MS);
  backgroundPoll.unref?.();

  pi.on("session_shutdown", () => {
    clearInterval(backgroundPoll);
  });
}
