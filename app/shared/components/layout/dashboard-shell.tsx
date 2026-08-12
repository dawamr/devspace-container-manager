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
