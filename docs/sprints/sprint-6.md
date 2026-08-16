# DevSpace Sprint 6 — AI Agentic & LLM Tooling

> **Status: IN PROGRESS — implantasi awal selesai (Task 1–8), hardening + testing tersisa (Task 9–10).**
> Sprint ini didefinisikan setelah Sprint 5 (Final MVP) selesai.

## 🎯 Hypothesis & Metrics

| # | Hypothesis | Primary Metric | Target | Measurement Method |
|---|-----------|---------------|--------|-------------------|
| H1 | AI agent dapat membantu developer membaca kode, menjalankan command, dan mengedit file di dalam container tanpa SSH manual | Task completion rate — agent menyelesaikan request user tanpa error | ≥ 70% | PostHog: `agent_session_completed` vs `agent_session_error` per workspace |
| H2 | Agent loop dengan tool dispatch cukup aman untuk dijalankan in-process tanpa mengganggu web app | Web app uptime selama agent session aktif | 100% (zero crash) | Manual test: jalankan agent session, verify web app tetap responsif |

## 🚀 Sprint Goal

Memberikan capability AI agent yang bisa membaca file, menulis file, dan menjalankan command whitelisted di dalam Docker container — semuanya melalui UI DevSpace, dengan RBAC enforcement dan safety guardrails (path containment, exec whitelist, token/tool budget).

### Learning Objective
- AI Agentic API service (agent loop + tool execution + streaming)
- LLM tool integration (TypeScript) — file R/W, exec, container ops sebagai agent tools
- Interface-based design untuk migrability (in-process → worker saat perlu)

### Out of Scope (Deferred)
- `RemoteAgentWorker` (Opsi B — split worker process) — post-Sprint 6
- Agent memory / persistent context across sessions
- Multi-agent orchestration
- Agent workspace provisioning automation (mount setup, container attach)
- `containerOps` tool (start/stop/restart via agent) — deferred to next sprint
- Real SSE streaming (current: array-based event collection, not true stream)
- Automated testing (manual E2E verification untuk sprint ini)

## 📋 Selected Backlog

| # | Story/Fitur | Filter Question Result | Decision |
|---|------------|----------------------|----------|
| 1 | AI Agentic API service (agent loop, SSE streaming, tool dispatch) | Core fitur baru post-MVP | ✅ IN |
| 2 | LLM tool layer (TypeScript) — file R/W, exec sebagai agent tools | Tanpa tools, agent tidak bisa act | ✅ IN |
| 3 | Workspace management (CRUD, mount, assignment) | Agent butuh scoped filesystem access | ✅ IN |
| 4 | Agent session lifecycle (start, send message, cancel) | User butuh kontrol atas agent run | ✅ IN |
| 5 | Agent UI (chat panel, file sidebar, tool call display) | Tanpa UI, agent tidak usable | ✅ IN |
| 6 | containerOps tool (start/stop/restart via agent) | Nice-to-have, bukan blocker for H1/H2 | ⬜ DEFERRED |
| 7 | Real SSE streaming | Array-based collection cukup for MVP | ⬜ DEFERRED |
| 8 | Automated tests | Manual E2E verification cukup for sprint ini | ⬜ DEFERRED |

## 🔧 Task Breakdown

| # | Task | Story | Est (jam) | Deps | MVP DoD | Risk | Status |
|---|------|-------|-----------|------|---------|------|--------|
| 1 | Schema + RBAC: workspaces, mounts, assignments, agent_sessions | 3 | 2 | — | Migration jalan, `WORKSPACES` resource di RBAC constants, seed update | Low | ✅ Done |
| 2 | Domain layer: agent types, exec whitelist, system prompt builder | 1, 2 | 2 | 1 | Types exported, whitelist 40+ commands, prompt contextualized | Low | ✅ Done |
| 3 | Infrastructure: repositories + PathGuard + DockerExec wrapper | 1, 2, 3 | 3 | 1, 2 | Path containment valid, docker exec multiplexed stream handled | Med | ✅ Done |
| 4 | LLM tool layer: readFile, writeFile, listFiles, execCommand + factory | 2 | 3 | 2, 3 | 4 tools terdaftar, Zod v4 toJSONSchema untuk tool schemas | Med | ✅ Done |
| 5 | Env config + workspace CRUD server functions | 3 | 2 | 1 | `LLM_*` + `AGENT_*` env vars, 5 workspace server functions dengan RBAC | Low | ✅ Done |
| 6 | Agent loop + session management server functions | 1, 4 | 4 | 4, 5 | Loop dengan MAX_ITERATIONS=20, tool dispatch, token tracking, abort/cancel | High | ✅ Done |
| 7 | Agent UI components: file sidebar, chat panel, tool call card | 5 | 3 | 6 | 5 components, message rendering, tool call display, cancel button | Med | ✅ Done |
| 8 | Agent page route + dashboard navigation | 5 | 1 | 7 | Route `/dashboard/agent`, workspace selector, sidebar + chat layout | Low | ✅ Done |
| 9 | Hardening: token budget enforcement + tool limit + PostHog events | 1 | 2 | 6 | `AGENT_TOKEN_BUDGET` di-enforce di loop, `AGENT_TOOL_LIMIT` di-enforce, PostHog events (`agent_session_*`) | Med | ✅ Done |
| 10 | E2E manual verification + demo prep | — | 2 | 8, 9 | Agent bisa: baca file, tulis file, jalankan `ls`/`git status`, cancel session, tidak crash web app | Med | ⬜ TODO |

**Total estimasi:** 26 jam (18 jam done, 8 jam tersisa)

## 📐 Design Decisions

### Arsitektur: Opsi A (monolith) dulu, design untuk migrasi

```
TanStack Start (Node.js)
├── UI (React)
│   └── /dashboard/agent — workspace selector + file sidebar + chat panel
├── Server Functions (existing)
│   ├── Container CRUD
│   ├── Stack CRUD
│   └── AI Agent (event-based) ← Sprint 6
├── Agent Loop (run-agent-loop.ts)
│   ├── LLM API call (OpenAI-compatible)
│   ├── Tool dispatch (readFile, writeFile, listFiles, execCommand)
│   └── Session management (start, send, cancel, abort)
├── LLM Tool Layer ← Sprint 6 (DONE)
│   ├── readFile / writeFile / listFiles
│   ├── execCommand (Docker exec, whitelisted)
│   └── containerOps (start/stop/restart) ← DEFERRED
├── Safety Layer ← Sprint 6 (DONE)
│   ├── PathGuard (path containment, symlink escape prevention)
│   ├── ExecWhitelist (40+ commands, forbidden operators)
│   └── Token/Tool budget ← TODO (Task 9)
└── dockerode → Docker Engine
```

### Yang sudah diimplementasi

| Komponen | File(s) | Status |
|----------|---------|--------|
| Schema (4 tables) | `app/shared/db/schema/workspaces.ts` | ✅ |
| RBAC | `app/modules/rbac/domain/constants.ts` (`WORKSPACES` resource) | ✅ |
| Domain types | `app/modules/agent/domain/agent-types.ts` | ✅ |
| Exec whitelist | `app/modules/agent/domain/exec-whitelist.ts` (40+ commands, operator filter) | ✅ |
| System prompt | `app/modules/agent/domain/system-prompt.ts` (contextualized) | ✅ |
| Repositories | `workspace-repository.ts`, `workspace-mount-repository.ts`, `workspace-assignment-repository.ts`, `agent-session-repository.ts` | ✅ |
| PathGuard | `app/modules/agent/infrastructure/path-guard.ts` (containment + symlink check + mount mapping) | ✅ |
| DockerExec | `app/modules/agent/infrastructure/docker-exec.ts` (multiplexed stream handling) | ✅ |
| Tools (4) | `read-file.ts`, `write-file.ts`, `list-files.ts`, `exec-command.ts` + `factory.ts` | ✅ |
| Env config | `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`, `AGENT_TOKEN_BUDGET` (50000), `AGENT_TOOL_LIMIT` (50) | ✅ |
| Workspace CRUD | 5 server functions (create, update, delete, list, get-detail) | ✅ |
| Agent loop | `run-agent-loop.ts` (MAX_ITERATIONS=20, tool dispatch, token tracking) | ✅ |
| Session lifecycle | `start-agent-session.ts`, `send-agent-message.ts`, `cancel-agent-session.ts`, `abort-registry.ts` | ✅ |
| UI components | `workspace-selector.tsx`, `file-sidebar.tsx`, `chat-panel.tsx`, `tool-call-card.tsx`, `container-status.tsx` | ✅ |
| Route | `app/routes/_dashboard.agent.tsx` | ✅ |
| Seed data | Test workspace untuk demo | ✅ |

### Yang belum diimplementasi (gap analysis)

| Gap | Impact | Task | Priority |
|-----|--------|------|----------|
| Token budget tidak di-enforce | Agent bisa konsumsi token tanpa batas | Task 9 | High |
| Tool limit tidak di-enforce | `AGENT_TOOL_LIMIT=50` ada di env tapi `MAX_ITERATIONS=20` hardcoded di loop | Task 9 | High |
| PostHog events belum dipasang | Tidak bisa ukur H1/H2 metrics | Task 9 | High |
| Real SSE streaming | `sendAgentMessageFn` kumpul events di array, return sekaligus — bukan stream | Deferred | Low |
| `containerOps` tool | Agent tidak bisa start/stop/restart container | Deferred | Low |
| Automated tests | Tidak ada unit/integration test untuk agent module | Deferred | Med |

### Migrasi trigger (ke Opsi B — split worker)
- Agent runtime >2 menit (HTTP timeout)
- Multiple agent concurrent (butuh job queue)
- Agent crash mengganggu web app
- Butuh resume/retry setelah crash

### Key principles
- Agent loop I/O bound (LLM API + Docker exec) — tidak block event loop
- Event-based communication (array collection for now, SSE streaming when needed)
- `try/catch` + AbortController untuk cancel isolation
- PathGuard untuk filesystem containment
- ExecWhitelist untuk command safety
- RBAC: `RESOURCES.WORKSPACES` + `ACTIONS.READ` untuk semua agent server functions

## ✅ Definition of Done

### Functional
- [x] User bisa pilih workspace dari dropdown
- [x] User bisa mulai agent session (auto-start saat pilih workspace)
- [x] User bisa kirim message ke agent
- [x] Agent bisa baca file (`readFile` tool)
- [x] Agent bisa tulis file (`writeFile` tool)
- [x] Agent bisa list direktori (`listFiles` tool)
- [x] Agent bisa jalankan command whitelisted (`execCommand` tool)
- [x] Tool call results ditampilkan di UI (`ToolCallCard`)
- [x] User bisa cancel agent session (abort button)
- [x] Session status tracked (active → completed/error/cancelled)

### Safety
- [x] Path containment: agent tidak bisa akses file di luar workspace root
- [x] Exec whitelist: 40+ commands diizinkan, shell operators (`&&`, `||`, `;`, `|`, `>`, `<`, `` ` ``, `$()`) ditolak
- [x] Command length limit: 500 karakter
- [x] RBAC: semua agent server functions melalui `requirePermission`
- [x] Session ownership: user hanya bisa akses session miliknya
- [x] Token budget enforcement: agent stop ketika `tokenUsage > tokenBudget` — pre-check + post-check per iteration
- [x] Tool limit enforcement: `MAX_ITERATIONS = env.AGENT_TOOL_LIMIT` (default 50)

### Observability
- [x] Token usage tracked per session (`agent_sessions.tokenUsage`)
- [x] Tool call count tracked per session (`agent_sessions.toolCallCount`)
- [x] Session status tracked (`active` / `completed` / `error` / `cancelled`)
- [x] PostHog events: `agent_session_started`, `agent_session_completed`, `agent_session_error`, `agent_session_cancelled`, `agent_tool_call`

### Demo Readiness
- [x] Seed data: test workspace tersedia
- [ ] E2E manual verification: agent bisa baca file → tulis file → jalankan `git status` → cancel — **TODO (Task 10)**
- [ ] Web app tidak crash selama agent session aktif — **TODO (Task 10)**

## ⚠️ Risks & Validation Blockers

| # | Risk | Type | Impact | Mitigation | Status |
|---|------|------|--------|-----------|--------|
| 1 | Agent loop crash → web app down | Tech | High | try/catch + AbortController + (future: process manager) | ⚠️ Mitigated — try/catch ada, tapi belum ada timeout per iteration |
| 2 | LLM API cost/rate limit | Dependency | Med | `AGENT_TOKEN_BUDGET` env var (50000) — di-enforce pre+post check per iteration | ✅ Mitigated |
| 3 | Agent output tidak deterministic | Validation | Med | Tool validation + exec whitelist + path containment | ✅ Mitigated |
| 4 | Path escape via symlink | Security | High | `PathGuard.validatePath` + `path.resolve` normalization | ✅ Mitigated |
| 5 | Exec command injection | Security | High | ExecWhitelist + forbidden operators + command length limit | ✅ Mitigated |
| 6 | `sendAgentMessageFn` collect-all events (bukan stream) | UX | Med | Cukup for MVP, return semua events sekaligus | ⚠️ Accepted — deferred to post-Sprint 6 |

## 📖 Learning Log (diisi akhir sprint)

### Per-Hypothesis Findings
| Hypothesis | Verdict | Evidence | Confidence | Next Action |
|-----------|---------|----------|------------|-------------|
| H1 | _TBD — setelah Task 10_ | | | |
| H2 | _TBD — setelah Task 10_ | | | |

### Key Learnings
- [x] Zod v4 `toJSONSchema` bekerja untuk LLM tool definitions — lebih clean dari manual JSON Schema
- [x] Docker exec multiplexed stream butuh 8-byte header parsing (`chunk.slice(8)`) — bukan plain stdout
- [x] `AbortController` + `abort-registry` pattern cukup untuk cancel agent loop

### Surprising Findings
- [x] `sendAgentMessageFn` return events sebagai array, bukan real SSE stream — cukup untuk MVP tapi akan jadi bottleneck untuk long-running agent
- [x] `MAX_ITERATIONS=20` hardcoded di loop padahal `AGENT_TOOL_LIMIT=50` ada di env — perlu disamakan

### Decisions for Next Sprint
- [ ] Pertimbangkan real SSE streaming via `Response` + `ReadableStream` untuk UX lebih baik
- [ ] `containerOps` tool untuk agent bisa start/stop/restart container via natural language
- [ ] Formal `AgentRunner` interface jika butuh swap ke `RemoteAgentWorker`

---

**Sprint 6 in progress.** Task 1–8 selesai (implantasi awal). Task 9–10 (hardening + E2E verification) tersisa.
