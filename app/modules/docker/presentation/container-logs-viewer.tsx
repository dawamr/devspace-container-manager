import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Loader2, Pause, Play, Search, Terminal } from 'lucide-react'

import { containerLogsFn, type ContainerLogLine } from '#/modules/docker/server/container-logs'
import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import { cn } from '#/shared/lib/cn'

const TAIL_OPTIONS = [50, 100, 200, 500]

const SINCE_OPTIONS = [
  { label: '5m', seconds: 5 * 60 },
  { label: '15m', seconds: 15 * 60 },
  { label: '1h', seconds: 60 * 60 },
  { label: 'all', seconds: 0 },
] as const

type StreamFilter = 'all' | 'stdout' | 'stderr'

interface ContainerLogsViewerProps {
  environmentId: string
  containerId: string
}

export function ContainerLogsViewer({ environmentId, containerId }: ContainerLogsViewerProps) {
  const [tail, setTail] = useState(200)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [search, setSearch] = useState('')
  const [streamFilter, setStreamFilter] = useState<StreamFilter>('all')
  const [showTimestamps, setShowTimestamps] = useState(true)
  const [since, setSince] = useState<number>(0) // 0 = no since filter

  const searchRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)

  const sinceValue = since > 0 ? Math.floor(Date.now() / 1000) - since : undefined

  const { data: logs, isLoading, isFetching, error } = useQuery({
    queryKey: ['container-logs', environmentId, containerId, tail, sinceValue],
    queryFn: () =>
      containerLogsFn({
        data: { environmentId, containerId, tail, since: sinceValue, timestamps: true },
      }),
    refetchInterval: autoRefresh ? 5000 : false,
  })

  // Client-side filtering: search + stream.
  const filteredLogs = useMemo(() => {
    if (!logs) return []
    const q = search.trim().toLowerCase()
    return logs.filter((line) => {
      if (streamFilter !== 'all' && line.stream !== streamFilter) return false
      if (q && !line.message.toLowerCase().includes(q)) return false
      return true
    })
  }, [logs, search, streamFilter])

  // Track whether the user is near the bottom of the scroll container.
  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50
  }

  // Auto-scroll to bottom when new logs arrive (only if already near bottom).
  useEffect(() => {
    if (!autoRefresh || !isNearBottomRef.current) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [filteredLogs.length, autoRefresh])

  // Keyboard shortcut: '/' focuses search input (skip if typing in an input).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = document.activeElement
      const typing =
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleDownload = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.stream}] ${l.message}`)
      .join('\n')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `container-${containerId.slice(0, 12)}-logs.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tail selector */}
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
            <span className="ml-1 text-xs text-white/50">lines</span>
          </div>

          {/* Since time selector */}
          <div className="flex items-center gap-1 border-l border-[var(--glass-border)] pl-2">
            {SINCE_OPTIONS.map((opt) => (
              <Button
                key={opt.label}
                variant={since === opt.seconds ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => setSince(opt.seconds)}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {/* Stream filter */}
          <div className="flex items-center gap-1 border-l border-[var(--glass-border)] pl-2">
            {(['all', 'stdout', 'stderr'] as const).map((s) => (
              <Button
                key={s}
                variant={streamFilter === s ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => setStreamFilter(s)}
              >
                {s === 'all' ? 'All' : s === 'stdout' ? 'stdout' : 'stderr'}
              </Button>
            ))}
          </div>

          {/* Timestamp toggle */}
          <Button
            variant={showTimestamps ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-2.5 text-xs"
            onClick={() => setShowTimestamps((v) => !v)}
          >
            Timestamps
          </Button>

          {/* Line count badge */}
          <span className="rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-2 py-1 text-xs text-white/60">
            {filteredLogs.length} lines
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/40" />
            <Input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs…  (press /)"
              className="h-8 w-48 pl-8 text-xs"
            />
          </div>

          {/* Download button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleDownload}
            disabled={filteredLogs.length === 0}
          >
            <Download className="size-3.5" />
            Export
          </Button>

          {/* Auto-refresh toggle */}
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
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] py-12 text-center">
          <Search className="size-8 text-white/30" />
          <p className="text-sm text-white/50">Tidak ada logs yang cocok dengan filter.</p>
        </div>
      ) : (
        <div className="relative rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-black/40 backdrop-blur-[var(--glass-blur)]">
          {isFetching && (
            <div className="absolute right-3 top-3 flex items-center gap-1 text-xs text-white/40">
              <Loader2 className="size-3 animate-spin" />
              refreshing
            </div>
          )}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="max-h-[60vh] overflow-y-auto p-4 font-mono text-xs leading-relaxed"
          >
            {filteredLogs.map((line, i) => (
              <LogLine key={i} line={line} showTimestamp={showTimestamps} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LogLine({
  line,
  showTimestamp,
}: {
  line: ContainerLogLine
  showTimestamp: boolean
}) {
  const isStderr = line.stream === 'stderr'
  return (
    <div className="flex gap-2 py-0.5">
      {showTimestamp && line.timestamp && (
        <span className="shrink-0 text-white/30">{line.timestamp.slice(11, 19)}</span>
      )}
      <span className={cn('break-all', isStderr ? 'text-red-300' : 'text-white/80')}>
        {line.message}
      </span>
    </div>
  )
}
