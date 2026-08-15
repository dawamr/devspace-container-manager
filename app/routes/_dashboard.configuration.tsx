import { createFileRoute, Link, Outlet, useMatchRoute } from '@tanstack/react-router'

import { cn } from '#/shared/lib/cn'

export const Route = createFileRoute('/_dashboard/configuration')({
  component: ConfigurationLayout,
})

const TABS = [
  { to: '/configuration/projects', label: 'Projects' },
  { to: '/configuration/infrastructure', label: 'Infrastructure' },
]

function ConfigurationLayout() {
  const matchRoute = useMatchRoute()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Konfigurasi</h1>
          <p className="text-sm text-muted-foreground">
            Project, environment & Docker host
          </p>
        </div>
        <nav className="flex gap-1 border-b border-white/10" aria-label="Konfigurasi sub-navigation">
          {TABS.map((tab) => {
            const active = matchRoute({ to: tab.to })
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-b-2 border-primary text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
