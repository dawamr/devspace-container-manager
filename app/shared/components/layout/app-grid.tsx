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
