# DevSpace Sprint 6 — AI Agentic & LLM Tooling

> **Status: PLANNING — detail akan dibahas saat planning session.**
> Sprint ini didefinisikan setelah Sprint 5 (Final MVP) selesai.

## 🎯 Hypothesis & Metrics

| # | Hypothesis | Primary Metric | Target | Measurement Method |
|---|-----------|---------------|--------|-------------------|
| H1 | _TBD — saat planning_ | _TBD_ | _TBD_ | _TBD_ |
| H2 | _TBD — saat planning_ | _TBD_ | _TBD_ | _TBD_ |

## 🚀 Sprint Goal

> _TBD — saat planning_

### Learning Objective
- AI Agentic API service (agent loop + tool execution + streaming)
- LLM tool integration (Python/JS) — tooling layer untuk agent
- Interface-based design untuk migrability (in-process → worker saat perlu)

### Out of Scope (Deferred)
- _TBD — saat planning_

## 📋 Selected Backlog

| # | Story/Fitur | Filter Question Result | Decision |
|---|------------|----------------------|----------|
| 1 | AI Agentic API service (agent loop, SSE streaming, tool dispatch) | Core fitur baru post-MVP | ✅ IN |
| 2 | LLM tool layer (Python/JS) — file R/W, exec, container ops sebagai agent tools | Tanpa tools, agent tidak bisa act | ✅ IN |
| 3 | _TBD — additional stories saat planning_ | | |

## 🔧 Task Breakdown

| # | Task | Story | Est (jam) | Deps | MVP DoD | Risk | Status |
|---|------|-------|-----------|------|---------|------|--------|
| 1 | _TBD — saat planning_ | | | | | | |

## 📐 Design Decisions (preliminary)

### Arsitektur: Opsi A (monolith) dulu, design untuk migrasi

```
TanStack Start (Node.js)
├── UI (React)
├── Server Functions (existing)
│   ├── Container CRUD
│   ├── File patch/browser
│   └── AI Agent (SSE stream) ← Sprint 6
├── AgentRunner interface ← Sprint 6
│   └── InProcessAgentRunner (Fase 1)
│   └── RemoteAgentWorker (Fase 2, post-Sprint 6)
├── LLM Tool Layer ← Sprint 6
│   ├── readFile / writeFile / listFiles
│   ├── execCommand (Docker exec)
│   └── containerOps (start/stop/restart)
└── dockerode → Docker Engine
```

### Migrasi trigger (ke Opsi B — split worker)
- Agent runtime >2 menit (HTTP timeout)
- Multiple agent concurrent (butuh job queue)
- Agent crash mengganggu web app
- Butuh resume/retry setelah crash

### Key principles
- `AgentRunner` interface-based — UI tidak berubah saat swap implementation
- Agent loop I/O bound (LLM API + Docker exec) — tidak block event loop
- SSE streaming untuk real-time output ke UI
- `try/catch` + timeout + process manager untuk crash isolation

## ✅ Definition of Done
- _TBD — saat planning_

## ⚠️ Risks & Validation Blockers

| # | Risk | Type | Impact | Mitigation |
|---|------|------|--------|-----------|
| 1 | Agent loop crash → web app down | Tech | High | try/catch + timeout + PM2/Docker restart |
| 2 | LLM API cost/rate limit | Dependency | Med | Model selection + token budget per run |
| 3 | Agent output tidak deterministic | Validation | Med | Tool validation + human review sebelum apply |

## 📖 Learning Log (diisi akhir sprint)

### Per-Hypothesis Findings
| Hypothesis | Verdict | Evidence | Confidence | Next Action |
|-----------|---------|----------|------------|-------------|
| _TBD_ | | | | |

### Key Learnings
- [ ]

### Surprising Findings
- [ ]

### Decisions for Next Sprint
- [ ]

---

**Sprint 6 dalam fase planning.** Detail task breakdown, hypothesis, dan DoD akan diisi saat planning session.
