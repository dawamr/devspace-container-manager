# Containers Command Surface — Enhancement Plan

> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development to implement task-by-task. Steps use `- [ ]` checkbox syntax.

**Goal:** Enhance halaman Containers (`/_dashboard/projects/$projectId/environments/$environmentId/containers`) dari "browsing table" menjadi **operational command surface** — memprioritaskan kecepatan menemukan container bermasalah dan mengeksekusi aksi (single + bulk) dengan observability freshness yang jelas.

**Lanjutan dari:** `docs/superpowers/plans/2026-08-14-container-management-enhancement.md` (search/filter/sort/remove/health/drawer + detail page sudah ada). Plan ini MENAMBAH layer di atasnya, tidak mengubah arsitektur server function.

**Arah desain (disetujui user):** Power-user interactions + summary metrics + live freshness. Bukan redesign visual total — tetap glassmorphism konsisten (`--glass-border`, `--glass-surface`, `--glass-blur`).

**Tech Stack:** TanStack Start, TanStack Table v8, TanStack Query v5, radix-ui (Checkbox, Select, Dialog), lucide-react, Tailwind v4.

---

## Current State (fakta dari kode, bukan asumsi)

- `containers.tsx` (111 baris): route page; `<ContainerTable>` + `<ContainerDetailDrawer>` + skeleton/error/empty.
- `container-table.tsx` (493 baris): TanStack Table dengan `globalFilter` (search name/image/state/status), `columnFilters` status (`state` field, `equalsString`), `sorting`, inline action per row (start/stop/restart/remove via mutation), `<StateBadge>` + `<HealthBadge>`, remove confirm `<Dialog>`.
- Mutasi tersedia: `startContainerFn`, `stopContainerFn`, `restartContainerFn`, `removeContainerFn` (semua via `withDocker` + `requirePermission` di server).
- `ContainerSummary` field: `id, name, image, state, status, health, createdAt, ports[]` (dari `globalFilterFn` + kolom `name/image/state/status/createdAt/ports`).
- Shared UI ada: `Checkbox` (radix), `Button`, `Input`, `Badge`, `Dialog`, `Select`, `Skeleton`, `PageHeader`, `glass-card`.

---

## Enhancement Blocks (priority order)

### Block 1 — Summary Stat Pills (ganti Select status)
- Tambah `ContainerSummaryBar` di atas tabel: `Total · Running · Stopped · Unhealthy`.
- Tiap pill **clickable** → set `statusFilter` (1 klik vs Select 2 klik). Active pill pakai `border-[var(--glass-border-strong)]` + bg accent.
- Pill "Running" punya **pulse dot** (dari frontend-design skill: live urgency indicator).
- Hitung count dari `containers` prop (client-side, sudah di-memory).
- **Hapus** `<Select>` status lama, ganti dengan pills. `STATUS_OPTIONS` const dihapus.

### Block 2 — Bulk Selection + Action Toolbar
- Enable `enableRowSelection` di `useReactTable`.
- Tambah kolom selector (checkbox) di index 0: header = select-all, row = per-container.
- State `rowSelection` (`Record<string, boolean>` keyed by `row.id` = container.id).
- Saat `Object.keys(rowSelection).length >= 1`: toolbar muncul di atas tabel (di bawah pills):
  - `N selected · [Start] [Stop] [Restart] [Remove] [Clear]`
  - Bulk action: map id terpilih → panggil mutasi per id (`Promise.all`). Gunakan mutasi yang sudah ada (start/stop/restart/remove).
  - Remove bulk → `<Dialog>` konfirmasi (jumlah container).
- Setelah eksekusi: `invalidate()` + `setRowSelection({})`.

### Block 3 — Auto-refresh + Freshness
- Di `containers.tsx`: `useQuery` tambah `refetchInterval: 30_000`, `refetchIntervalInBackground: false`.
- Track `dataUpdatedAt` (dari `useQuery`) → render "Updated Xs ago" (interval 1s tick lokal, `setInterval` + cleanup).
- Tombol Refresh manual di `PageHeader` (right slot) → `refetch()`.
- Pulse dot hijau saat polling aktif.

### Block 4 — Polish & Shortcuts
- **Row tinting**: `dead` / `restarting` → left border accent (`border-l-2 border-l-red-500/60` / `border-l-amber-500/60`) pada `<TableRow>`.
- `canStop`/`canRestart`/lock logic tetap (cek di baris action).
- **Keyboard**: global listener di `ContainerTable` — `f` fokus search input (ref), `r` trigger refresh (panggil prop `onRefresh`). `Escape` clear search. Hint di placeholder: `Search…  (f)`.
- **Shimmer skeleton**: ganti `ContainerTableSkeleton` basic jadi baris shimmer (animate-pulse gradient) — 6 baris placeholder.

---

## File Structure (perubahan)

```
app/modules/docker/presentation/
  container-table.tsx        MODIFY  (pills, rowSelection, bulk toolbar, keyboard, row tint, shimmer)
  container-summary-bar.tsx  CREATE  (stat pills + pulse dot)
  container-bulk-toolbar.tsx CREATE  (bulk action bar + confirm dialog)
app/routes/
  _dashboard.projects.$projectId.environments.$environmentId.containers.tsx
                              MODIFY  (refetchInterval, freshness text, refresh btn di PageHeader)
```

Tidak ada perubahan server function, domain type, atau route baru.

---

## Implementation Steps

### Step 1 — ContainerSummaryBar (CREATE)
- [ ] Buat `container-summary-bar.tsx`: props `{ containers: ContainerSummary[]; active: string; onChange: (v: string) => void }`.
- [ ] Hitung: `total`, `running = filter(state==='running')`, `stopped = filter(exited)`, `unhealthy = filter(health==='unhealthy' || state==='dead' || state==='restarting')`.
- [ ] Render 4 pill, active pill conditional style. Pill Running ada `<span className="animate-pulse ...">` dot.
- [ ] Pills: `all` (Total), `running`, `exited` (Stopped), `unhealthy` (Unhealthy) — value disesuaikan dengan `state`/health filter.

### Step 2 — ContainerBulkToolbar (CREATE)
- [ ] Props `{ selectedIds: string[]; environmentId: string; onClear: () => void; onDone: () => void }`.
- [ ] Mutasi bulk: reuse `startContainerFn/stopContainerFn/restartContainerFn/removeContainerFn`.
- [ ] Toolbar: count + 4 button + Clear. Remove → `AlertDialog`/`Dialog` konfirmasi jumlah.
- [ ] `onDone` → invalidate + clear selection (dipanggil dari parent).

### Step 3 — container-table.tsx MODIFY
- [ ] Tambah `enableRowSelection: true` + kolom checkbox (header select-all `table.getToggleAllRowsSelectedHandler()`, row `row.getToggleSelectedHandler()`).
- [ ] State `rowSelection`; teruskan ke `useReactTable` `state: { ..., rowSelection }` + `onRowSelectionChange`.
- [ ] Ganti `<Select>` status dengan `<ContainerSummaryBar active={statusFilter} onChange={...}>`.
- [ ] Render `<ContainerBulkToolbar>` saat `selectedIds.length >= 1`.
- [ ] `TableRow` tambah conditional `border-l-2` berdasar `row.original.state`.
- [ ] Keyboard listener (`f`/`r`/`Escape`) via `useEffect` + `useRef` search input; `r` panggil prop `onRefresh?`.
- [ ] Export `selectedIds` ke parent? Tidak — bulk toolbar di-render di dalam `ContainerTable` (state lokal). `onRefresh` dari parent untuk refresh manual.

### Step 4 — containers.tsx MODIFY
- [ ] `useQuery` tambah `refetchInterval: 30_000`.
- [ ] State `nowTick` (1s) untuk "Updated Xs ago" dari `dataUpdatedAt`.
- [ ] `PageHeader` right slot: tombol Refresh (`RotateCw` + `refetch()`) + teks freshness.
- [ ] Teruskan `onRefresh={refetch}` ke `<ContainerTable>`.
- [ ] `ContainerTableSkeleton` → shimmer (atau pindah ke `container-table.tsx`).

### Step 5 — Shimmer skeleton
- [ ] Ganti implementasi `ContainerTableSkeleton` jadi 6 baris `animate-pulse` dengan gradient glass.

### Step 6 — Verify
- [ ] `pnpm typecheck` (atau `pnpm tsc --noEmit`) pass.
- [ ] `pnpm build` (tanstack start) sukses — cek native addon `dockerode` sudah di `ssr.external` (dari memory).
- [ ] Manual: buka route, cek pills filter, select-all + bulk start/stop, refresh + freshness, keyboard `f`/`r`.

---

## Risks / Trade-offs

- **Bulk remove force**: container running di-force remove (sudah perilaku `removeContainerFn`). Konfirmasi dialog wajib, sebutkan jumlah.
- **Row selection vs row click**: klik row buka drawer (`onOpenDetail`). Klik checkbox harus `stopPropagation` agar tidak buka drawer.
- **Keyboard `f`/`r`**: hanya aktif saat tidak focus input lain (cek `document.activeElement` tag). Hindari bentrok dengan shortcut browser.
- **Auto-refresh 30s**: bisa bentur dengan mutation pending — `invalidate` manual tetap utama; polling hanya background sync.
- **Unhealthy count**: `health` field ada di `ContainerSummary` (dari `<HealthBadge health={...}>`), tapi definisi "unhealthy" perlu konsisten dengan `HealthBadge` (healthy/unhealthy/starting/none). Pakai `health !== 'healthy'`.

---

## Out of Scope (explicit)

- Resource metrics CPU/mem per container — butuh `docker stats` streaming, bukan di MVP enhancement ini.
- Infinite scroll / virtualization — container count kecil (environment tunggal).
- Saved filter presets persist ke DB — skip, client-state cukup.
- Inline expandable row logs — sudah ada drawer + detail page terpisah.

---

## Design Notes (frontend-design skill)

- Functional density > decoration. Tidak ada gradient berat/animasi berlebih.
- Glassmorphism konsisten: pakai token `--glass-border`, `--glass-surface`, `--glass-blur`, `--glass-radius`. Jangan hardcode `border-white/N`.
- Pulse dot hanya untuk live indicator (Running count, polling) — bukan decorative.
- Mobile: bulk toolbar wrap (`flex-wrap`), checkbox tetap 44px target.
