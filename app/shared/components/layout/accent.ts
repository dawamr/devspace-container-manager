export type Accent = 'primary' | 'secondary' | 'success' | 'warning' | 'info'

export const ACCENT_STYLES: Record<Accent, { surface: string; icon: string }> = {
  primary: { surface: 'bg-primary/10', icon: 'text-primary' },
  secondary: { surface: 'bg-secondary', icon: 'text-secondary-foreground' },
  success: { surface: 'bg-success/10', icon: 'text-success' },
  warning: { surface: 'bg-warning/10', icon: 'text-warning' },
  info: { surface: 'bg-info/10', icon: 'text-info' },
}
