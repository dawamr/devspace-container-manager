# DevSpace — Project Overview

## 1. Project Overview

**DevSpace** adalah internal developer platform untuk mengelola application/container environment berbasis Docker melalui **Portainer CE**, dengan dashboard custom yang lebih sederhana dan sesuai workflow tim.

Project ini merupakan **hobby / internal project**, bukan commercial SaaS. Fokus utama adalah menyediakan satu dashboard ringan untuk:

* melihat environment Docker
* mengelola container
* mengelola Docker Compose / Stack
* melihat logs dan status service
* mengelola project internal
* menyediakan fondasi multi-user dan RBAC
* mengurangi kebutuhan membuka UI Portainer secara langsung

### Core Principle

> **DevSpace menjadi application layer, Portainer menjadi infrastructure control layer.**

DevSpace tidak menggantikan Docker atau Portainer. DevSpace menyediakan UX, project organization, authentication, authorization, dan workflow yang lebih sesuai kebutuhan tim.

---

# 2. Goals

## MVP Goals

* [ ] Custom web dashboard untuk Docker environment
* [ ] Authentication user
* [ ] Basic user management
* [ ] Basic RBAC
* [ ] Project management
* [ ] Portainer environment management
* [ ] Container listing dan detail
* [ ] Container start / stop / restart
* [ ] Container logs
* [ ] Stack listing
* [ ] Stack detail
* [ ] Deploy / update Docker Compose stack
* [ ] Basic dashboard overview
* [ ] Basic activity/audit log
* [ ] Responsive UI
* [ ] Single Docker host / Portainer instance sebagai target awal

## Success Criteria

MVP dianggap berhasil apabila developer dapat melakukan workflow utama tanpa membuka Portainer secara langsung:

```text
Login
  ↓
Select Project
  ↓
Select Environment
  ↓
View Services
  ↓
Inspect Container
  ├── Status
  ├── Logs
  └── Actions
  ↓
Deploy / Restart / Stop
```

---

# 3. Non-Goals

MVP **tidak** bertujuan menjadi replacement penuh untuk:

* Dokploy
* Coolify
* Portainer
* Kubernetes dashboard
* full CI/CD platform
* cloud infrastructure manager
* billing platform
* commercial multi-tenant SaaS

Tidak termasuk MVP:

* Kubernetes
* Docker Swarm orchestration
* automatic server provisioning
* GitHub/GitLab OAuth
* billing
* subscription
* public self-service registration
* marketplace
* automatic DNS management
* automatic SSL provisioning
* advanced monitoring
* alerting system
* distributed worker architecture

---

# 4. Tech Stack

## Application

| Layer                | Technology       |
| -------------------- | ---------------- |
| Full-stack Framework | TanStack Start   |
| UI                   | React            |
| Language             | TypeScript       |
| Routing              | TanStack Router  |
| Server State         | TanStack Query   |
| Tables               | TanStack Table   |
| Styling              | Tailwind CSS     |
| UI Components        | shadcn/ui        |
| Validation           | Zod              |
| Database             | PostgreSQL       |
| ORM                  | Drizzle ORM      |
| Infrastructure API   | Portainer CE API |
| Runtime              | Node.js          |
| Container Runtime    | Docker           |

## Architecture Philosophy

MVP menggunakan **single application architecture**.

```text
TanStack Start
├── React UI
├── TanStack Router
├── TanStack Query
├── Server Functions / Server Routes
├── Authentication
├── Authorization
├── Domain Logic
├── Drizzle ORM
└── Portainer Client
       │
       ├── PostgreSQL
       └── Portainer CE
              │
              ▼
           Docker
```

Tidak diperlukan backend service terpisah seperti:

```text
React → FastAPI
React → NestJS
React → Go Fiber
```

selama kebutuhan MVP masih dapat ditangani dengan TanStack Start.

---

# 5. System Architecture

```text
┌─────────────────────────────────────┐
│             DevSpace                │
│                                     │
│  React + TanStack Start             │
│                                     │
│  ┌──────────┐  ┌─────────────────┐ │
│  │   UI     │  │ Server Functions │ │
│  └────┬─────┘  └────────┬────────┘ │
│       │                 │          │
│       │          ┌──────▼───────┐  │
│       │          │ Domain Layer │  │
│       │          └──────┬───────┘  │
│       │                 │          │
│       │       ┌─────────┴────────┐ │
│       │       ▼                  ▼ │
│       │  ┌──────────┐     ┌──────────┐
│       │  │ Drizzle  │     │Portainer │
│       │  │   ORM    │     │  Client  │
│       │  └────┬─────┘     └────┬─────┘
│       │       │                │
└───────┼───────┼────────────────┼─────┘
        │       ▼                ▼
        │  PostgreSQL       Portainer CE
        │                         │
        │                         ▼
        │                      Docker
        │
        ▼
      Browser
```

---

# 6. Core Domain

MVP menggunakan domain model sederhana:

```text
User
  │
  └── Membership
        │
        ▼
      Project
        │
        ├── Environment
        │      │
        │      └── Portainer Endpoint
        │
        └── Stack
               │
               └── Containers
```

### Project

Logical grouping untuk application/service tertentu.

Contoh:

```text
Projects
├── AI Platform
├── Internal Tools
├── Monitoring
└── Dev Infrastructure
```

### Environment

Representasi deployment environment yang terhubung dengan Portainer Endpoint.

Contoh:

```text
AI Platform
├── Development
├── Staging
└── Production
```

### Stack

Docker Compose application yang dikelola melalui Portainer.

### Container

Runtime service yang berjalan di Docker.

---

# 7. MVP Feature Scope

## 7.1 Authentication

Minimal:

* Login
* Logout
* Session
* Current user
* Protected routes

MVP tidak membutuhkan public registration.

User dapat dibuat oleh administrator.

---

## 7.2 Users

Admin dapat:

* melihat user
* membuat user
* mengaktifkan / menonaktifkan user
* memberikan role
* melihat project membership

---

## 7.3 RBAC

MVP menggunakan role sederhana:

```text
Admin
Developer
Viewer
```

### Admin

Full access.

```text
Users        CRUD
Projects     CRUD
Environment  CRUD
Stacks       CRUD
Containers   CRUD
Logs         Read
```

### Developer

Infrastructure operation tanpa user administration.

```text
Users        -
Projects     Read
Environment  Read
Stacks       CRUD
Containers   CRUD
Logs         Read
```

### Viewer

Read-only.

```text
Users        -
Projects     Read
Environment  Read
Stacks       Read
Containers   Read
Logs         Read
```

Permission dapat berkembang menjadi granular pada fase berikutnya.

---

# 8. Project Management

Dashboard project:

```text
Projects
├── Name
├── Description
├── Environment count
├── Stack count
├── Container count
└── Last activity
```

Project detail:

```text
Project
├── Overview
├── Environments
├── Stacks
├── Containers
├── Activity
└── Settings
```

---

# 9. Portainer Integration

DevSpace menggunakan Portainer API sebagai infrastructure integration layer.

```text
DevSpace
    │
    ▼
Portainer Client
    │
    ├── Endpoints
    ├── Containers
    ├── Images
    ├── Networks
    ├── Volumes
    └── Stacks
```

DevSpace menyimpan **reference/configuration** terhadap Portainer, bukan mengambil alih Docker state.

Contoh:

```text
PostgreSQL
└── environment
      ├── name
      ├── portainerEndpointId
      └── projectId
```

Docker resources tetap menjadi source of truth di Portainer/Docker.

---

# 10. Container Management

MVP menyediakan:

### Read

* container name
* image
* status
* ports
* created time
* environment/project
* container ID

### Actions

* Start
* Stop
* Restart

### Inspection

* logs
* basic container details

MVP tidak menyediakan:

* container shell
* live resource metrics
* advanced inspect editor
* arbitrary Docker API access

---

# 11. Stack Management

MVP menyediakan:

```text
Stack
├── List
├── Detail
├── Compose configuration
├── Deploy
├── Update
└── Delete
```

Workflow:

```text
Project
  ↓
Environment
  ↓
Stack
  ↓
Compose
  ↓
Portainer API
  ↓
Docker
```

Compose editor dapat menggunakan basic YAML editor pada MVP.

---

# 12. Dashboard

Dashboard utama menampilkan summary:

```text
┌──────────────────────────────────────┐
│ Projects          4                  │
│ Environments      3                  │
│ Stacks            12                 │
│ Containers        38                 │
└──────────────────────────────────────┘

Containers
├── Running
├── Stopped
└── Unhealthy

Recent Activity
├── Stack deployed
├── Container restarted
└── User login
```

Dashboard harus fokus pada **operational visibility**, bukan advanced monitoring.

---

# 13. Activity / Audit Log

MVP menyimpan aktivitas penting:

```text
User logged in
Project created
Project updated
Environment created
Stack deployed
Stack updated
Stack deleted
Container started
Container stopped
Container restarted
```

Contoh:

```text
2026-08-12 13:40
dawam
Restarted container
api-dev
Project: Internal Tools
```

Audit log digunakan untuk traceability, bukan analytics.

---

# 14. Database Overview

PostgreSQL menjadi source of truth untuk application state.

Minimal schema:

```text
users
roles
permissions
role_permissions
projects
project_members
environments
stacks
audit_logs
sessions
```

Relasi utama:

```text
User
 │
 ├── Role
 │
 └── ProjectMember
         │
         ▼
       Project
         │
         └── Environment
                │
                └── Portainer Endpoint
```

Docker resources tidak perlu direplikasi ke database.

---

# 15. Source of Truth

| Data                | Source of Truth    |
| ------------------- | ------------------ |
| User                | PostgreSQL         |
| Role                | PostgreSQL         |
| Permission          | PostgreSQL         |
| Project             | PostgreSQL         |
| Project membership  | PostgreSQL         |
| Environment mapping | PostgreSQL         |
| Audit log           | PostgreSQL         |
| Container state     | Docker / Portainer |
| Container logs      | Docker / Portainer |
| Stack state         | Docker / Portainer |
| Compose deployment  | Portainer / Docker |

Prinsip:

> **Jangan menyimpan state Docker yang tidak diperlukan di PostgreSQL.**

Database hanya menyimpan metadata dan relationship yang diperlukan DevSpace.

---

# 16. Security Model

Browser **tidak boleh mengakses Portainer API secara langsung**.

Gunakan:

```text
Browser
   │
   ▼
TanStack Start Server
   │
   ├── Authentication
   ├── Authorization
   ├── Validation
   └── Audit
          │
          ▼
    Portainer API
```

Portainer credentials/API token hanya berada di server-side environment.

Contoh:

```text
PORTAINER_URL
PORTAINER_API_KEY
DATABASE_URL
SESSION_SECRET
```

Tidak boleh dikirim ke browser.

---

# 17. MVP Navigation

```text
Dashboard

Projects
├── Project Overview
├── Environments
├── Stacks
├── Containers
└── Activity

Infrastructure
└── Portainer Environments

Administration
├── Users
├── Roles
└── Audit Logs
```

Navigation harus mengikuti konsep **Project First**, bukan infrastructure-first.

---

# 18. MVP User Flow

### Developer

```text
Login
  ↓
Dashboard
  ↓
Projects
  ↓
Select Project
  ↓
Select Environment
  ↓
View Stack
  ↓
View Containers
  ↓
Inspect Logs
  ↓
Restart Container
```

### Admin

```text
Login
  ↓
Dashboard
  ↓
Projects / Users
  ↓
Manage Project
  ↓
Assign Developer
  ↓
Configure Environment
  ↓
Deploy Stack
```

---

# 19. Deployment

MVP dapat dijalankan sebagai satu container:

```text
Docker Host
│
├── DevSpace
│    └── TanStack Start
│
├── PostgreSQL
│
└── Portainer CE
```

Contoh topology:

```text
                    Internet / LAN
                          │
                          ▼
                     Reverse Proxy
                          │
                          ▼
                     DevSpace App
                     :3000
                       │   │
               ┌───────┘   └───────┐
               ▼                   ▼
          PostgreSQL          Portainer CE
                                   │
                                   ▼
                              Docker Engine
```

Untuk MVP, tidak diperlukan:

* Kubernetes
* Docker Swarm
* message broker
* Redis
* separate API server
* worker service

---

# 20. Development Principles

## Keep It Simple

Jangan membuat abstraction sebelum dibutuhkan.

```text
MVP
TanStack Start
      │
      ├── PostgreSQL
      └── Portainer
```

Bukan:

```text
Frontend
   ↓
API Gateway
   ↓
Backend
   ↓
Service Layer
   ↓
Queue
   ↓
Worker
   ↓
Infrastructure Service
```

---

## Server-side First for Sensitive Operations

Semua operasi yang membutuhkan credential atau authorization harus melalui server.

```text
UI
 ↓
Server Function
 ↓
Authorization
 ↓
Service
 ↓
External API / DB
```

---

## Portainer as Infrastructure Boundary

Jangan membuat Docker management layer sendiri pada MVP.

Gunakan Portainer API untuk:

```text
Container
Stack
Image
Volume
Network
Endpoint
Logs
```

Jika Portainer sudah menyediakan functionality yang diperlukan, gunakan API tersebut daripada mengakses Docker Engine secara langsung.

---

# 21. MVP Roadmap

## Phase 1 — Foundation

* [ ] TanStack Start setup
* [ ] PostgreSQL setup
* [ ] Drizzle setup
* [ ] Authentication
* [ ] Base UI
* [ ] Layout/navigation

## Phase 2 — RBAC

* [ ] User
* [ ] Role
* [ ] Permission
* [ ] Project membership
* [ ] Authorization middleware

## Phase 3 — Portainer

* [ ] Portainer client
* [ ] Endpoint discovery
* [ ] Container listing
* [ ] Container detail
* [ ] Container actions
* [ ] Logs

## Phase 4 — Projects & Stacks

* [ ] Projects
* [ ] Environments
* [ ] Stack listing
* [ ] Stack detail
* [ ] Compose deployment
* [ ] Stack update

## Phase 5 — Dashboard & Audit

* [ ] Dashboard summary
* [ ] Recent activity
* [ ] Audit log
* [ ] Error handling
* [ ] Empty states
* [ ] Loading states

## Phase 6 — Deployment

* [ ] Dockerfile
* [ ] Docker Compose
* [ ] Environment configuration
* [ ] Production build
* [ ] Backup PostgreSQL

---

# 22. Post-MVP Ideas

Features berikut sengaja ditunda:

### Infrastructure

* [ ] Multiple Portainer instances
* [ ] Multiple Docker hosts
* [ ] Docker metrics
* [ ] CPU / memory monitoring
* [ ] Container terminal
* [ ] Resource limits

### Deployment

* [ ] Git repository integration
* [ ] Git-based deployment
* [ ] Deployment history
* [ ] Rollback
* [ ] Environment variables management
* [ ] Secrets management

### Collaboration

* [ ] Comments
* [ ] Notifications
* [ ] Activity feed
* [ ] Team-level permissions

### Advanced RBAC

```text
Organization
  └── Project
       └── Environment
            └── Stack
                 └── Container
```

Permission dapat diberikan pada resource tertentu apabila memang dibutuhkan.

---

# 23. Architecture Evolution

MVP dimulai sebagai monolith:

```text
                    DevSpace
                       │
              TanStack Start
                 /         \
                /           \
         PostgreSQL      Portainer
                            │
                            ▼
                          Docker
```

Jika project berkembang, architecture dapat berevolusi menjadi:

```text
                     DevSpace
                        │
                ┌───────┴────────┐
                │                │
             Web App          API Layer
                │                │
                └───────┬────────┘
                        │
                Infrastructure
                     Service
                        │
                  ┌─────┴─────┐
                  ▼           ▼
             Portainer      Docker
```

Tidak ada kebutuhan untuk melakukan premature microservices.

---

# 24. MVP Definition

DevSpace MVP adalah:

> **A lightweight internal developer dashboard built with TanStack Start that provides project-oriented management of Docker workloads through Portainer CE, with basic authentication, RBAC, stack/container operations, and audit logging.**

Core stack:

```text
TanStack Start
       │
       ├── React
       ├── TanStack Router
       ├── TanStack Query
       ├── Server Functions
       └── Drizzle ORM
              │
              ▼
         PostgreSQL
              │
              │
       Portainer Client
              │
              ▼
         Portainer CE
              │
              ▼
            Docker
```

### MVP Priority

```text
P0 — Must Have
├── Authentication
├── RBAC
├── Projects
├── Environments
├── Containers
├── Container actions
├── Container logs
├── Stacks
└── Portainer integration

P1 — Should Have
├── Dashboard
├── Audit logs
└── Better project overview

P2 — Later
├── Git deployment
├── Monitoring
├── Terminal
├── Notifications
└── Advanced RBAC
```

**Guiding rule:**

> **Build the smallest useful control plane over Portainer. Do not rebuild Portainer, Docker, or a commercial PaaS.**
