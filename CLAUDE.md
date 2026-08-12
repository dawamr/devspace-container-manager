# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

**DevSpace** adalah internal developer platform (hobby/internal project, bukan commercial SaaS) untuk mengelola Docker container dan Compose stack melalui Portainer CE, dengan dashboard custom yang lebih sesuai workflow tim.

Prinsip inti: **DevSpace adalah application layer, Portainer adalah infrastructure control layer.** DevSpace tidak mengakses Docker Engine secara langsung — seluruh operasi container/stack dilakukan via Portainer CE API.

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
| Infrastructure API | Portainer CE API |
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
  └── Portainer Client → Portainer CE → Docker
```

**Browser tidak boleh mengakses Portainer API secara langsung.** Semua operasi sensitif harus melalui Server Functions dengan authentication dan authorization di server-side.

Environment variables yang hanya boleh ada di server-side:
- `PORTAINER_URL`
- `PORTAINER_API_KEY`
- `DATABASE_URL`
- `SESSION_SECRET`

## Domain Model

```
User
  └── Membership
        └── Project
              ├── Environment (→ Portainer Endpoint)
              └── Stack (→ Portainer Stack → Containers)
```

**Source of truth:**
- PostgreSQL: User, Role, Permission, Project, Membership, Environment mapping, Audit log
- Docker/Portainer: Container state, Container logs, Stack state, Compose deployment

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

## Database Schema

```
users, roles, permissions, role_permissions,
projects, project_members,
environments, stacks, audit_logs, sessions
```

## MVP Navigation & User Flow

Primary flow: Login → Dashboard → Projects → Select Project → Select Environment → View Stacks/Containers → Actions

Navigation structure: Dashboard | Projects | Infrastructure (Portainer Environments) | Administration (Users, Roles, Audit Logs)

## Development Principles

- **Server-side first untuk operasi sensitif**: UI → Server Function → Authorization → Service → DB/Portainer API
- **Jangan buat abstraction sebelum dibutuhkan**: hindari API gateway, queue, worker, service layer tambahan untuk MVP
- **Gunakan Portainer API** untuk semua container/stack/image/volume/network operations — jangan akses Docker Engine langsung
- **PostHog untuk analytics**: track event penting seperti `auth_login_completed`, `project_selected`, `stack_deploy_completed`

## Sprint Structure

Sprint selesai di Sprint 5 (Final MVP). Setiap sprint punya hypothesis yang diukur via PostHog:/
- Sprint 1: Auth + Project selection (< 90 detik)
- Sprint 2: Container listing + actions
- Sprint 3: Stack creation + deploy (< 120 detik)
- Sprint 4: Dashboard + activity log
- Sprint 5: Full integration + UI polish + demo readiness

Referensi sprint ada di `docs/sprints/sprint-{1-5}.md`. Spesifikasi lengkap ada di `Porjects.md`.
