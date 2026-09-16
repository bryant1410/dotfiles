# herdr Pi integration — local patch (background work keeps a pane "working")

herdr installs its own Pi extension at `~/.pi/agent/extensions/herdr-agent-state.ts`
and **rewrites it on every update** (`herdr integration install pi`). This
directory holds a patched copy plus an installer, so the patch survives upgrades.

## The bug the patch works around

The stock integration (v9, as of herdr 0.9.1) reports `idle` as soon as the main
agent run settles:

```ts
pi.on("agent_settled", (_event, ctx) => {
  if (!rootSession || ctx?.isIdle?.() !== true) return;
  agentActive = false;
  publishState();          // -> "idle"
});
```

Pi's `ctx.isIdle()` is `!isAgentRunActive && !isCompacting` — it says nothing
about **background work** the session has in flight (background agents via
`pi-subagents`, background tasks via `pi-background-tasks`). So a session that
spawns a background agent, ends its turn, and waits for the completion
notification looks idle for the whole background run.

herdr makes this visible: `herdr agent explain <pane>` reports
`screen_detection_skip_reason: full_lifecycle_hook_authority` for Pi — herdr
trusts the hook completely and **skips screen detection**, so nothing compensates.

Measured on this machine, fresh Pi, subagent doing a foreground `sleep 150`:

| time | stock v9 | patched |
|---|---|---|
| parent's turn ends | `done` | `working` |
| +30 s (agent still sleeping) | `done` | `working` |
| +90 s (agent's session file still being written) | `done` | `working` |
| agent completes (~150 s) | — | `done` |

## What the patch changes

1. `desiredState()` returns `working` when `agentActive` **or** background work is
   pending (`Symbol.for("pi-subagents:manager")` → `hasRunning()` per
   `docs/rpc.md` "The manager registry"; plus a read-only status request on the
   documented `pi-background-tasks` EventBus v1 channels).
2. A 2 s poll re-evaluates that and calls `publishState()` — which dedupes, so
   nothing is sent unless the state actually changes.
3. Background-task terminal events update the running set immediately, and
   `session_shutdown` clears the timer so a `/reload` can't leave two pollers.

Two gotchas that were both real here, and both are handled:

- **Only the pane's own TUI session may publish.** Subagents re-activate the same
  extension *in the same process* (`session.bindExtensions`), so a second instance
  with `rootSession === false` exists. Publishing from it makes two instances with
  independent dedup state fight over one pane — the badge flapped `working`/`done`
  every ~2 s. All patch handlers are gated on `rootSession`.
- **The manager registry has no `listAgents()`.** It exposes
  `waitForAll` / `hasRunning` / `spawn` / `getRecord`. Probing `listAgents()` yields
  `undefined`, i.e. a silent "never busy" — which looked exactly like the original
  bug still being present.

## Debug

`HERDR_PI_PATCH_DEBUG=1 pi` appends one line per state change to
`/tmp/herdr-pi-patch-debug.log` (per extension instance: `inst=N pid=… publish …`,
`poll: desired=… agentActive=… subagents=[…] bgTasks=…`). Set the variable to a
path to log elsewhere.

## Use

```bash
~/.local/bin/herdr-pi-patch          # install / verify
~/.local/bin/herdr-pi-patch --force  # install even if upstream changed
```

Run it after each `herdr update`; if herdr ships a new integration version the
script refuses (the installed file is neither our patch nor the pristine copy)
and tells you to rebase — diff the pristine copy against the newly installed
file, then re-apply the same edits to `herdr-agent-state.patched.ts`.

New Pi sessions pick the patch up immediately; running sessions need `/reload`.

Revert to stock: `cp herdr-agent-state.v9.pristine.ts ~/.pi/agent/extensions/herdr-agent-state.ts`
(or just `herdr integration install pi`).

## Files

- `herdr-agent-state.v9.pristine.ts` — exactly what herdr installed (md5 `c5e0582adbba7fba3bcba83b08274a79`)
- `herdr-agent-state.patched.ts` — the patched extension that gets installed (marker comment `HERDR_PI_PATCH`)
- `apply.sh` — installer with the pristine/marker check

## Provenance and license

Both `.ts` files here are copies of the Pi integration that herdr itself installs:
`herdr-agent-state.v9.pristine.ts` is the unmodified file, `herdr-agent-state.patched.ts`
is that same file with the local patch applied. herdr is public software, licensed
Apache-2.0 — see <https://herdr.dev> and <https://github.com/ogulcancelik/herdr>
(a Homebrew formula also exists). The vendored copies remain under Apache-2.0,
© the herdr authors; this directory is not a redistribution of anything else.
