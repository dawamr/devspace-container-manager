import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  Cpu,
  HardDrive,
  Hash,
  Loader2,
  MemoryStick,
  Network,
  Pause,
  Play,
} from 'lucide-react'

import { containerStatsFn } from '#/modules/docker/server/container-stats'
import { containerStatsByIdFn } from '#/modules/docker/server/container-stats-by-id'
import type { ContainerStats } from '#/modules/docker/domain/docker-types'
import { Button } from '#/shared/ui/button'
import { cn } from '#/shared/lib/cn'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

interface ContainerStatsViewerProps {
  environmentId?: string
  containerId: string
  byId?: boolean
}

export function ContainerStatsViewer({
  environmentId,
  containerId,
  byId = false,
}: ContainerStatsViewerProps) {
  const [autoRefresh, setAutoRefresh] = useState(true)

  const { data: stats, isLoading, error, isFetching } = useQuery<ContainerStats>({
    queryKey: byId
      ? ['container-stats-by-id', containerId]
      : ['container-stats', environmentId, containerId],
    queryFn: byId
      ? () => containerStatsByIdFn({ data: { containerId } })
      : () =>
          containerStatsFn({
            data: { environmentId: environmentId!, containerId },
          }),
    refetchInterval: autoRefresh ? 5000 : false,
  })

  const isStopped =
    !!stats &&
    stats.cpuPercent === 0 &&
    stats.memoryUsage === 0 &&
    stats.memoryLimit === 0 &&
    stats.networkRx === 0 &&
    stats.networkTx === 0 &&
    stats.pids === 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-white/50">
          {stats?.readTime && (
            <span>
              Last updated: {new Date(stats.readTime).toLocaleTimeString()}
            </span>
          )}
          {isFetching && (
            <span className="flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" />
              refreshing
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setAutoRefresh((v) => !v)}
        >
          {autoRefresh ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          {autoRefresh ? 'Pause' : 'Resume'}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] py-12 text-sm text-white/50">
          <Loader2 className="size-4 animate-spin" />
          Loading stats…
        </div>
      ) : error ? (
        <div className="rounded-[var(--glass-radius)] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Gagal memuat stats: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : !stats || isStopped ? (
        <div className="flex flex-col items-center gap-2 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] py-12 text-center">
          <Activity className="size-8 text-white/30" />
          <p className="text-sm text-white/50">Container tidak running.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard icon={<Cpu className="size-4" />} label="CPU">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-semibold text-white">
                {stats.cpuPercent.toFixed(2)}%
              </span>
            </div>
            <ProgressBar
              pct={Math.min(stats.cpuPercent, 100)}
              className="bg-emerald-500"
            />
          </StatCard>

          <StatCard icon={<MemoryStick className="size-4" />} label="Memory">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-semibold text-white">
                {formatBytes(stats.memoryUsage)} / {formatBytes(stats.memoryLimit)}
              </span>
              <span className="text-xs text-white/50">
                {stats.memoryPercent.toFixed(1)}%
              </span>
            </div>
            <ProgressBar
              pct={stats.memoryPercent}
              className="bg-blue-500"
            />
          </StatCard>

          <StatCard icon={<Network className="size-4" />} label="Network I/O">
            <div className="flex items-center gap-3 text-sm text-white/80">
              <span>
                <span className="text-white/40">↓ RX</span>{' '}
                {formatBytes(stats.networkRx)}
              </span>
              <span>
                <span className="text-white/40">↑ TX</span>{' '}
                {formatBytes(stats.networkTx)}
              </span>
            </div>
          </StatCard>

          <StatCard icon={<HardDrive className="size-4" />} label="Block I/O">
            <div className="flex items-center gap-3 text-sm text-white/80">
              <span>
                <span className="text-white/40">read</span>{' '}
                {formatBytes(stats.blockRead)}
              </span>
              <span>
                <span className="text-white/40">write</span>{' '}
                {formatBytes(stats.blockWrite)}
              </span>
            </div>
          </StatCard>

          <StatCard icon={<Hash className="size-4" />} label="PIDs">
            <span className="text-lg font-semibold text-white">{stats.pids}</span>
          </StatCard>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] p-4',
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-white/50">
        {icon}
        {label}
      </div>
      {children}
    </div>
  )
}

function ProgressBar({
  pct,
  className,
}: {
  pct: number
  className?: string
}) {
  return (
    <div className="h-2 rounded-full bg-white/10">
      <div
        className={cn('h-2 rounded-full', className ?? 'bg-primary')}
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
      />
    </div>
  )
}
