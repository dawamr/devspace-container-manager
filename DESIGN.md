# DevSpace — Design System

Rujukan tunggal untuk konsistensi UI DevSpace. Semua halaman/komponen baru WAJIB mengikuti token dan pola di dokumen ini. Jika butuh penyimpangan, update dokumen ini dulu — jangan hardcode nilai visual di komponen.

**Gaya utama: CasaOS-inspired glassmorphism di atas wallpaper** — panel kaca semi-transparan, teks putih, widget system di kiri, app grid di kanan.

---

## 1. Prinsip

1. **Wallpaper adalah background.** Konten selalu mengambang di atas `bg-default.jpg` + scrim gelap. Jangan pakai `bg-background` solid untuk halaman dashboard.
2. **Token, bukan nilai mentah.** Warna/radius/spasi lewat CSS variable di `app/styles/globals.css`. Dilarang `bg-[#1a2b3c]`, `rounded-[13px]`, dll.
3. **Glass untuk permukaan mengambang.** Kartu di atas wallpaper pakai `.glass-panel`. Permukaan solid (dropdown, dialog, sheet) tetap pakai `bg-popover`/`bg-card`.
4. **Kontras dulu, estetika kemudian.** Teks putih di atas wallpaper terang wajib lolos layer gelap panel (sudah built-in di `.glass-panel`).
5. **Dark-first.** UI dirancang untuk dark theme; light theme boleh ada tapi glass diasumsikan gelap.

---

## 2. Design Tokens

Sumber kebenaran: `app/styles/globals.css`. Semua token diekspos sebagai Tailwind color via `@theme inline` (mis. `--color-glass-border` → `border-glass-border`).

### 2.1 Color Tokens

| Token | Utility class | Fungsi |
|---|---|---|
| `--background` / `--foreground` | `bg-background` `text-foreground` | Base app (dipakai halaman non-wallpaper) |
| `--card` / `--card-foreground` | `bg-card` `text-card-foreground` | Permukaan solid (tabel, list, halaman detail) |
| `--popover` | `bg-popover` | Dropdown, menu, tooltip solid |
| `--primary` / `--primary-foreground` | `bg-primary` `text-primary-foreground` | Aksi utama (button masuk, CTA) |
| `--secondary` | `bg-secondary` | Aksi sekunder |
| `--muted` / `--muted-foreground` | `bg-muted` `text-muted-foreground` | Teks/permukaan redup pada permukaan solid |
| `--accent` | `bg-accent` | Hover state pada permukaan solid |
| `--destructive` | `bg-destructive` | Aksi berbahaya (hapus, stop) |
| `--success` / `--warning` / `--info` | `bg-success` `text-warning` dst. | Status semantik + accent ikon (lihat `accent.ts`) |
| `--border` / `--input` / `--ring` | `border-border` `bg-input` `ring-ring` | Border & focus pada permukaan solid |
| `--chart-1..5` | — | Warna seri chart |

### 2.2 Glass Tokens (khusus wallpaper)

| Token | Nilai | Fungsi |
|---|---|---|
| `--glass-bg` | white 7% | Panel subtle (app tile, chip) |
| `--glass-card` | white 12% | Panel utama (widget, kartu) |
| `--glass-card-strong` | black 28% | Layer gelap internal — **penjamin kontras**, jangan dihapus |
| `--glass-border` | white 14% | Border panel kaca |
| `--glass-foreground` | near-white | Teks di atas kaca |
| `--glass-muted` | white 62% | Teks sekunder di atas kaca |

### 2.3 Component Classes (di `@layer components`)

| Class | Pakai untuk |
|---|---|
| `.glass-panel` | Widget, kartu utama di atas wallpaper. Sudah termasuk blur 20px, saturate 1.4, layer gelap, border, shadow |
| `.glass-panel-subtle` | App tile, elemen kaca sekunder. Blur 14px |
| `.glass-text-muted` | Teks sekunder di dalam panel kaca (gantikan `text-muted-foreground` di konteks kaca) |

**Aturan keras:** di dalam `.glass-panel*` jangan pakai `text-foreground`/`text-muted-foreground`/`bg-card` — pakai default (putih) dan `.glass-text-muted`.

### 2.4 Shape, Efek, Motion

| Kategori | Token / Nilai | Catatan |
|---|---|---|
| Radius | `--radius: 0.625rem` → `rounded-lg` default; panel kaca pakai `rounded-2xl` | Konsisten sudut membulat besar ala CasaOS |
| Blur kaca | `backdrop-filter: blur(20px) saturate(1.4)` (panel), `blur(14px)` (subtle) | Jangan ubah per-komponen |
| Shadow panel | `0 8px 32px oklch(0 0 0 / 24%)` | Sudah di `.glass-panel` |
| Scrim wallpaper | `bg-black/45` fixed overlay | Di `DashboardShell`, jangan ditumpuk |
| Hover tile | `hover:-translate-y-1 hover:bg-white/15` + `transition-all` | Gerak halus, tanpa animasi berat |
| Focus ring kaca | `focus-visible:ring-2 focus-visible:ring-white/60` | Aksesibilitas di atas wallpaper |
| Transisi data | `transition-[width]/[stroke-dashoffset] duration-500` | Gauge & progress bar |

### 2.5 Tipografi & Ikon

- Font: Geist (sans), Geist Mono untuk angka/kode bila perlu.
- Skala teks di panel kaca: judul widget `text-sm font-medium`, nilai utama `text-2xl font-semibold tabular-nums`, meta `text-xs glass-text-muted`.
- Jam hero: `text-5xl md:text-6xl font-semibold tabular-nums`.
- Ikon: `lucide-react` saja. Ukuran: widget `size-5`, app tile `size-7`, header `size-5`.
- Angka metrik selalu `tabular-nums` supaya tidak jitter saat berubah.

---

## 3. Layout References

### 3.1 App Shell — `DashboardShell`

```
┌────────────────────────────────────────────┐
│ fixed: wallpaper + scrim bg-black/45       │
│ ┌────────────────────────────────────────┐ │
│ │ AppHeader (glass, sticky, h-16)        │ │
│ ├────────────────────────────────────────┤ │
│ │ main p-4 md:p-6, gap-6                 │ │
│ │   {children}                           │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

File: `app/shared/components/layout/dashboard-shell.tsx`
- Wallpaper: `public/assets/bg-default.jpg` (`WALLPAPER_URL` — ganti di sini saja).
- Konten wajib di dalam layer `relative z-10` (sudah disediakan shell).

### 3.2 Header — `AppHeader`

- Glass: `bg-black/25 backdrop-blur-xl border-b border-white/10`, teks putih.
- Kiri: logo (home) atau tombol kembali + breadcrumb (sub-halaman).
- Kanan: search global (`hidden md:block`), notifikasi, theme toggle, avatar menu.
- Input search varian kaca: `bg-white/10 border-white/15 placeholder:text-white/50`.

### 3.3 Home Dashboard — pola CasaOS

```
lg viewport:
┌──────────────┬─────────────────────────────┐
│ ClockWidget  │                             │
│ Gauge CPU/RAM│   App Grid (GlassAppTile)   │
│ StorageWidget│   grid 2 / sm:3 / xl:4      │
│ NetworkWidget│                             │
└──────────────┴─────────────────────────────┘
mobile: stack vertikal, widget sistem dulu baru grid
```

- Grid root: `grid grid-cols-1 gap-4 lg:grid-cols-3`.
- Kolom kiri: stack widget (`flex flex-col gap-4`), gauge berpasangan `grid-cols-2 lg:grid-cols-1`.
- File: `app/routes/_dashboard.index.tsx`, widget di `app/shared/components/layout/casa-widgets.tsx`.

### 3.4 Halaman Sub (Projects, Infrastructure, Administration)

- Tetap di dalam `DashboardShell` (wallpaper tetap terlihat).
- Konten data-dense (tabel, form) pakai permukaan **solid**: `bg-card border-border rounded-xl` — glass dipakai hanya untuk kartu ringkasan di atasnya.
- Judul halaman: `text-2xl font-semibold`, deskripsi `text-sm glass-text-muted` bila langsung di atas wallpaper, atau bungkus dalam panel.

### 3.5 Auth

- `AuthLayout` tetap terpusat, kartu solid — login tidak pakai wallpaper penuh.

---

## 4. Komponen & Pola

| Komponen | File | Kapan dipakai |
|---|---|---|
| `ClockWidget` | `casa-widgets.tsx` | Hero jam+tanggal, live update 1s |
| `GaugeWidget` | `casa-widgets.tsx` | Metrik persen sirkular (CPU, RAM). Props: `label, value (0-100), detail` |
| `StorageWidget` | `casa-widgets.tsx` | Progress bar kapasitas. Props: `label, usedLabel, totalLabel, percent` |
| `NetworkWidget` | `casa-widgets.tsx` | Sparkline throughput. Props: `label, downLabel, upLabel, history (0..1)` |
| `GlassAppTile` | `casa-widgets.tsx` | Shortcut modul ala home screen. Ikon besar + judul + deskripsi |
| `StatWidget` | `stat-widget.tsx` | Angka ringkas pada permukaan solid (sub-halaman) |
| `AppTile`/`AppGrid` | `app-tile.tsx` | Varian solid dari app grid |
| `ACCENT_STYLES` | `accent.ts` | Mapping `primary/secondary/success/warning/info` → surface + warna ikon. Wajib lewat ini, jangan rakit sendiri |

**Pola interaksi:**
- Tile/link: `hover:-translate-y-1`, durasi default Tailwind, tanpa animasi custom.
- Aksesibilitas: semua gauge/progress punya `role` + `aria-*` (contoh ada di `casa-widgets.tsx`). Ikuti pola itu.

---

## 5. Do / Don't

| ✅ Do | ❌ Don't |
|---|---|
| Widget di atas wallpaper → `.glass-panel` | `bg-card` melayang di atas wallpaper |
| Teks sekunder di kaca → `.glass-text-muted` | `text-muted-foreground` di dalam glass panel |
| Warna status → `ACCENT_STYLES[accent]` | Hardcode `bg-green-500/10 text-green-400` |
| Ganti wallpaper → ubah `WALLPAPER_URL` | Set `background-image` inline per halaman |
| Angka metrik → `tabular-nums` | Angka live tanpa tabular (jitter) |
| Radius panel → `rounded-2xl` | Nilai radius arbitrary |

---

## 6. Data & Batasan

- Nilai widget (CPU/RAM/storage/network) saat ini **placeholder**. Sumber kebenaran nanti: Portainer API via Server Function (Sprint 2) — jangan fetch dari browser.
- Light theme: token solid sudah ada; glass belum di-tune untuk light — perlakuan khusus butuh keputusan desain terpisah.
- Sidebar tidak dipakai (navigasi via app grid + breadcrumb), sesuai referensi CasaOS.
