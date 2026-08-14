import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ChevronDown, Loader2, Search, FileJson } from 'lucide-react'

import { inspectContainerFn } from '#/modules/docker/server/inspect-container'
import type { ContainerDetail } from '#/modules/docker/domain/docker-types'
import { Input } from '#/shared/ui/input'
import { cn } from '#/shared/lib/cn'

interface ContainerInspectViewerProps {
  environmentId: string
  containerId: string
}

export function ContainerInspectViewer({ environmentId, containerId }: ContainerInspectViewerProps) {
  const [search, setSearch] = useState('')

  const { data: detail, isLoading, error } = useQuery({
    queryKey: ['container-inspect', environmentId, containerId],
    queryFn: async (): Promise<ContainerDetail> =>
      inspectContainerFn({ data: { environmentId, containerId } }) as Promise<ContainerDetail>,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] py-12 text-sm text-white/50">
        <Loader2 className="size-4 animate-spin" />
        Loading inspect data…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-[var(--glass-radius)] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        Gagal memuat inspect: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] py-12 text-center">
        <FileJson className="size-8 text-white/30" />
        <p className="text-sm text-white/50">Tidak ada inspect data.</p>
      </div>
    )
  }

  const rawData: unknown = detail.raw ? JSON.parse(detail.raw) : detail

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
        <Input
          placeholder="Filter keys or values…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-black/40 backdrop-blur-[var(--glass-blur)]">
        <div className="max-h-[60vh] overflow-y-auto p-4">
          <JsonTree data={rawData} search={search.toLowerCase()} />
        </div>
      </div>
    </div>
  )
}

interface JsonTreeProps {
  data: unknown
  search: string
  depth?: number
}

function JsonTree({ data, search, depth = 0 }: JsonTreeProps) {
  if (data === null) {
    return <span className="text-white/40">null</span>
  }

  if (typeof data === 'boolean') {
    return <span className="text-amber-400">{String(data)}</span>
  }

  if (typeof data === 'number') {
    return <span className="text-sky-400">{data}</span>
  }

  if (typeof data === 'string') {
    return <span className="text-emerald-400">"{data}"</span>
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-white/40">[]</span>
    return <JsonArray items={data} search={search} depth={depth} />
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>)
    if (entries.length === 0) return <span className="text-white/40">{`{}`}</span>
    return <JsonObject entries={entries} search={search} depth={depth} />
  }

  return <span className="text-white/70">{String(data)}</span>
}

function matchSearch(key: string, value: unknown, search: string): boolean {
  if (!search) return true
  if (key.toLowerCase().includes(search)) return true
  if (typeof value === 'string' && value.toLowerCase().includes(search)) return true
  if (typeof value === 'number' && String(value).includes(search)) return true
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value).toLowerCase().includes(search)
  }
  return false
}

function JsonObject({
  entries,
  search,
  depth,
}: {
  entries: [string, unknown][]
  search: string
  depth: number
}) {
  const [collapsed, setCollapsed] = useState(depth >= 2)

  const filtered = search
    ? entries.filter(([k, v]) => matchSearch(k, v, search))
    : entries

  if (filtered.length === 0 && search) {
    return null
  }

  return (
    <div className={cn(depth > 0 && 'ml-4 border-l border-white/10 pl-2')}>
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-1 text-white/60 hover:text-white"
      >
        {collapsed ? (
          <ChevronRight className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )}
        <span className="text-white/40">{`{${filtered.length}}`}</span>
      </button>
      {collapsed ? null : (
        <div className="flex flex-col">
          {filtered.map(([key, value]) => (
            <div key={key} className="flex flex-col py-0.5">
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-mono text-xs text-sky-300">"{key}"</span>
                <span className="text-white/40">:</span>
                {typeof value === 'object' && value !== null ? (
                  <JsonTree data={value} search={search} depth={depth + 1} />
                ) : (
                  <JsonTree data={value} search={search} depth={depth + 1} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function JsonArray({
  items,
  search,
  depth,
}: {
  items: unknown[]
  search: string
  depth: number
}) {
  const [collapsed, setCollapsed] = useState(depth >= 2)

  const filtered = search
    ? items.filter((v) => matchSearch('', v, search))
    : items

  if (filtered.length === 0 && search) return null

  return (
    <div className={cn(depth > 0 && 'ml-4 border-l border-white/10 pl-2')}>
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-1 text-white/60 hover:text-white"
      >
        {collapsed ? (
          <ChevronRight className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )}
        <span className="text-white/40">{`[${filtered.length}]`}</span>
      </button>
      {collapsed ? null : (
        <div className="flex flex-col">
          {filtered.map((item, i) => (
            <div key={i} className="flex items-baseline gap-2 py-0.5">
              <span className="shrink-0 text-xs text-white/40">{i}:</span>
              <JsonTree data={item} search={search} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
