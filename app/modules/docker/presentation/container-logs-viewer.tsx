import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Pause, Play, Terminal } from 'lucide-react'

import { containerLogsFn, type ContainerLogLine } from '#/modules/docker/server/container-logs'
import { Button } from '#/shared/ui/button'
import { cn } from '#/shared/lib/cn'

const TAIL_OPTIONS = [50, 100, 200, 500]

interface ContainerLogsViewerProps {
  environmentId: string
  containerId: string
}

export function ContainerLogsViewer({ environmentId, containerId }: ContainerLogsViewerProps) {
  const [tail, setTail] = useState(200)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const { data: logs, isLoading, isFetching, error } = useQuery({
    queryKey: ['container-logs', environmentId, containerId, tail],
    queryFn: () =>
      containerLogsFn({
        data: { environmentId, containerId, tail, timestamps: true },
      }),
    refetchInterval: autoRefresh ? 5000 : false,
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {TAIL_OPTIONS.map((n) => (
            <Button
              key={n}
              variant={tail === n ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setTail(n)}
            >
              {n}
            </Button>
          ))}
          <span className="ml-2 text-xs text-white/50">lines</span>
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
          Loading logs…
        </div>
      ) : error ? (
        <div className="rounded-[var(--glass-radius)] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Gagal memuat logs: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : !logs || logs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] py-12 text-center">
          <Terminal className="size-8 text-white/30" />
          <p className="text-sm text-white/50">Tidak ada logs untuk container ini.</p>
        </div>
      ) : (
        <div className="relative rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-black/40 backdrop-blur-[var(--glass-blur)]">
          {isFetching && (
            <div className="absolute right-3 top-3 flex items-center gap-1 text-xs text-white/40">
              <Loader2 className="size-3 animate-spin" />
              refreshing
            </div>
          )}
          <div className="max-h-[60vh] overflow-y-auto p-4 font-mono text-xs leading-relaxed">
            {logs.map((line, i) => (
              <LogLine key={i} line={line} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LogLine({ line }: { line: ContainerLogLine }) {
  const isStderr = line.stream === 'stderr'
  return (
    <div className="flex gap-2 py-0.5">
      {line.timestamp && (
        <span className="shrink-0 text-white/30">{line.timestamp.slice(11, 19)}</span>
      )}
      <span className={cn('break-all', isStderr ? 'text-red-300' : 'text-white/80')}>
        {line.message}
      </span>
    </div>
  )
}
