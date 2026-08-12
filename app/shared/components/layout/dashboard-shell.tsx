import type { ReactNode } from 'react'

import { AppHeader } from './app-header'

const WALLPAPER_URL = '/assets/bg-default.jpg'

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      {/* Wallpaper layer (CasaOS-style) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${WALLPAPER_URL})` }}
      />
      {/* Scrim supaya konten tetap terbaca di area wallpaper terang */}
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-black/45" />

      <div className="relative z-10 flex min-h-svh flex-col">
        <AppHeader />
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
