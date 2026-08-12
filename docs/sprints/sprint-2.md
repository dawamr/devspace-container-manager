# DevSpace MVP Sprint 2

## 🎯 Hypothesis & Metrics

| # | Hypothesis | Primary Metric | Target | Measurement Method |
|---|-----------|---------------|--------|-------------------|
| H1 | User bisa memilih environment dan melihat list container dalam < 45 detik tanpa error | Time to complete environment + container list flow | < 45 detik | PostHog: `environment_selected` + `container_list_viewed` dengan duration_ms |
| H2 | Container action (start/stop) berhasil tanpa crash | Success rate of container actions | 100% | PostHog: `container_start_success`, `container_stop_success` |

## 🚀 Sprint Goal

> "Validate bahwa environment selection + basic container listing dan simple actions (start/stop) bisa dilakukan end-to-end dan metric environment-to-container bisa diukur jelas via PostHog."

### Learning Objective
- Environment model + Portainer endpoint connection
- Basic container read/list + actions
- Integration ke Portainer API
- Error handling untuk API failure

### Out of Scope (Deferred)
- Stack management
- Container detail/inspect
- Logs full
- Multi-environment switching
- RBAC extension

## 📋 Selected Backlog

| # | Story/Fitur | Filter Question Result | Decision |
|---|------------|----------------------|----------|
| 1 | Environment Model + CRUD | Tanpa environment, tidak bisa pilih environment | ✅ IN |
| 2 | Portainer Endpoint connection (API key) | Tanpa koneksi Portainer, tidak bisa ambil data container | ✅ IN |
| 3 | Container Listing + basic UI | Tanpa list container, tidak ada core value | ✅ IN |
| 4 | Container Start / Stop / Restart | Tanpa action, tidak ada operational value | ✅ IN |
| 5 | Basic error handling untuk Portainer API | Tanpa error handling, tidak stabil | ✅ IN |
| 6 | PostHog tracking untuk container actions | Tanpa measure, tidak bisa belajar | ✅ IN |

## 🔧 Task Breakdown

| # | Task | Story | Est (jam) | Deps | MVP DoD | Risk | Status |
|---|------|-------|-----------|------|---------|------|--------|
| 1 | Environment model + Drizzle migration + CRUD API | Environment | 3 | - | Environment table + create/read | Low | To Do |
| 2 | Portainer Client setup + API key storage | Portainer | 2 | - | Can connect and list containers | Med | To Do |
| 3 | Container list page + TanStack Table | Container List | 3 | 2 | List container shows in dashboard | Med | To Do |
| 4 | Container start/stop/restart action | Container Action | 3 | 3 | Start/stop works via API | Med | To Do |
| 5 | Basic error handling + retry for Portainer API | Error Handling | 2 | 2 | API error shows user-friendly message | Low | To Do |
| 6 | Add PostHog events for environment select + container actions | Measure | 1 | 1 | Events logged with duration | Low | To Do |

**Total: 14 jam** (masih di bawah 21 jam buffer)

## ✅ Definition of Done (MVP)
- Environment creation dan selection berhasil
- List container menampilkan data dari Portainer
- Container start/stop/restart berfungsi
- Metric environment-to-container terukur via PostHog
- Bisa di-demo ke 1 user tanpa error

**Explicitly NOT required:** Production-ready, pixel perfect, full error handling, load testing.

## ⚠️ Risks & Validation Blockers

| # | Risk | Type | Impact | Mitigation |
|---|------|------|--------|-----------|
| 1 | Portainer API key belum dikonfigurasi di environment | Dependency | High | Setup API key manual dulu |
| 2 | TanStack Table pagination/loading state terlalu kompleks | Tech | Med | Gunakan simple table dulu |
| 3 | User tester tidak mau test container action | Validation | High | Siapkan test manual di staging |

## 📖 Learning Log (diisi akhir sprint)

### Per-Hypothesis Findings
| Hypothesis | Verdict | Evidence | Confidence | Next Action |
|-----------|---------|----------|------------|-------------|
| H1: User bisa pilih environment + list container < 45 detik | [ ] | [ ] | [ ] | [ ] |
| H2: Container action berhasil 100% | [ ] | [ ] | [ ] | [ ] |

### Key Learnings
- [ ]

### Surprising Findings
- [ ]

### Decisions for Next Sprint
- [ ] Next sprint: Container detail + basic logs + stack listing

---

**Sprint plan siap.**  
File tersimpan di `docs/sprints/sprint-2.md`

Mau review dulu atau langsung lanjut ke Sprint 3?