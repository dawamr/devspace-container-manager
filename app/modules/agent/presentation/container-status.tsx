import { Circle, Container } from 'lucide-react'
import { cn } from '#/shared/lib/cn'

interface ContainerStatusProps {
  containerName: string | null
  status: string | null
}

export function ContainerStatus({ containerName, status }: ContainerStatusProps) {
  const isRunning = status === 'running'
  return (
    <div className="flex items-center gap-2 rounded-[var(--glass-radius)] border border-[var(--glass-border)] px-3 py-1.5 text-sm">
      <Container className="size-4 text-white/50" />
      <span className="font-medium">{containerName ?? 'No container'}</span>
      {containerName && (
        <span className="flex items-center gap-1 text-xs">
          <Circle
            className={cn(
              'size-2',
              isRunning ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500',
            )}
          />
          {status ?? 'unknown'}
        </span>
      )}
    </div>
  )
}
