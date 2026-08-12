# DevSpace MVP Sprint 3

## 🎯 Hypothesis & Metrics

| # | Hypothesis | Primary Metric | Target | Measurement Method |
|---|-----------|---------------|--------|-------------------|
| H1 | User bisa membuat dan deploy simple Docker Compose stack dalam < 120 detik | Time to deploy stack | < 120 detik | PostHog: `stack_deploy_completed` dengan duration_ms |
| H2 | Stack yang sudah di-deploy muncul di list dan bisa di-update | Success rate of stack operations | 100% | PostHog: `stack_deploy_success`, `stack_update_success` |

## 🚀 Sprint Goal

> "Validate bahwa basic stack creation, compose configuration dan deploy/update bisa dilakukan end-to-end dan metric stack deploy bisa diukur jelas via PostHog."

### Learning Objective
- Stack model dengan Docker Compose configuration
- Simple compose editor / upload
- Stack deploy dan update via Portainer API
- Basic activity log untuk stack operations

### Out of Scope (Deferred)
- Stack detail/inspect
- Advanced compose editor
- Multi-stack management
- Full activity log
- Dashboard polish

## 📋 Selected Backlog

| # | Story/Fitur | Filter Question Result | Decision |
|---|------------|----------------------|----------|
| 1 | Stack Model + CRUD + Compose config | Tanpa stack, tidak ada deploy | ✅ IN |
| 2 | Simple Docker Compose editor / upload | Tanpa editor, tidak ada deploy | ✅ IN |
| 3 | Stack Deploy / Update API | Tanpa deploy, tidak ada operational value | ✅ IN |
| 4 | Basic activity log untuk stack | Tanpa log, tidak bisa audit | ✅ IN |
| 5 | Portainer Stack integration | Tanpa integration, tidak bisa deploy | ✅ IN |
| 6 | PostHog tracking untuk stack deploy | Tanpa measure, tidak bisa belajar | ✅ IN |

## 🔧 Task Breakdown

| # | Task | Story | Est (jam) | Deps | MVP DoD | Risk | Status |
|---|------|-------|-----------|------|---------|------|--------|
| 1 | Stack model + Drizzle migration + CRUD API | Stack | 3 | - | Stack table + create/read | Low | To Do |
| 2 | Simple compose editor (textarea + preview) | Compose | 3 | 1 | User bisa input compose dan save | Med | To Do |
| 3 | Stack deploy/update via Portainer API | Deploy | 3 | 2 | Deploy works and stack appears in list | Med | To Do |
| 4 | Basic activity log for stack operations | Activity | 2 | 1 | Log entries created for deploy | Low | To Do |
| 5 | Error handling for stack deploy | Error | 2 | 3 | API error shows message | Low | To Do |
| 6 | Add PostHog events for stack deploy and update | Measure | 1 | 1 | Events logged with duration | Low | To Do |

**Total: 14 jam** (masih di bawah 21 jam buffer)

## ✅ Definition of Done (MVP)
- Stack creation dan compose config berhasil
- Stack bisa di-deploy dan muncul di list
- Basic activity log untuk deploy
- Metric stack deploy terukur via PostHog
- Bisa di-demo ke 1 user tanpa error

**Explicitly NOT required:** Production-ready, pixel perfect, full error handling, load testing.

## ⚠️ Risks & Validation Blockers

| # | Risk | Type | Impact | Mitigation |
|---|------|------|--------|-----------|
| 1 | Portainer Stack API permission terbatas | Dependency | High | Setup dengan user yang punya akses stack |
| 2 | Compose editor terlalu sederhana | Tech | Med | Gunakan textarea biasa dulu |
| 3 | User tester tidak mau test deploy | Validation | High | Siapkan test manual di staging |

## 📖 Learning Log (diisi akhir sprint)

### Per-Hypothesis Findings
| Hypothesis | Verdict | Evidence | Confidence | Next Action |
|-----------|---------|----------|------------|-------------|
| H1: User bisa deploy stack < 120 detik | [ ] | [ ] | [ ] | [ ] |
| H2: Stack operation success rate 100% | [ ] | [ ] | [ ] | [ ] |

### Key Learnings
- [ ]

### Surprising Findings
- [ ]

### Decisions for Next Sprint
- [ ] Next sprint: Dashboard overview + activity log polish + container detail

---

**Sprint plan siap.**  
File tersimpan di `docs/sprints/sprint-3.md`

Mau review dulu atau langsung buat Sprint 4?