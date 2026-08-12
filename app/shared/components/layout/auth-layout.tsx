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
