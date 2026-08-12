# Auth & Dashboard Layouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bangun design token system, komponen layout, dan routing untuk Auth (login) dan Dashboard (app-grid ala CasaOS/Odoo + module shell) di DevSpace — UI/frontend murni, tanpa logic auth asli.

**Architecture:** Tailwind CSS v4 (CSS-first `@theme`) menggantikan CSS polos yang ada sekarang; shadcn/ui (`new-york` style) untuk primitives di `app/shared/ui/`; komponen layout komposit baru di `app/shared/components/layout/`; routing pathless TanStack Router (`_auth.*`, `_dashboard.*`) untuk memisahkan shell Auth dari shell Dashboard tanpa duplikasi.

**Tech Stack:** TanStack Start, TanStack Router (file-based, pathless layout routes), React 19, TypeScript (strict), Tailwind CSS v4, shadcn/ui, lucide-react, clsx + tailwind-merge, class-variance-authority.

**Spec:** `docs/superpowers/specs/2026-08-12-auth-dashboard-layouts-design.md` — baca dulu sebelum eksekusi, semua keputusan desain (token, reconciliation CasaOS/Odoo, scope) didefinisikan di sana.

---

## Task 1: Install & Wire Tailwind CSS v4

**Files:**
- Modify: `package.json` (via `pnpm add`)
- Modify: `vite.config.ts`

- [ ] **Step 1: Install Tailwind v4 build deps**

```bash
pnpm add -D tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 tw-animate-css@1.4.0
```

Expected: exits 0, `package.json` `devDependencies` gains `tailwindcss`, `@tailwindcss/vite`, `tw-animate-css`.

- [ ] **Step 2: Install runtime UI utility deps**

```bash
pnpm add lucide-react@1.31.0 clsx@2.1.1 tailwind-merge@3.6.0 class-variance-authority@0.7.1
```

Expected: exits 0, `package.json` `dependencies` gains the four packages.

- [ ] **Step 3: Wire the Tailwind Vite plugin**

Modify `vite.config.ts`:

```ts
import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [tanstackStart({ srcDirectory: 'app' }), viteReact(), tailwindcss()],
})

export default config
```

- [ ] **Step 4: Verify build still succeeds**

```bash
pnpm build
```

Expected: both client and ssr builds report `✓ built in <n>ms`, exit code 0. `globals.css` output still tiny (Tailwind not imported yet — that's Task 2).

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts
git commit -m "chore: install and wire Tailwind CSS v4"
```

---

## Task 2: Design Tokens — `globals.css`

**Files:**
- Modify: `app/styles/globals.css` (full replace)

- [ ] **Step 1: Replace `app/styles/globals.css` with the token system**

```css
@import 'tailwindcss';
@import 'tw-animate-css';

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.75rem;

  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.55 0.18 260);
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.96 0.01 260);
  --secondary-foreground: oklch(0.25 0.02 260);
  --muted: oklch(0.96 0 0);
  --muted-foreground: oklch(0.5 0 0);
  --accent: oklch(0.95 0.03 260);
  --accent-foreground: oklch(0.25 0.02 260);
  --destructive: oklch(0.58 0.22 25);
  --destructive-foreground: oklch(0.98 0 0);
  --success: oklch(0.6 0.15 150);
  --success-foreground: oklch(0.98 0 0);
  --warning: oklch(0.75 0.15 80);
  --warning-foreground: oklch(0.2 0.02 80);
  --info: oklch(0.6 0.15 230);
  --info-foreground: oklch(0.98 0 0);
  --border: oklch(0.9 0 0);
  --input: oklch(0.9 0 0);
  --ring: oklch(0.55 0.18 260);
  --chart-1: oklch(0.6 0.2 260);
  --chart-2: oklch(0.65 0.2 30);
  --chart-3: oklch(0.55 0.15 150);
  --chart-4: oklch(0.6 0.18 320);
  --chart-5: oklch(0.7 0.18 90);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.98 0 0);
  --card: oklch(0.2 0 0);
  --card-foreground: oklch(0.98 0 0);
  --popover: oklch(0.2 0 0);
  --popover-foreground: oklch(0.98 0 0);
  --primary: oklch(0.7 0.18 260);
  --primary-foreground: oklch(0.145 0 0);
  --secondary: oklch(0.27 0.02 260);
  --secondary-foreground: oklch(0.98 0 0);
  --muted: oklch(0.27 0 0);
  --muted-foreground: oklch(0.65 0 0);
  --accent: oklch(0.3 0.03 260);
  --accent-foreground: oklch(0.98 0 0);
  --destructive: oklch(0.65 0.2 25);
  --destructive-foreground: oklch(0.98 0 0);
  --success: oklch(0.7 0.15 150);
  --success-foreground: oklch(0.145 0 0);
  --warning: oklch(0.8 0.15 80);
  --warning-foreground: oklch(0.145 0.02 80);
  --info: oklch(0.7 0.15 230);
  --info-foreground: oklch(0.145 0 0);
  --border: oklch(1 0 0 / 12%);
  --input: oklch(1 0 0 / 18%);
  --ring: oklch(0.7 0.18 260);
  --chart-1: oklch(0.65 0.2 260);
  --chart-2: oklch(0.7 0.2 30);
  --chart-3: oklch(0.6 0.15 150);
  --chart-4: oklch(0.65 0.18 320);
  --chart-5: oklch(0.75 0.18 90);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: exit 0, `dist/client/assets/*.css` output is noticeably larger than the previous ~0.12kB (Tailwind base layer now included).

- [ ] **Step 3: Commit**

```bash
git add app/styles/globals.css
git commit -m "feat: add semantic design tokens (light/dark OKLCH)"
```

---

## Task 3: shadcn/ui Baseline — `components.json` + `cn` Utility

**Files:**
- Create: `components.json`
- Create: `app/shared/lib/cn.ts`

- [ ] **Step 1: Create `components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "#/shared/ui",
    "utils": "#/shared/lib/cn",
    "ui": "#/shared/ui",
    "lib": "#/shared/lib",
    "hooks": "#/shared/hooks"
  }
}
```

- [ ] **Step 2: Create `app/shared/lib/cn.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 3: Verify types**

```bash
pnpm exec tsc --noEmit
```

Expected: no output, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add components.json app/shared/lib/cn.ts
git commit -m "feat: add shadcn/ui config and cn utility"
```

---

## Task 4: Install shadcn/ui Primitive Components

**Files:**
- Create (generated by CLI): `app/shared/ui/button.tsx`, `input.tsx`, `label.tsx`, `card.tsx`, `avatar.tsx`, `dropdown-menu.tsx`, `sheet.tsx`, `separator.tsx`, `badge.tsx`, `tooltip.tsx`, `skeleton.tsx`, `progress.tsx`
- Delete: `app/shared/ui/.gitkeep`

- [ ] **Step 1: Install the shadcn CLI**

```bash
pnpm add -D shadcn@4.17.0
```

Expected: exits 0, `devDependencies` gains `shadcn`.

- [ ] **Step 2: Generate primitives**

```bash
pnpm exec shadcn add button input label card avatar dropdown-menu sheet separator badge tooltip skeleton progress --yes
```

Expected: exits 0, CLI reports each component installed, files created under `app/shared/ui/`, related `@radix-ui/*` packages added to `dependencies`.

- [ ] **Step 3: Confirm `globals.css` and `cn.ts` were not altered unexpectedly**

```bash
git diff app/styles/globals.css app/shared/lib/cn.ts
```

Expected: no output (empty diff). If the CLI appended anything, review it — it should be a no-op since both files already satisfy the CLI's expectations.

- [ ] **Step 4: Remove the now-unnecessary placeholder**

```bash
rm app/shared/ui/.gitkeep
```

- [ ] **Step 5: Verify types and build**

```bash
pnpm exec tsc --noEmit && pnpm build
```

Expected: `tsc` exits 0 with no output; `pnpm build` reports `✓ built in <n>ms` for both client and ssr.

- [ ] **Step 6: Commit**

```bash
git add app/shared/ui package.json pnpm-lock.yaml
git commit -m "feat: install shadcn/ui primitive components"
```

---

## Task 5: Dark Mode Infrastructure

**Files:**
- Modify: `app/routes/__root.tsx`
- Create: `app/shared/hooks/use-theme.ts`
- Create: `app/shared/components/layout/theme-toggle.tsx`

- [ ] **Step 1: Add the theme-init script and update metadata in `__root.tsx`**

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles/globals.css?url'

const themeInitScript = `(function () {
  try {
    var stored = localStorage.getItem('devspace-theme');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch (error) {}
})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'DevSpace' },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}

        <Scripts />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Create `app/shared/hooks/use-theme.ts`**

```ts
import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'devspace-theme'

function getInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, setTheme, toggleTheme }
}
```

- [ ] **Step 3: Create `app/shared/components/layout/theme-toggle.tsx`**

```tsx
import { Moon, Sun } from 'lucide-react'

import { Button } from '#/shared/ui/button'
import { useTheme } from '#/shared/hooks/use-theme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      onClick={toggleTheme}
    >
      {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  )
}
```

- [ ] **Step 4: Verify types**

```bash
pnpm exec tsc --noEmit
```

Expected: no output, exit code 0.

- [ ] **Step 5: Manual check — no flash of wrong theme**

```bash
pnpm dev &
sleep 2
curl -s http://localhost:3000/ | grep -o 'devspace-theme' || true
```

Expected: prints `devspace-theme` (confirms the inline script is present in the server-rendered HTML). Keep the dev server running, then open `http://localhost:3000` in a browser, run `localStorage.setItem('devspace-theme', 'dark')` in devtools console, reload — page should render dark from the very first paint (no light flash). When done, stop the dev server:

```bash
kill %1
```

- [ ] **Step 6: Commit**

```bash
git add app/routes/__root.tsx app/shared/hooks/use-theme.ts app/shared/components/layout/theme-toggle.tsx
git commit -m "feat: add dark mode toggle with no-flash init script"
```

---

## Task 6: Shared Layout Primitives — Accent Map, Breadcrumb, AppTile, AppGrid, StatWidget

**Files:**
- Create: `app/shared/components/layout/accent.ts`
- Create: `app/shared/components/layout/breadcrumb-nav.tsx`
- Create: `app/shared/components/layout/app-tile.tsx`
- Create: `app/shared/components/layout/app-grid.tsx`
- Create: `app/shared/components/layout/stat-widget.tsx`

- [ ] **Step 1: Create `app/shared/components/layout/accent.ts`**

```ts
export type Accent = 'primary' | 'secondary' | 'success' | 'warning' | 'info'

export const ACCENT_STYLES: Record<Accent, { surface: string; icon: string }> = {
  primary: { surface: 'bg-primary/10', icon: 'text-primary' },
  secondary: { surface: 'bg-secondary', icon: 'text-secondary-foreground' },
  success: { surface: 'bg-success/10', icon: 'text-success' },
  warning: { surface: 'bg-warning/10', icon: 'text-warning' },
  info: { surface: 'bg-info/10', icon: 'text-info' },
}
```

- [ ] **Step 2: Create `app/shared/components/layout/breadcrumb-nav.tsx`**

```tsx
import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href: string
}

export function BreadcrumbNav({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center">
      <ol className="flex min-w-0 items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={item.href} className="flex min-w-0 items-center gap-1">
              {index > 0 ? <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" /> : null}
              {isLast ? (
                <span className="truncate text-sm font-medium text-foreground" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link to={item.href} className="truncate text-sm text-muted-foreground hover:text-foreground">
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
```

- [ ] **Step 3: Create `app/shared/components/layout/app-tile.tsx`**

```tsx
import type { LucideIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { cn } from '#/shared/lib/cn'

import { ACCENT_STYLES, type Accent } from './accent'

export interface AppTileConfig {
  title: string
  description: string
  href: string
  icon: LucideIcon
  accent: Accent
}

export function AppTile({ title, description, href, icon: Icon, accent }: AppTileConfig) {
  const styles = ACCENT_STYLES[accent]

  return (
    <Link
      to={href}
      className={cn(
        'group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <span className={cn('flex size-11 items-center justify-center rounded-lg', styles.surface, styles.icon)}>
        <Icon className="size-6" />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-base font-semibold text-card-foreground">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
    </Link>
  )
}
```

- [ ] **Step 4: Create `app/shared/components/layout/app-grid.tsx`**

```tsx
import { AppTile, type AppTileConfig } from './app-tile'

export function AppGrid({ items }: { items: AppTileConfig[] }) {
  return (
    <nav aria-label="Navigasi modul" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <AppTile key={item.href} {...item} />
      ))}
    </nav>
  )
}
```

- [ ] **Step 5: Create `app/shared/components/layout/stat-widget.tsx`**

```tsx
import type { LucideIcon } from 'lucide-react'

import { cn } from '#/shared/lib/cn'

import { ACCENT_STYLES, type Accent } from './accent'

export interface StatWidgetProps {
  label: string
  value: string | number
  icon: LucideIcon
  accent: Accent
  helpText?: string
}

export function StatWidget({ label, value, icon: Icon, accent, helpText }: StatWidgetProps) {
  const styles = ACCENT_STYLES[accent]

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', styles.surface, styles.icon)}>
        <Icon className="size-5" />
      </span>
      <div className="flex flex-col">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold text-card-foreground">{value}</span>
        {helpText ? <span className="text-xs text-muted-foreground">{helpText}</span> : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify types**

```bash
pnpm exec tsc --noEmit
```

Expected: no output, exit code 0. (These components aren't referenced anywhere yet, so this only checks internal correctness — `noUnusedLocals`/`noUnusedParameters` apply per-file, not cross-file usage.)

- [ ] **Step 7: Commit**

```bash
git add app/shared/components/layout/accent.ts app/shared/components/layout/breadcrumb-nav.tsx app/shared/components/layout/app-tile.tsx app/shared/components/layout/app-grid.tsx app/shared/components/layout/stat-widget.tsx
git commit -m "feat: add accent map, breadcrumb, app-grid and stat-widget components"
```

---

## Task 7: AppHeader Component

**Files:**
- Create: `app/shared/components/layout/app-header.tsx`

- [ ] **Step 1: Create `app/shared/components/layout/app-header.tsx`**

```tsx
import { Link, useMatches, useRouterState } from '@tanstack/react-router'
import { Bell, LayoutGrid, Search } from 'lucide-react'

import { Avatar, AvatarFallback } from '#/shared/ui/avatar'
import { Button } from '#/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/shared/ui/dropdown-menu'
import { Input } from '#/shared/ui/input'

import { BreadcrumbNav, type BreadcrumbItem } from './breadcrumb-nav'
import { ThemeToggle } from './theme-toggle'

interface RouteStaticData {
  title?: string
}

export function AppHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const matches = useMatches()
  const isHome = pathname === '/'

  const breadcrumbItems: BreadcrumbItem[] = matches.reduce<BreadcrumbItem[]>((items, match) => {
    const title = (match.staticData as RouteStaticData | undefined)?.title
    if (title) items.push({ label: title, href: match.pathname })
    return items
  }, [])

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
      {isHome ? (
        <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
            D
          </span>
          <span className="hidden sm:inline">DevSpace</span>
        </Link>
      ) : (
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Kembali ke dashboard">
            <Link to="/">
              <LayoutGrid className="size-5" />
            </Link>
          </Button>
          <BreadcrumbNav items={breadcrumbItems} />
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari project, stack, container..."
            aria-label="Pencarian global"
            className="w-64 pl-8"
          />
        </div>
        <Button variant="ghost" size="icon" aria-label="Notifikasi">
          <Bell className="size-5" />
        </Button>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menu pengguna">
              <Avatar className="size-8">
                <AvatarFallback>DR</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Dawam Raja</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profil</DropdownMenuItem>
            <DropdownMenuItem>Pengaturan</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Verify types**

```bash
pnpm exec tsc --noEmit
```

Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add app/shared/components/layout/app-header.tsx
git commit -m "feat: add adaptive AppHeader (home vs module variant)"
```

---

## Task 8: DashboardShell + AuthLayout Shells

**Files:**
- Create: `app/shared/components/layout/dashboard-shell.tsx`
- Create: `app/shared/components/layout/auth-layout.tsx`

- [ ] **Step 1: Create `app/shared/components/layout/dashboard-shell.tsx`**

```tsx
import type { ReactNode } from 'react'

import { AppHeader } from './app-header'

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/shared/components/layout/auth-layout.tsx`**

```tsx
import type { ReactNode } from 'react'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <div className="flex flex-col justify-center gap-6 bg-gradient-to-br from-primary/10 to-accent/20 px-6 py-10 md:w-[45%] md:px-12">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            D
          </span>
          <span className="text-lg">DevSpace</span>
        </div>
        <div className="max-w-sm space-y-3">
          <h1 className="text-2xl font-semibold text-foreground">Kelola container & stack tanpa ribet</h1>
          <p className="text-sm text-muted-foreground">
            DevSpace membantu tim mengelola project, environment, dan deployment Docker lewat Portainer dalam satu
            dashboard.
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify types**

```bash
pnpm exec tsc --noEmit
```

Expected: no output, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add app/shared/components/layout/dashboard-shell.tsx app/shared/components/layout/auth-layout.tsx
git commit -m "feat: add DashboardShell and AuthLayout shells"
```

---

## Task 9: Auth Route — `/login`

**Files:**
- Create: `app/routes/_auth.tsx`
- Create: `app/routes/_auth.login.tsx`

- [ ] **Step 1: Create `app/routes/_auth.tsx`**

```tsx
import { Outlet, createFileRoute } from '@tanstack/react-router'

import { AuthLayout } from '#/shared/components/layout/auth-layout'

export const Route = createFileRoute('/_auth')({
  component: AuthLayoutRoute,
})

function AuthLayoutRoute() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  )
}
```

- [ ] **Step 2: Create `app/routes/_auth.login.tsx`**

```tsx
import type { FormEvent } from 'react'
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import { Label } from '#/shared/ui/label'

export const Route = createFileRoute('/_auth/login')({
  component: LoginPage,
})

function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setTimeout(() => setIsSubmitting(false), 800)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">Masuk ke DevSpace</h2>
        <p className="text-sm text-muted-foreground">Gunakan akun yang diberikan admin untuk masuk.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="nama@tspindonesia.com" required />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <a href="#" className="text-xs font-medium text-primary hover:underline">
            Lupa password?
          </a>
        </div>
        <Input id="password" name="password" type="password" required />
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? 'Memproses...' : 'Masuk'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Regenerate the route tree**

```bash
pnpm generate-routes
```

Expected: exits 0, `app/routeTree.gen.ts` now includes `/_auth` and `/_auth/login`.

- [ ] **Step 4: Verify types**

```bash
pnpm exec tsc --noEmit
```

Expected: no output, exit code 0.

- [ ] **Step 5: Manual check**

```bash
pnpm dev &
sleep 2
curl -s http://localhost:3000/login | grep -o 'Masuk ke DevSpace'
```

Expected: prints `Masuk ke DevSpace`. Keep the dev server running, then open `http://localhost:3000/login` in a browser and confirm the split-screen layout renders (branding panel + form), collapsing to a single column below `md` width. When done, stop the dev server:

```bash
kill %1
```

- [ ] **Step 6: Commit**

```bash
git add app/routes/_auth.tsx app/routes/_auth.login.tsx app/routeTree.gen.ts
git commit -m "feat: add /login route with split-screen AuthLayout"
```

---

## Task 10: Dashboard Shell Route + Home Page

**Files:**
- Delete: `app/routes/index.tsx`
- Create: `app/routes/_dashboard.tsx`
- Create: `app/routes/_dashboard.index.tsx`

- [ ] **Step 1: Remove the default scaffold route**

```bash
rm app/routes/index.tsx
```

- [ ] **Step 2: Create `app/routes/_dashboard.tsx`**

```tsx
import { Outlet, createFileRoute } from '@tanstack/react-router'

import { DashboardShell } from '#/shared/components/layout/dashboard-shell'

export const Route = createFileRoute('/_dashboard')({
  component: DashboardLayoutRoute,
})

function DashboardLayoutRoute() {
  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  )
}
```

- [ ] **Step 3: Create `app/routes/_dashboard.index.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { Activity, Folder, Package, Server, ShieldCheck } from 'lucide-react'

import { AppGrid } from '#/shared/components/layout/app-grid'
import type { AppTileConfig } from '#/shared/components/layout/app-tile'
import { StatWidget } from '#/shared/components/layout/stat-widget'

export const Route = createFileRoute('/_dashboard/')({
  component: DashboardHome,
})

const MODULE_TILES: AppTileConfig[] = [
  {
    title: 'Projects',
    description: 'Kelola project dan environment tim',
    href: '/projects',
    icon: Folder,
    accent: 'primary',
  },
  {
    title: 'Infrastructure',
    description: 'Environment Portainer yang terhubung',
    href: '/infrastructure',
    icon: Server,
    accent: 'info',
  },
  {
    title: 'Administration',
    description: 'Users, roles, dan audit log',
    href: '/administration',
    icon: ShieldCheck,
    accent: 'secondary',
  },
]

function DashboardHome() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Selamat datang kembali</h1>
        <p className="text-sm text-muted-foreground">Ringkasan singkat aktivitas DevSpace Anda.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatWidget label="Total Projects" value={6} icon={Folder} accent="primary" />
        <StatWidget label="Environments Aktif" value={3} icon={Server} accent="info" />
        <StatWidget label="Running Containers" value={18} icon={Activity} accent="success" helpText="dari 22 total" />
        <StatWidget label="Stacks" value={9} icon={Package} accent="warning" />
      </div>

      <AppGrid items={MODULE_TILES} />
    </div>
  )
}
```

- [ ] **Step 4: Regenerate the route tree**

```bash
pnpm generate-routes
```

Expected: exits 0, `app/routeTree.gen.ts` now includes `/_dashboard` and `/_dashboard/` (exposed as `/`), and no longer references the deleted `app/routes/index.tsx`.

- [ ] **Step 5: Verify types and build**

```bash
pnpm exec tsc --noEmit && pnpm build
```

Expected: `tsc` exits 0 with no output; `pnpm build` succeeds for both client and ssr.

- [ ] **Step 6: Manual check**

```bash
pnpm dev &
sleep 2
curl -s http://localhost:3000/ | grep -o 'Selamat datang kembali'
```

Expected: prints `Selamat datang kembali`. Keep the dev server running, then open `http://localhost:3000/` in a browser: confirm the stat-widget row (2 columns on mobile, 4 on desktop) and the 3-tile app-grid (1/2/3 columns across mobile/tablet/desktop) render without horizontal overflow, and each tile navigates to its `href`. When done, stop the dev server:

```bash
kill %1
```

- [ ] **Step 7: Commit**

```bash
git add -A app/routes
git commit -m "feat: add dashboard shell and home page (stat widgets + app grid)"
```

---

## Task 11: Module Sidebar & Mobile Drawer

**Files:**
- Create: `app/shared/components/layout/mobile-drawer.tsx`
- Create: `app/shared/components/layout/module-sidebar.tsx`

- [ ] **Step 1: Create `app/shared/components/layout/mobile-drawer.tsx`**

```tsx
import type { ReactNode } from 'react'
import { useState } from 'react'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '#/shared/ui/sheet'

interface MobileDrawerProps {
  title: string
  trigger: ReactNode
  children: ReactNode
}

export function MobileDrawer({ title, trigger, children }: MobileDrawerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 px-4">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Create `app/shared/components/layout/module-sidebar.tsx`**

```tsx
import type { LucideIcon } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Menu } from 'lucide-react'

import { cn } from '#/shared/lib/cn'
import { Button } from '#/shared/ui/button'

import { MobileDrawer } from './mobile-drawer'

export interface ModuleNavItem {
  title: string
  href: string
  icon: LucideIcon
}

interface ModuleSidebarProps {
  title: string
  items: ModuleNavItem[]
}

export function ModuleSidebar({ title, items }: ModuleSidebarProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  const navList = (
    <nav className="flex flex-col gap-1" aria-label={`Navigasi ${title}`}>
      {items.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
            )}
          >
            <Icon className="size-4" />
            {item.title}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:gap-1">{navList}</aside>
      <div className="md:hidden">
        <MobileDrawer
          title={title}
          trigger={
            <Button variant="outline" size="sm" className="gap-2">
              <Menu className="size-4" />
              {title}
            </Button>
          }
        >
          {navList}
        </MobileDrawer>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Verify types**

```bash
pnpm exec tsc --noEmit
```

Expected: no output, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add app/shared/components/layout/mobile-drawer.tsx app/shared/components/layout/module-sidebar.tsx
git commit -m "feat: add ModuleSidebar with mobile drawer fallback"
```

---

## Task 12: Administration Module Routes

**Files:**
- Create: `app/routes/_dashboard.administration.tsx`
- Create: `app/routes/_dashboard.administration.index.tsx`
- Create: `app/routes/_dashboard.administration.users.tsx`
- Create: `app/routes/_dashboard.administration.roles.tsx`
- Create: `app/routes/_dashboard.administration.audit-logs.tsx`

- [ ] **Step 1: Create `app/routes/_dashboard.administration.tsx`**

```tsx
import { Outlet, createFileRoute } from '@tanstack/react-router'
import { FileClock, ShieldCheck, Users } from 'lucide-react'

import { ModuleSidebar, type ModuleNavItem } from '#/shared/components/layout/module-sidebar'

export const Route = createFileRoute('/_dashboard/administration')({
  staticData: { title: 'Administration' },
  component: AdministrationLayout,
})

const ADMIN_NAV_ITEMS: ModuleNavItem[] = [
  { title: 'Users', href: '/administration/users', icon: Users },
  { title: 'Roles', href: '/administration/roles', icon: ShieldCheck },
  { title: 'Audit Logs', href: '/administration/audit-logs', icon: FileClock },
]

function AdministrationLayout() {
  return (
    <div className="flex flex-1 flex-col gap-4 md:flex-row md:gap-6">
      <ModuleSidebar title="Administration" items={ADMIN_NAV_ITEMS} />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/routes/_dashboard.administration.index.tsx`**

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/administration/')({
  beforeLoad: () => {
    throw redirect({ to: '/administration/users' })
  },
})
```

- [ ] **Step 3: Create `app/routes/_dashboard.administration.users.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/administration/users')({
  staticData: { title: 'Users' },
  component: UsersPage,
})

function UsersPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-foreground">Users</h1>
      <p className="text-sm text-muted-foreground">Daftar user akan tersedia setelah modul Users dibangun.</p>
    </div>
  )
}
```

- [ ] **Step 4: Create `app/routes/_dashboard.administration.roles.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/administration/roles')({
  staticData: { title: 'Roles' },
  component: RolesPage,
})

function RolesPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-foreground">Roles</h1>
      <p className="text-sm text-muted-foreground">Pengaturan role & permission akan tersedia setelah modul RBAC dibangun.</p>
    </div>
  )
}
```

- [ ] **Step 5: Create `app/routes/_dashboard.administration.audit-logs.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/administration/audit-logs')({
  staticData: { title: 'Audit Logs' },
  component: AuditLogsPage,
})

function AuditLogsPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-foreground">Audit Logs</h1>
      <p className="text-sm text-muted-foreground">Log aktivitas akan tersedia setelah modul Audit Log dibangun.</p>
    </div>
  )
}
```

- [ ] **Step 6: Regenerate the route tree**

```bash
pnpm generate-routes
```

Expected: exits 0, `app/routeTree.gen.ts` includes `/_dashboard/administration`, `/_dashboard/administration/`, `/_dashboard/administration/users`, `/_dashboard/administration/roles`, `/_dashboard/administration/audit-logs`.

- [ ] **Step 7: Verify types and build**

```bash
pnpm exec tsc --noEmit && pnpm build
```

Expected: `tsc` exits 0 with no output; `pnpm build` succeeds for both client and ssr.

- [ ] **Step 8: Manual check**

```bash
pnpm dev &
sleep 2
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/administration
curl -s http://localhost:3000/administration/roles | grep -o 'Pengaturan role'
```

Expected: first line shows a redirect (`307`/`302`) toward `/administration/users`; second command prints `Pengaturan role`. Keep the dev server running, then in a browser confirm the breadcrumb reads `Administration / Roles`, the desktop layout shows a left sidebar with `Users/Roles/Audit Logs`, and shrinking below `md` replaces the sidebar with an "Administration" button that opens a left-side drawer with the same links. When done, stop the dev server:

```bash
kill %1
```

- [ ] **Step 9: Commit**

```bash
git add -A app/routes
git commit -m "feat: add Administration module routes with contextual sidebar"
```

---

## Task 13: Projects & Infrastructure Placeholder Routes

**Files:**
- Create: `app/routes/_dashboard.projects.tsx`
- Create: `app/routes/_dashboard.infrastructure.tsx`

- [ ] **Step 1: Create `app/routes/_dashboard.projects.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/projects')({
  staticData: { title: 'Projects' },
  component: ProjectsPage,
})

function ProjectsPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
      <p className="text-sm text-muted-foreground">Project CRUD akan tersedia pada implementasi Sprint 1.</p>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/routes/_dashboard.infrastructure.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/infrastructure')({
  staticData: { title: 'Infrastructure' },
  component: InfrastructurePage,
})

function InfrastructurePage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-foreground">Infrastructure</h1>
      <p className="text-sm text-muted-foreground">Daftar environment Portainer akan tersedia pada implementasi Sprint 2.</p>
    </div>
  )
}
```

- [ ] **Step 3: Regenerate the route tree**

```bash
pnpm generate-routes
```

Expected: exits 0, `app/routeTree.gen.ts` includes `/_dashboard/projects` and `/_dashboard/infrastructure`.

- [ ] **Step 4: Verify types and build**

```bash
pnpm exec tsc --noEmit && pnpm build
```

Expected: `tsc` exits 0 with no output; `pnpm build` succeeds for both client and ssr.

- [ ] **Step 5: Commit**

```bash
git add -A app/routes
git commit -m "feat: add Projects and Infrastructure placeholder routes"
```

---

## Task 14: Final Integration & Manual QA Pass

**Files:** none (verification only)

- [ ] **Step 1: Full type-check and build**

```bash
pnpm exec tsc --noEmit && pnpm build
```

Expected: both succeed with no errors.

- [ ] **Step 2: Start the dev server for manual QA**

```bash
pnpm dev &
sleep 2
```

- [ ] **Step 3: Responsive check**

In a browser at `http://localhost:3000/`, use devtools responsive mode to check three widths: **375px** (mobile), **768px** (tablet), **1440px** (desktop):
- No horizontal scrollbar appears on `/`, `/login`, `/administration/users`, `/projects`.
- App-grid: 1 column at 375px, 2 columns at 768px, 3 columns at 1440px.
- Stat widgets: 2 columns at 375px, 4 columns at 1440px.
- `/administration/*`: sidebar hidden below `md` (replaced by the "Administration" drawer button), visible as a static column at `md` and above.
- `/login`: branding panel stacks above the form below `md`, sits beside it at `md` and above.

- [ ] **Step 4: Theme check**

On any page, open devtools console and run:

```js
localStorage.setItem('devspace-theme', 'dark')
location.reload()
```

Expected: page renders dark from first paint (no flash), all text remains legible (check header, cards, tiles, breadcrumb, dropdown menu, drawer). Toggle back with `localStorage.setItem('devspace-theme', 'light'); location.reload()` and confirm light mode looks correct too. Also click the sun/moon icon button in the header and confirm it toggles instantly without a reload.

- [ ] **Step 5: Keyboard & accessibility check**

On `/`, press `Tab` repeatedly from the top of the page: focus should move through the logo, search input, notification button, theme toggle, avatar menu, then each app tile — every focused element must show a visible ring. On `/administration/users` at mobile width, tab to the "Administration" button, press `Enter` to open the drawer, confirm focus moves inside it and `Escape` closes it and returns focus to the trigger.

- [ ] **Step 6: Stop the dev server**

```bash
kill %1
```

- [ ] **Step 7: Final commit (only if QA required fixes)**

If Steps 3–5 surfaced issues, fix them in the relevant component/route file from earlier tasks, re-run Steps 1–6, then commit:

```bash
git add -A
git commit -m "fix: address responsive/theme/accessibility QA findings"
```

If no issues were found, no commit is needed for this task.

---

## Out of Scope (unchanged from spec)

- Real authentication logic, session handling, route protection.
- Real data from PostgreSQL/Portainer — all figures/lists in this plan are explicit placeholders.
- RBAC-based UI enforcement (hiding the Administration tile for non-admins, etc).
- Automated tests — this project has not yet chosen a test runner (see `docs/superpowers/plans/2026-08-12-tanstack-start-scaffolding.md`); verification here is manual per Task 14, consistent with the approved spec's Testing section.
