import type { LucideIcon } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Menu } from 'lucide-react'

import { cn } from '#/shared/lib/cn'
import type { RoutePath } from '#/shared/lib/route-path'
import { Button } from '#/shared/ui/button'

import { MobileDrawer } from './mobile-drawer'

export interface ModuleNavItem {
  title: string
  href: RoutePath
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
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:bg-white/5 hover:text-white',
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
