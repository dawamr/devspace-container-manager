# DevSpace MVP Sprint 4

## 🎯 Hypothesis & Metrics

| # | Hypothesis | Primary Metric | Target | Measurement Method |
|---|-----------|---------------|--------|-------------------|
| H1 | User bisa melihat detail container dan logs dalam < 60 detik | Time to view container detail + logs | < 60 detik | PostHog: `container_detail_viewed` dengan duration_ms |
| H2 | Activity log menampilkan stack/container operations dengan benar | Log completeness rate | 100% | PostHog: `activity_log_viewed` + count of log entries |

## 🚀 Sprint Goal

> "Validate bahwa container detail, logs, dan basic dashboard overview + activity log bisa dilihat end-to-end dan metric container-to-detail bisa diukur jelas via PostHog."

### Learning Objective
- Container detail / inspect view
- Container logs display
- Dashboard overview page
- Activity / audit log page
- Basic responsive UI polish

### Out of Scope (Deferred)
- Full container inspect editor
- Advanced logs filtering
- Multi-user demo
- Docker host management

## 📋 Selected Backlog

| # | Story/Fitur | Filter Question Result | Decision |
|---|------------|----------------------|----------|
| 1 | Container Detail / Inspect view | Tanpa detail, tidak lengkap | ✅ IN |
| 2 | Container Logs display | Tanpa logs, tidak ada operational insight | ✅ IN |
| 3 | Dashboard Overview page | Tanpa overview, tidak ada quick view | ✅ IN |
| 4 | Activity / Audit Log page | Tanpa log, tidak bisa audit | ✅ IN |
| 5 | Basic responsive UI polish | Tanpa polish, tidak user-friendly | ✅ IN |
| 6 | PostHog tracking untuk detail + logs | Tanpa measure, tidak bisa belajar | ✅ IN |

## 🔧 Task Breakdown

| # | Task | Story | Est (jam) | Deps | MVP DoD | Risk | Status |
|---|------|-------|-----------|------|---------|------|--------|
| 1 | Container detail / inspect page | Container Detail | 3 | - | Detail view works | Med | To Do |
| 2 | Container logs display with basic filtering | Container Logs | 3 | 1 | Logs show in detail page | Med | To Do |
| 3 | Dashboard overview page (summary cards) | Dashboard | 3 | - | Overview shows projects, containers count, activity | Low | To Do |
| 4 | Activity log page + filtering | Activity Log | 3 | 2 | Logs page accessible and shows data | Med | To Do |
| 5 | Basic responsive UI polish (mobile + desktop) | UI Polish | 2 | 1 | UI works on mobile | Low | To Do |
| 6 | Add PostHog events for container detail and logs | Measure | 1 | 1 | Events logged with duration | Low | To Do |

**Total: 15 jam** (masih di bawah 21 jam buffer)

## ✅ Definition of Done (MVP)
- Container detail dan logs bisa dilihat
- Dashboard overview menampilkan summary
- Activity log page berfungsi
- Metric container-to-detail terukur via PostHog
- Bisa di-demo ke 1 user tanpa error

**Explicitly NOT required:** Production-ready, pixel perfect, full error handling, load testing.

## ⚠️ Risks & Validation Blockers

| # | Risk | Type | Impact | Mitigation |
|---|------|------|--------|-----------|
| 1 | Container logs sangat besar → slow load | Tech | Med | Implement basic log limit dulu |
| 2 | Responsive UI tidak terlihat bagus di mobile | Tech | Low | Gunakan Tailwind + media queries |
| 3 | User tester tidak mau test logs | Validation | High | Siapkan test manual di staging |

## 📖 Learning Log (diisi akhir sprint)

### Per-Hypothesis Findings
| Hypothesis | Verdict | Evidence | Confidence | Next Action |
|-----------|---------|----------|------------|-------------|
| H1: User bisa view container detail + logs < 60 detik | [ ] | [ ] | [ ] | [ ] |
| H2: Activity log lengkap 100% | [ ] | [ ] | [ ] | [ ] |

### Key Learnings
- [ ]

### Surprising Findings
- [ ]

### Decisions for Next Sprint
- [ ] Next sprint: Final polish + MVP testing + documentation

---

**Sprint plan siap.**  
File tersimpan di `docs/sprints/sprint-4.md`

Mau review dulu atau langsung buat Sprint 5 (final MVP testing)?
