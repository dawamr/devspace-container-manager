# DevSpace MVP Sprint 1

## 🎯 Hypothesis & Metrics

| # | Hypothesis | Primary Metric | Target | Measurement Method |
|---|-----------|---------------|--------|-------------------|
| H1 | User baru bisa login dan memilih project + environment dalam < 90 detik tanpa error | Time to complete core flow | < 90 detik | PostHog: `auth_login_completed` + `project_selected` dengan duration_ms |

## 🚀 Sprint Goal

> "Validate bahwa authentication + basic project + environment selection bisa dilakukan end-to-end dalam < 90 detik dan metric login-to-value bisa diukur jelas via PostHog."

### Learning Objective
- Authentication flow paling sederhana yang stabil
- Basic user + project model dengan Drizzle
- Minimal RBAC (Admin/Developer/Viewer)
- Docker Engine connection point pertama

### Out of Scope (Deferred)
- Container management (nanti)
- Stack management (nanti)
- Responsive UI polish
- Activity log lengkap
- Multi-docker host

## 📋 Selected Backlog

| # | Story/Fitur | Filter Question Result | Decision |
|---|------------|----------------------|----------|
| 1 | Authentication (Login/Logout + Session) | Tanpa ini, tidak bisa test project selection | ✅ IN |
| 2 | User Model + Drizzle Migration | Tanpa user, tidak ada auth | ✅ IN |
| 3 | Project CRUD (Create, Read, Update, Delete) | Tanpa project, tidak ada environment selection | ✅ IN |
| 4 | Basic RBAC (Admin/Developer/Viewer roles) | Tanpa RBAC, tidak bisa scale access control | ✅ IN |
| 5 | Protected routes + session check | Tanpa ini, security gap | ✅ IN |
| 6 | PostHog event tracking untuk login flow | Tanpa measure, tidak bisa belajar | ✅ IN |

## 🔧 Task Breakdown

| # | Task | Story | Est (jam) | Deps | MVP DoD | Risk | Status |
|---|------|-------|-----------|------|---------|------|--------|
| 1 | Setup NextAuth.js / Simple session auth + login page | Auth | 3 | - | Login works + redirect to project select | Low | To Do |
| 2 | User model + Drizzle migration + seed admin | User | 2 | - | User table exists + admin seed | Low | To Do |
| 3 | Project CRUD routes + API + basic UI list | Project | 3 | 1 | Create project + list in dashboard | Med | To Do |
| 4 | Basic RBAC permission system (role per user) | RBAC | 2 | 3 | Role field in user + middleware check | Med | To Do |
| 5 | Protected route guard + session middleware | Protected | 2 | 1 | Cannot access /dashboard without login | Low | To Do |
| 6 | Add PostHog events: login_start, login_completed, project_selected | Measure | 1 | 1 | Event sent to PostHog with duration | Low | To Do |

**Total: 13 jam** (masih di bawah 21 jam buffer)

## ✅ Definition of Done (MVP)
- Authentication flow end-to-end (login + logout)
- User creation + project creation berhasil
- Basic dashboard menampilkan list project + environment selector
- Metric login-to-value terukur via PostHog
- Bisa di-demo ke 1 user tanpa error

**Explicitly NOT required:** Production-ready, pixel perfect, full error handling, load testing.

## ⚠️ Risks & Validation Blockers

| # | Risk | Type | Impact | Mitigation |
|---|------|------|--------|-----------|
| 1 | TanStack Start auth setup terlalu berat untuk MVP | Tech | Med | Gunakan simple cookie session dulu, upgrade nanti |
| 2 | Docker socket permission / TCP connection belum dikonfigurasi | Dependency | High | Setup Docker socket access (unix socket / TCP+TLS) sebelum Sprint 2 |
| 3 | User tester tidak mau test auth flow | Validation | High | Siapkan 1-2 teman untuk test login hari ini |

## 📖 Learning Log (diisi akhir sprint)

### Per-Hypothesis Findings
| Hypothesis | Verdict | Evidence | Confidence | Next Action |
|-----------|---------|----------|------------|-------------|
| H1: User bisa login + pilih project < 90 detik | [ ] | [ ] | [ ] | [ ] |

### Key Learnings
- [ ]

### Surprising Findings
- [ ]

### Decisions for Next Sprint
- [ ] Next sprint: Container listing + basic actions

---

**Sprint plan siap.**  
File tersimpan di `docs/sprints/sprint-1.md`
