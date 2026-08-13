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
              {index > 0 ? <ChevronRight className="size-3.5 shrink-0 text-white/60" /> : null}
              {isLast ? (
                <span className="truncate text-sm font-medium text-white" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link to={item.href} className="truncate text-sm text-white/60 hover:text-white">
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
