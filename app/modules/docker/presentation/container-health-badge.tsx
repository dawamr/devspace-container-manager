import { Badge } from '#/shared/ui/badge'
import type { ContainerHealth } from '#/modules/docker/domain/docker-types'

const HEALTH_STYLES: Record<ContainerHealth, string> = {
  healthy: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  unhealthy: 'bg-red-500/20 text-red-300 border-red-500/30',
  starting: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  none: 'bg-white/10 text-white/50 border-white/20',
}

export function HealthBadge({ health }: { health: ContainerHealth }) {
  if (health === 'none') return null
  return (
    <Badge variant="outline" className={HEALTH_STYLES[health]}>
      {health}
    </Badge>
  )
}
