import { Link, useMatches, useNavigate, useRouterState } from '@tanstack/react-router'
import { Bell, LayoutGrid, LogOut, Search } from 'lucide-react'

import { logoutFn } from '#/modules/auth/server/logout'

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

export function AppHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const matches = useMatches()
  const navigate = useNavigate()
  const isHome = pathname === '/'

  const breadcrumbItems: BreadcrumbItem[] = matches.reduce<BreadcrumbItem[]>((items, match) => {
    const title = match.staticData.title
    if (title) items.push({ label: title, href: match.pathname })
    return items
  }, [])

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-white/10 bg-black/25 px-4 text-white backdrop-blur-xl md:px-6">
      {isHome ? (
        <Link to="/" className="flex items-center gap-2 font-semibold text-white">
          <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 text-sm text-white backdrop-blur">
            D
          </span>
          <span className="hidden sm:inline">DevSpace</span>
        </Link>
      ) : (
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Kembali ke dashboard" className="text-white hover:bg-white/10 hover:text-white">
            <Link to="/">
              <LayoutGrid className="size-5" />
            </Link>
          </Button>
          <BreadcrumbNav items={breadcrumbItems} />
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-white/60" />
          <Input
            type="search"
            placeholder="Cari project, stack, container..."
            aria-label="Pencarian global"
            className="w-64 border-white/15 bg-white/10 pl-8 text-white placeholder:text-white/50 focus-visible:ring-white/40"
          />
        </div>
        <Button variant="ghost" size="icon" aria-label="Notifikasi" className="text-white hover:bg-white/10 hover:text-white">
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
            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={async () => { await logoutFn(); navigate({ to: '/login' }) }}>
              <LogOut className="mr-2 size-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
