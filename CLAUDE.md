# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

**DevSpace** adalah internal developer platform (hobby/internal project, bukan commercial SaaS) untuk mengelola Docker container dan Compose stack melalui Docker Engine API, dengan dashboard custom yang lebih sesuai workflow tim.

Prinsip inti: **DevSpace adalah application layer, Docker Engine adalah infrastructure control layer.** DevSpace mengakses Docker Engine API secara langsung (via unix socket atau TCP+TLS) — seluruh operasi container/stack dilakukan via Docker Engine API. RBAC, auth, dan authorization di-handle di application layer (TanStack Start server functions), bukan di infrastructure layer.

## Tech Stack

| Layer | Technology |
|---|---|
| Full-stack Framework | TanStack Start |
| UI | React + Tailwind CSS + shadcn/ui |
| Language | TypeScript |
| Routing | TanStack Router |
| Server State | TanStack Query |
| Tables | TanStack Table |
| Validation | Zod |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Infrastructure API | Docker Engine API (dockerode) |
| Compose Orchestration | Docker Compose v2 (CLI exec) |
| Analytics | PostHog |
| Runtime | Node.js |

## Architecture

Single-application monolith. Tidak ada backend service terpisah.

```
Browser
  ↓
TanStack Start (React UI + Server Functions)
  ↓
Domain Layer (Auth, Authorization, Service)
  ├── Drizzle ORM → PostgreSQL
  └── Docker Engine Client (dockerode) → Docker Engine (socket/TCP+TLS)
```

**Browser tidak boleh mengakses Docker Engine API secara langsung.** Semua operasi sensitif harus melalui Server Functions dengan authentication dan authorization di server-side.

Environment variables yang hanya boleh ada di server-side:
- `DOCKER_HOST` (unix socket path atau TCP URL)
- `DOCKER_CERT_PATH` (opsional, untuk TLS)
- `DATABASE_URL`
- `SESSION_SECRET`

## Domain Model

```
User
  └── Membership
        └── Project
              ├── Environment (→ Docker Host)
              └── Stack (→ Docker Compose Project → Containers)
```

**Source of truth:**
- PostgreSQL: User, Role, Permission, Project, Membership, Environment mapping, Audit log
- Docker Engine: Container state, Container logs, Stack state, Compose deployment

Jangan mereplikasi Docker state ke PostgreSQL. Database hanya menyimpan metadata dan relationship yang diperlukan DevSpace.

## RBAC

Tiga role: `Admin`, `Developer`, `Viewer`.

| Resource | Admin | Developer | Viewer |
|---|---|---|---|
| Users | CRUD | — | — |
| Projects | CRUD | Read | Read |
| Environments | CRUD | Read | Read |
| Stacks | CRUD | CRUD | Read |
| Containers | CRUD | CRUD | Read |
| Logs | Read | Read | Read |

RBAC di-enforce di application layer (TanStack Start server functions), bukan di Docker Engine. Docker Engine tidak punya konsep RBAC — akses ke socket/TCP = full access. Authorization check wajib sebelum setiap call ke Docker Engine API.

## Database Schema

```
users, roles, permissions, role_permissions,
projects, project_members,
environments, stacks, audit_logs, sessions
```

## MVP Navigation & User Flow

Primary flow: Login → Dashboard → Projects → Select Project → Select Environment → View Stacks/Containers → Actions

Navigation structure: Dashboard | Projects | Infrastructure (Docker Hosts) | Administration (Users, Roles, Audit Logs)

## Development Principles

- **Server-side first untuk operasi sensitif**: UI → Server Function → Authorization → Service → DB/Docker Engine API
- **Jangan buat abstraction sebelum dibutuhkan**: hindari API gateway, queue, worker, service layer tambahan untuk MVP
- **Gunakan Docker Engine API** (dockerode) untuk semua container/image/volume/network operations
- **Gunakan Docker Compose v2** untuk stack deploy/update (`docker compose up -d` / `docker compose down`)
- **RBAC di application layer**: setiap Docker Engine API call harus melalui authorization check di server function
- **PostHog untuk analytics**: track event penting seperti `auth_login_completed`, `project_selected`, `stack_deploy_completed`

## Sprint Structure

Sprint 1–5 (Final MVP) selesai. Sprint 6 (AI Agentic & LLM Tooling) dalam fase planning.
- Sprint 1: Auth + Project selection (< 90 detik)
- Sprint 2: Container listing + actions
- Sprint 3: Stack creation + deploy (< 120 detik)
- Sprint 4: Dashboard + activity log
- Sprint 5: Full integration + UI polish + demo readiness
- Sprint 6: AI Agentic API service + LLM tool layer (Python/JS) — _planning_

Referensi sprint ada di `docs/sprints/sprint-{1-6}.md`. Spesifikasi lengkap ada di `Porjects.md`.
