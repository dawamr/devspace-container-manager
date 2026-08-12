# TanStack Start Scaffolding — Modular Monolith + Clean Architecture

## Context

DevSpace masih dalam fase spesifikasi (lihat `Porjects.md` dan `docs/sprints/sprint-{1-5}.md`). Belum ada kode. Tahap ini adalah **inisiasi project** — scaffolding TanStack Start dan struktur folder dasar — bukan implementasi fitur. Implementasi fitur (auth, user CRUD, project CRUD) menyusul di implementation plan Sprint 1 terpisah.

Prinsip yang mengikat desain ini (dari `CLAUDE.md`):
- Server-side first untuk operasi sensitif
- Jangan buat abstraction sebelum dibutuhkan (YAGNI)
- Portainer API sebagai satu-satunya jalur ke Docker Engine
- Jangan replikasi Docker state ke PostgreSQL

## Goal

Menyiapkan skeleton project TanStack Start yang bisa `pnpm dev`, dengan struktur folder modular monolith + clean architecture yang siap diisi fitur Sprint 1 (auth, users, projects, RBAC), tanpa menulis logic bisnis atau skema DB nyata di tahap ini.

## Decisions

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Package manager | pnpm | Standar de-facto TanStack Start modern, disk-efficient |
| Source root | `app/` (tanpa `src/`) | Konvensi starter TanStack Start terbaru |
| Module scope awal | `auth`, `users`, `projects`, `rbac` (shared) | Sesuai scope Sprint 1 — module lain (environments, stacks, containers, audit) ditambah saat sprint-nya tiba |
| Layer per module | 3 layer: `domain` / `infrastructure` / `presentation` | Selaras diagram arsitektur di `CLAUDE.md` (UI/Server Functions → Domain Layer → Drizzle/Portainer); versi ringan dari Clean Architecture, tanpa layer `application` terpisah agar tidak over-engineer untuk MVP |
| Skema Drizzle | Terpusat di `shared/db/schema/` | Memudahkan lihat seluruh skema DB sekaligus; trade-off: module jadi kurang self-contained untuk urusan skema, tapi diterima demi visibility |
| Git | Repo baru di-init, branch `main` | Sebelumnya belum ada `.git` |

## Directory Structure

```
app/
├── routes/                    # TanStack Router file-based routes (pages, layouts)
├── modules/                   # Business modules (modular monolith)
│   ├── auth/
│   │   ├── domain/            # entities, port interfaces, business rules
│   │   ├── infrastructure/    # repository impl, adapter
│   │   └── presentation/      # server functions dipakai routes
│   ├── users/
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── projects/
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   └── presentation/
│   └── rbac/                  # shared cross-module: role & permission check
│       ├── domain/
│       └── infrastructure/
├── shared/
│   ├── db/
│   │   ├── client.ts          # drizzle instance
│   │   └── schema/            # skema terpusat (users, projects, sessions, roles)
│   ├── portainer/
│   │   └── client.ts          # Portainer API client wrapper
│   ├── config/
│   │   └── env.ts             # zod-validated env vars
│   ├── auth/
│   │   └── session.ts         # cookie session helper
│   ├── ui/                    # shadcn/ui components
│   └── lib/                   # generic utils (cn, dsb)
└── styles/

drizzle/                       # migration output (drizzle-kit)
drizzle.config.ts
.env.example
```

Module lain (environments, stacks, containers, audit) belum dibuat — ditambahkan saat sprint-nya tiba (Sprint 2-4), supaya tidak ada folder kosong tanpa konteks yang membingungkan.

## Dependency Rule (per module)

- **`domain/`** — pure TypeScript. Zero import dari infrastructure/presentation, framework, atau DB. Isinya entity/type dan port interface (misal `UserRepository` interface).
- **`infrastructure/`** — implementasi port dari domain, boleh import `shared/db` atau `shared/portainer`. Tidak boleh import React/routing.
- **`presentation/`** — server functions (`createServerFn`) yang wire domain use-case ke infrastructure implementation. Satu-satunya layer yang boleh diimpor oleh `app/routes/`.

Arah dependency: `presentation → infrastructure → domain` dan `presentation → domain`. Tidak pernah sebaliknya.

## Scope of This Initiation Step

Dibuat nyata pada tahap ini:
- Project TanStack Start yang bisa `pnpm dev` dan menampilkan halaman default
- Seluruh folder module/shared di atas (folder kosong pakai `.gitkeep` bila belum ada isi)
- Config nyata: `tsconfig.json` (path alias `@/` → `app/`), `drizzle.config.ts`, `shared/config/env.ts` (validasi `PORTAINER_URL`, `PORTAINER_API_KEY`, `DATABASE_URL`, `SESSION_SECRET`), `.env.example`
- `.gitignore` dasar (node_modules, .env, dist, dsb)

Tidak dibuat pada tahap ini (masuk implementation plan Sprint 1):
- Skema Drizzle asli (tabel `users`, `projects`, `sessions`, dsb)
- Auth logic (login/logout/session)
- User & Project CRUD
- RBAC middleware nyata

## Testing

Tidak ada test ditulis pada tahap scaffolding ini. Struktur mendukung colocated `*.test.ts` per file di layer manapun untuk implementation plan berikutnya (keputusan test runner ditunda ke saat itu).

## Open Question for Implementation

Command CLI resmi untuk scaffold TanStack Start (`create-tsrouter-app`, `create-tanstack`, atau setup manual via Vite plugin) perlu dikonfirmasi saat eksekusi plan, karena tooling resmi TanStack Start dapat berubah cepat. Setelah scaffold awal jadi, file default (routes, main entry) direstrukturisasi mengikuti layout di atas.
