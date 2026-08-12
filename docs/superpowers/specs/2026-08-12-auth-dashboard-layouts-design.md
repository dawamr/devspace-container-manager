# Auth & Dashboard Layouts — Design Tokens, Layout Shell, Components

## Context

Project `dev-spaces` (DevSpace) saat ini baru selesai tahap scaffolding modular-monolith (lihat `docs/superpowers/plans/2026-08-12-tanstack-start-scaffolding.md`). Belum ada Tailwind CSS, belum ada shadcn/ui, belum ada design token, dan routes hanya berisi halaman default TanStack Start.

Task ini melanjutkan ke pembuatan **layout Auth dan Dashboard** — fokus pada Design Layout, Design Token, dan Component build. Ini adalah pekerjaan **UI/frontend murni**: tidak ada logic autentikasi asli, tidak ada data asli dari database/Portainer, dan tidak ada route protection. Semua itu adalah scope Sprint 1 backend implementation plan yang terpisah (lihat `docs/sprints/sprint-1.md` dan `CLAUDE.md`).

Referensi visual yang diminta user: **CasaOS** (app-launcher dashboard dengan grid tile berwarna rounded, widget status card) dikombinasikan dengan pola **Odoo Enterprise** (grid app sebagai navigasi utama, bukan cuma app-launcher pasif). Requirement dasar (sidebar/header/breadcrumb, responsive, shadcn/ui, semantic color tokens, light/dark mode) tetap mengikat, tapi bentuk "sidebar" direkonsiliasi menjadi grid-navigasi di level atas + sidebar tipis kontekstual di dalam modul yang punya sub-halaman.

## Decisions

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Styling system | Tailwind v4 CSS-first (`@theme inline`) + CSS variable OKLCH | Selaras stack terbaru (Vite 8, React 19); shadcn/ui versi terbaru native mendukung ini; tanpa `tailwind.config.ts` terpisah |
| Dark mode | Class `dark` di `<html>`, preferensi disimpan `localStorage`, di-set lewat inline blocking script di `<head>` root route | Tidak ada flash tema saat load; tema bukan data sensitif jadi tidak perlu cookie/session server-side |
| Navigasi utama | **App-grid** (bukan sidebar persisten) di halaman Dashboard home — tile Projects, Infrastructure, Administration berfungsi sebagai navigasi sekaligus entry point modul | Instruksi eksplisit user: gaya CasaOS + Odoo Enterprise (grid app sebagai navigasi) |
| Navigasi dalam modul | **Sidebar tipis kontekstual**, muncul hanya di dalam modul yang punya sub-halaman (contoh: Administration → Users/Roles/Audit Logs) | Keputusan user setelah reconciliation question — sidebar global dihapus, diganti sidebar per-modul |
| Breadcrumb | Tetap ada di header saat berada di dalam modul, untuk drill-down (`Administration / Users`) | Requirement asli tetap dipertahankan untuk wayfinding hierarki dalam |
| Auth layout | Split-screen (branding kiri, form kanan), kolaps jadi 1 kolom di mobile | Pilihan user — pola umum SaaS modern, cukup profesional untuk internal tool |
| Routing | Pathless layout routes TanStack Router (`_auth.tsx`, `_dashboard.tsx`, nested `_dashboard.administration.tsx`) | Idiomatik file-based routing TanStack Router, selaras struktur project yang sudah ada |
| Lokasi komponen layout | `app/shared/components/layout/` (baru); shadcn primitives di `app/shared/ui/` (folder sudah ada) | Layout shell bukan business logic modul → tempatnya di `shared`, bukan di `modules/*` |
| Data halaman | Dummy/placeholder statis, ditandai eksplisit sebagai placeholder | Belum ada backend Sprint 1; menghindari kesan "sudah functional" |
| Font | System-ui stack (tanpa web font eksternal) | Zero-dependency, sesuai prinsip hindari dependency tidak perlu |

## Design Tokens

CSS variable OKLCH di `app/styles/globals.css`, dipetakan ke Tailwind via `@theme inline`. Didefinisikan untuk light & dark:

- `background` / `foreground`
- `card` / `card-foreground`
- `popover` / `popover-foreground`
- `primary` / `primary-foreground`
- `secondary` / `secondary-foreground`
- `muted` / `muted-foreground`
- `accent` / `accent-foreground`
- `success` / `success-foreground`
- `warning` / `warning-foreground`
- `destructive` / `destructive-foreground`
- `info` / `info-foreground`
- `border`, `input`, `ring`
- `chart-1` .. `chart-5` (aksen warna tile app-grid, tetap dari palet semantik yang sama, bukan warna lepas)

Radius: satu token dasar `--radius` (0.75rem) diturunkan ke `sm/md/lg/xl` via Tailwind. Tile app-grid pakai `rounded-xl`, card/form standar `rounded-lg`.

Spacing: skala default Tailwind (4px base), tanpa scale custom tambahan.

Tipografi: satu font-family (`system-ui` stack), skala `text-xs` s.d. `text-2xl`, `font-semibold` untuk heading, `font-medium` untuk label.

## Component Inventory

**shadcn/ui primitives** (generate ke `app/shared/ui/`): `button`, `input`, `label`, `card`, `avatar`, `dropdown-menu`, `sheet`, `separator`, `badge`, `tooltip`, `skeleton`, `progress`.

**Layout components** (baru, di `app/shared/components/layout/`):

| Komponen | Tanggung jawab |
|---|---|
| `auth-layout.tsx` | Shell split-screen untuk route `/login` |
| `dashboard-shell.tsx` | Shell utama: render `AppHeader` + slot konten (`children`/`<Outlet/>`) |
| `app-header.tsx` | Header adaptif — mode "home" (logo + search + notif + theme toggle + user menu) vs mode "module" (tombol kembali ke grid + breadcrumb + sisanya sama) |
| `module-sidebar.tsx` | Sidebar tipis daftar sub-halaman modul, dipakai layout modul yang punya sub-item (mis. Administration) |
| `breadcrumb-nav.tsx` | Breadcrumb dinamis dari route match TanStack Router |
| `app-grid.tsx` | Grid responsif berisi `AppTile`, dipakai di Dashboard home |
| `app-tile.tsx` | Satu tile navigasi modul: ikon Lucide, label, deskripsi, warna aksen dari token, adalah `<Link>` |
| `stat-widget.tsx` | Card widget angka/progress ala CasaOS untuk ringkasan (Total Projects, dst) |
| `mobile-drawer.tsx` | Wrapper `Sheet` untuk `ModuleSidebar` di mobile |

**Utility baru**: `app/shared/lib/cn.ts` (clsx + tailwind-merge, pola standar shadcn), `app/shared/hooks/use-theme.ts` (baca/toggle tema, sinkron `localStorage` + class `<html>`).

## Routing Structure

```
app/routes/
├── __root.tsx                              # + inline theme-init script di <head>
├── _auth.tsx                                # layout: AuthLayout
│   └── _auth.login.tsx                      # halaman login (form UI, submit stub, no real auth)
├── _dashboard.tsx                           # layout: DashboardShell (header mode "home"/"module" otomatis dari route)
│   ├── _dashboard.index.tsx                 # "/" — Dashboard home: StatWidget row + AppGrid
│   ├── _dashboard.projects.tsx              # placeholder module page, tanpa ModuleSidebar
│   ├── _dashboard.infrastructure.tsx        # placeholder module page, tanpa ModuleSidebar
│   └── _dashboard.administration.tsx        # layout: + ModuleSidebar (Users/Roles/Audit Logs)
│       ├── _dashboard.administration.index.tsx        # redirect atau ringkasan singkat
│       ├── _dashboard.administration.users.tsx        # placeholder list
│       ├── _dashboard.administration.roles.tsx        # placeholder list
│       └── _dashboard.administration.audit-logs.tsx   # placeholder list
```

Penamaan file pathless (`_prefix`) disesuaikan dengan konvensi resmi TanStack Router yang berlaku saat implementasi (`tsr generate` sudah dipakai project ini — cek output generator jika ada perbedaan konvensi versi).

## Page Detail

### Auth — `/login`

- Desktop/tablet: 2 kolom. Kiri (~45% lebar) panel branding — gradient token-based (`from-primary/10 to-accent/20`), logo DevSpace, judul singkat, 2-3 value prop singkat. Kanan: form login (email, password, tombol submit, link lupa password) di-center vertikal, max-width form ~24rem.
- Mobile: panel branding kolaps jadi header ringkas (logo + judul 1 baris) di atas, form full-width di bawah. Tidak ada scroll horizontal di breakpoint manapun.
- Submit handler: stub (`setTimeout`/fake delay + loading state di tombol). **Tidak** memanggil server function auth asli.

### Dashboard Home — `/`

- Header mode "home": logo kecil kiri, search bar global (UI saja, non-fungsional), ikon notifikasi, theme toggle, avatar + dropdown user menu (kanan).
- Konten: greeting singkat → baris `StatWidget` (grid 2 kol mobile, 4 kol desktop): Total Projects, Environments Aktif, Running Containers, Stacks — masing-masing card rounded besar, angka besar, ikon/progress kecil bertema warna semantik berbeda (primary/success/info/warning), data dummy statis.
- Di bawahnya `AppGrid`: 3 tile (Projects, Infrastructure, Administration) — ikon Lucide besar, label, deskripsi 1 baris, warna aksen dari token chart, `rounded-xl`, hover elevate + scale halus, seluruhnya `<Link>` (bukan `div onClick`).
- Grid responsif: 1 kolom mobile, 2 kolom tablet, 3 kolom desktop.

### Module Layout — contoh `Administration`

- Header mode "module": tombol "kembali ke grid" (ikon grid) menggantikan logo, breadcrumb (`Administration / Users`), sisanya sama seperti mode "home".
- Desktop/tablet: 2 kolom di bawah header — `ModuleSidebar` ramping (~14-16rem) berisi Users/Roles/Audit Logs dengan ikon, item aktif ditandai `bg-accent`, di kanannya konten modul.
- Mobile: `ModuleSidebar` disembunyikan, dipicu tombol hamburger di header, muncul sebagai `Sheet` drawer dari kiri berisi daftar sub-navigasi yang sama.
- `Projects` dan `Infrastructure` memakai layout module yang sama tapi **tanpa** `ModuleSidebar` (belum ada sub-item) — cukup header mode "module" + breadcrumb + konten placeholder ("Coming in Sprint 2/3").

## Accessibility & Interaction

- Semua tile/nav item pakai elemen semantik (`<a>`/`<Link>`, `<nav>`, `<button>`) — tidak ada `div` yang berperan sebagai link/tombol.
- Focus-visible ring dari token `ring` konsisten di semua elemen interaktif.
- Drawer (`Sheet`) dan dropdown menu dari shadcn/Radix — focus trap, ESC-to-close, ARIA roles sudah bawaan.
- Kontras warna diverifikasi untuk light & dark mode pada tahap implementasi (manual check, bukan automated a11y test — di luar scope).

## Testing

Tidak ada automated test ditulis di tahap ini (keputusan test runner masih ditunda, sesuai plan scaffolding sebelumnya). Verifikasi dilakukan manual: jalankan `pnpm dev`, cek tiap breakpoint (mobile/tablet/desktop), toggle light/dark, pastikan tidak ada horizontal overflow, cek keyboard navigation dasar (tab order, focus visible, ESC menutup drawer/dropdown).

## Out of Scope

- Logic autentikasi asli (session, cookie, password hashing) — Sprint 1 backend plan terpisah.
- Data asli dari PostgreSQL/Portainer — semua angka/list di komponen ini adalah placeholder eksplisit.
- Route protection / redirect berdasarkan session — belum ada session untuk dicek.
- RBAC enforcement di UI (menyembunyikan tile Administration untuk non-Admin, dst) — menyusul setelah auth & RBAC backend ada.
- Automated accessibility/visual regression testing.
