import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Play,
  Square,
  RotateCw,
  Loader2,
  AlertTriangle,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
} from 'lucide-react'

import type { ContainerSummary } from '#/modules/docker/domain/docker-types'
import {
  userFriendlyDockerMessage,
} from '#/modules/docker/domain/docker-error'
import { startContainerFn } from '#/modules/docker/server/start-container'
import { stopContainerFn } from '#/modules/docker/server/stop-container'
import { restartContainerFn } from '#/modules/docker/server/restart-container'
import { removeContainerFn } from '#/modules/docker/server/remove-container'
import { HealthBadge } from './container-health-badge'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/shared/ui/table'
import { Checkbox } from '#/shared/ui/checkbox'
import { cn } from '#/shared/lib/cn'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '#/shared/ui/tooltip'
import { ContainerSummaryBar } from './container-summary-bar'
import { ContainerBulkToolbar } from './container-bulk-toolbar'
import { ContainerAssigneeBadges } from './container-assignee-badges'
import type { ContainerAssignee } from '#/modules/docker/server/list-container-assignees'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/shared/ui/dialog'

type ContainerState = ContainerSummary['state']

const STATE_STYLES: Record<ContainerState, string> = {
  running: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  exited: 'bg-white/10 text-white/60 border-white/20',
  paused: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  restarting: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  dead: 'bg-red-500/20 text-red-300 border-red-500/30',
}

/** Glassmorphism base for the inline action icon-buttons. */
const ACTION_BTN_CLASS =
  'size-7 border border-[var(--glass-border)] bg-[var(--glass-surface)] backdrop-blur-[var(--glass-blur)] ' +
  'text-white/70 hover:text-white hover:bg-white/10 hover:border-[var(--glass-border-strong)] ' +
  'disabled:opacity-30 disabled:pointer-events-none'

function StateBadge({ state }: { state: ContainerState }) {
  return (
    <Badge variant="outline" className={STATE_STYLES[state]}>
      {state}
    </Badge>
  )
}

/** Resolve a user-friendly message from a server-function error. */
function errorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  // RBAC / application-level errors are not Docker errors.
  if (message.includes('FORBIDDEN')) return 'Tidak punya akses untuk aksi ini.'
  if (message.includes('UNAUTHORIZED')) return 'Sesi tidak valid, silakan login ulang.'
  if (message.includes('ENVIRONMENT_NOT_FOUND')) return 'Environment tidak ditemukan.'
  // Everything else that reaches the client from a Docker server function is
  // normalized into a DockerApiError whose message is already user-friendly;
  // userFriendlyDockerMessage also covers raw strings as a fallback.
  return userFriendlyDockerMessage(err) || message || 'Aksi gagal. Coba lagi.'
}

type ContainerTableRow = ContainerSummary & {
  environmentId?: string
  registryId?: string
  assignees?: Array<{
    userId: string
    name: string
    role: string
    assignedAt: string
  }>
}

const columnHelper = createColumnHelper<ContainerTableRow>()

interface ContainerTableProps {
  containers: ContainerTableRow[]
  environmentId: string
  onOpenDetail: (container: ContainerSummary) => void
  onRefresh?: () => void
  isGlobal?: boolean
  environments?: Map<string, { name: string; projectName: string }>
  onAssignClick?: (containerRegistryId: string, containerName: string) => void
  showSummaryBar?: boolean
  showSearchBar?: boolean
  canAssign?: boolean
  canManage?: boolean
  canDelete?: boolean
  currentUserId?: string
}

function SortHeader({
  label,
  column,
}: {
  label: string
  column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (d?: boolean) => void }
}) {
  const sorted = column.getIsSorted()
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2 text-white/70 hover:text-white hover:bg-white/10"
      onClick={(e) => {
        e.stopPropagation()
        column.toggleSorting(sorted === 'asc')
      }}
    >
      {label}
      {sorted === 'asc' ? (
        <ArrowUp className="size-3.5" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="size-3.5" />
      ) : (
        <ArrowUpDown className="size-3.5 opacity-50" />
      )}
    </Button>
  )
}

function truncateMiddle(value: string, max = 32): string {
  if (value.length <= max) return value
  const keep = Math.floor((max - 1) / 2)
  return `${value.slice(0, keep)}…${value.slice(value.length - keep)}`
}

function CopyableText({
  value,
  tooltip,
  className,
}: {
  value: string
  tooltip?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const copy = (e: MouseEvent) => {
    e.stopPropagation()
    void navigator.clipboard?.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 text-left hover:text-white"
          >
            <span className={cn('truncate', className)}>{truncateMiddle(value)}</span>
            {copied ? (
              <Check className="size-3.5 shrink-0 text-emerald-400" />
            ) : (
              <Copy className="size-3.5 shrink-0 text-white/40 hover:text-white" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>{tooltip ?? value}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function ContainerNameCell({ name, image }: { name: string; image: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <CopyableText value={name} tooltip={image} className="font-medium text-card-foreground" />
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block truncate text-xs text-white/50">{truncateMiddle(image, 40)}</span>
          </TooltipTrigger>
          <TooltipContent>{image}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

export function ContainerTable({ containers, environmentId, onOpenDetail, onRefresh, isGlobal, environments, onAssignClick, showSummaryBar = true, showSearchBar = true, canAssign = true, canManage = true, canDelete = true, currentUserId }: ContainerTableProps) {
  const queryClient = useQueryClient()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [removeTarget, setRemoveTarget] = useState<ContainerSummary | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const searchRef = useRef<HTMLInputElement>(null)

  const [activeFilter, setActiveFilter] = useState<string>('all')

  // 'unhealthy' bukan nilai `state` — pre-filter data sebelum masuk table.
  // 'running'/'exited' langsung via columnFilters kolom state.
  const tableData = useMemo(() => {
    if (activeFilter === 'unhealthy') {
      return containers.filter(
        (c) => c.health !== 'healthy' || c.state === 'dead' || c.state === 'restarting',
      )
    }
    return containers
  }, [containers, activeFilter])

  const setStatusFilter = (value: string) => {
    setActiveFilter(value)
    setColumnFilters(value === 'all' || value === 'unhealthy' ? [] : [{ id: 'state', value }])
  }

  // Keyboard shortcuts: f = focus search, r = refresh, Esc = clear search.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = document.activeElement
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      if (e.key === 'f' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'r' && !typing) {
        e.preventDefault()
        onRefresh?.()
      } else if (e.key === 'Escape' && typing && el === searchRef.current) {
        setGlobalFilter('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onRefresh])

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['containers', environmentId] })
  }

  const startMutation = useMutation({
    mutationFn: (containerId: string) =>
      startContainerFn({ data: { environmentId, containerId } }),
    onMutate: (containerId) => {
      setError(null)
      setPendingId(containerId)
    },
    onSuccess: invalidate,
    onError: (err) => setError(errorMessage(err)),
    onSettled: () => setPendingId(null),
  })

  const stopMutation = useMutation({
    mutationFn: (containerId: string) =>
      stopContainerFn({ data: { environmentId, containerId } }),
    onMutate: (containerId) => {
      setError(null)
      setPendingId(containerId)
    },
    onSuccess: invalidate,
    onError: (err) => setError(errorMessage(err)),
    onSettled: () => setPendingId(null),
  })

  const restartMutation = useMutation({
    mutationFn: (containerId: string) =>
      restartContainerFn({ data: { environmentId, containerId } }),
    onMutate: (containerId) => {
      setError(null)
      setPendingId(containerId)
    },
    onSuccess: invalidate,
    onError: (err) => setError(errorMessage(err)),
    onSettled: () => setPendingId(null),
  })

  const removeMutation = useMutation({
    mutationFn: (containerId: string) =>
      removeContainerFn({ data: { environmentId, containerId } }),
    onMutate: (containerId) => {
      setError(null)
      setPendingId(containerId)
    },
    onSuccess: () => {
      invalidate()
      setRemoveTarget(null)
    },
    onError: (err) => setError(errorMessage(err)),
    onSettled: () => setPendingId(null),
  })

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const columns = useMemo<ColumnDef<ContainerTableRow, any>[]>(() => [
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? 'indeterminate' : false}
            onCheckedChange={(checked) =>
              table.getToggleAllRowsSelectedHandler()({ target: { checked: !!checked } })
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) =>
              row.getToggleSelectedHandler()({ target: { checked: !!checked } })
            }
            onClick={(e) => e.stopPropagation()}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
      }),
      columnHelper.accessor('name', {
        header: ({ column }) => <SortHeader label="Name" column={column} />,
        cell: (info) => (
          <ContainerNameCell name={info.getValue()} image={info.row.original.image} />
        ),
      }),
      ...(isGlobal
        ? ([
            columnHelper.accessor('environmentId', {
              header: ({ column }) => <SortHeader label="Environment" column={column} />,
              cell: (info) => environments?.get(info.getValue() ?? '')?.name ?? '—',
            }),
            columnHelper.accessor(
              (row) => environments?.get(row.environmentId ?? '')?.projectName ?? '',
              {
                id: 'project',
                header: ({ column }) => <SortHeader label="Project" column={column} />,
                cell: (info) => info.getValue() || '—',
              },
            ),
          ] as ColumnDef<ContainerTableRow, any>[])
        : []),
      columnHelper.display({
        id: 'assignees',
        header: 'Assignees',
        cell: (info) => {
          const row = info.row.original
          const assignees = (row.assignees ?? []) as ContainerAssignee[]
          return (
            <ContainerAssigneeBadges
              assignees={assignees}
              onClick={
                canAssign && onAssignClick && row.registryId
                  ? () => onAssignClick(row.registryId!, row.name)
                  : undefined
              }
            />
          )
        },
      }),
      columnHelper.accessor('state', {
        header: ({ column }) => <SortHeader label="State" column={column} />,
        filterFn: 'equalsString',
        cell: (info) => (
          <div className="flex items-center gap-1.5">
            <StateBadge state={info.getValue()} />
            <HealthBadge health={info.row.original.health} />
          </div>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => <span className="text-white/70">{info.getValue()}</span>,
      }),
      columnHelper.accessor('createdAt', {
        header: ({ column }) => <SortHeader label="Created" column={column} />,
        cell: (info) => <span className="text-white/60">{formatDate(info.getValue())}</span>,
      }),
      columnHelper.accessor('ports', {
        header: 'Ports',
        cell: (info) => {
          const ports = info.getValue()
          if (!ports || ports.length === 0) {
            return <span className="text-white/40">—</span>
          }
          return (
            <div className="flex flex-wrap gap-1">
              {ports.map((p: string) => (
                <Badge key={p} variant="secondary" className="font-mono text-[10px]">
                  {p}
                </Badge>
              ))}
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => {
          const container = info.row.original
          const isPending = pendingId === container.id

          // Per-container assignment role check: if current user is
          // assigned as "observer" to this container, hide manage actions.
          const myAssignee = currentUserId
            ? container.assignees?.find((a) => a.userId === currentUserId)
            : undefined
          const isObserver = myAssignee?.role === 'observer'
          const showManage = canManage && !isObserver
          const showDelete = canDelete && !isObserver

          // Context-aware availability per container state (task spec):
          // running    → Stop + Restart
          // exited     → Start
          // paused     → Start + Stop
          // restarting → disable all (transient)
          // dead       → disable all
          const canStart = container.state === 'exited' || container.state === 'paused'
          const canStop = container.state === 'running' || container.state === 'paused'
          const canRestart = container.state === 'running'
          const locked = container.state === 'restarting' || container.state === 'dead'

          // If user has no manage/delete permissions and is not pending,
          // render a minimal placeholder to preserve row height.
          if (!showManage && !showDelete && !isPending) {
            return <span className="text-xs text-white/20">—</span>
          }

          return (
            <div className="flex items-center gap-1">
              {isPending ? (
                <Loader2 className="size-4 animate-spin text-white/50" />
              ) : (
                <>
                  {showManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={ACTION_BTN_CLASS}
                      title="Start"
                      disabled={!canStart || locked}
                      onClick={(e) => {
                        e.stopPropagation()
                        startMutation.mutate(container.id)
                      }}
                    >
                      <Play className="size-4" />
                    </Button>
                  )}
                  {showManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={ACTION_BTN_CLASS}
                      title="Stop"
                      disabled={!canStop || locked}
                      onClick={(e) => {
                        e.stopPropagation()
                        stopMutation.mutate(container.id)
                      }}
                    >
                      <Square className="size-4" />
                    </Button>
                  )}
                  {showManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={ACTION_BTN_CLASS}
                      title="Restart"
                      disabled={!canRestart || locked}
                      onClick={(e) => {
                        e.stopPropagation()
                        restartMutation.mutate(container.id)
                      }}
                    >
                      <RotateCw className="size-4" />
                    </Button>
                  )}
                  {showDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`${ACTION_BTN_CLASS} hover:border-red-500/50 hover:text-red-300`}
                      title="Remove"
                      disabled={locked}
                      onClick={(e) => {
                        e.stopPropagation()
                        setRemoveTarget(container)
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          )
        },
      }),
    ],
    [pendingId, startMutation, stopMutation, restartMutation, removeMutation, isGlobal, environments, onAssignClick, canAssign, canManage, canDelete, currentUserId],
  )

  const table = useReactTable({
    data: tableData,
    columns,
    enableRowSelection: true,
    state: { globalFilter, sorting, columnFilters, rowSelection },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, _columnId, value) => {
      const q = String(value).toLowerCase()
      const { name, image, state, status } = row.original
      return (
        name.toLowerCase().includes(q) ||
        image.toLowerCase().includes(q) ||
        state.toLowerCase().includes(q) ||
        status.toLowerCase().includes(q)
      )
    },
  })
  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="flex items-center gap-2 rounded-[var(--glass-radius)] border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showSummaryBar && (
        <ContainerSummaryBar containers={containers} active={activeFilter} onChange={setStatusFilter} />
      )}

      {Object.keys(rowSelection).length >= 1 && (
        <ContainerBulkToolbar
          selectedIds={Object.keys(rowSelection).filter((id) => rowSelection[id])}
          environmentId={environmentId}
          onClear={() => setRowSelection({})}
          canManage={canManage}
          canDelete={canDelete}
        />
      )}

      {showSearchBar && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input
            ref={searchRef}
            placeholder="Search name, image, state…  (f)"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="sm:max-w-xs"
          />
        </div>
      )}

      <div className="rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] backdrop-blur-[var(--glass-blur)]">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-white/50"
                >
                  Tidak ada container pada environment ini.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const rowState = row.original.state
                const tint =
                  rowState === 'dead'
                    ? 'border-l-2 border-l-red-500/60'
                    : rowState === 'restarting'
                      ? 'border-l-2 border-l-amber-500/60'
                      : ''
                return (
                  <TableRow
                    key={row.id}
                    className={`cursor-pointer hover:bg-white/5 ${tint}`}
                    onClick={() => onOpenDetail(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus container</DialogTitle>
            <DialogDescription>
              Anda akan menghapus container{' '}
              <span className="font-semibold text-white">{removeTarget?.name}</span>.
              {removeTarget?.state === 'running'
                ? ' Container masih running — akan di-force remove.'
                : ''}{' '}
              Aksi ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveTarget(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => removeTarget && removeMutation.mutate(removeTarget.id)}
            >
              {removeMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
