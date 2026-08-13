import { Moon, Sun } from 'lucide-react'

import { Button } from '#/shared/ui/button'
import { useTheme } from '#/shared/hooks/use-theme'

export function ThemeToggle() {
  const { toggleTheme } = useTheme()

  // The icon is chosen by CSS rather than by state: the theme-init script sets
  // `data-theme` before hydration, so a state-driven icon would mismatch the SSR output.
  return (
    <Button variant="ghost" size="icon" aria-label="Ubah tema terang atau gelap" onClick={toggleTheme}>
      <Moon className="size-5 dark:hidden" />
      <Sun className="hidden size-5 dark:block" />
    </Button>
  )
}
