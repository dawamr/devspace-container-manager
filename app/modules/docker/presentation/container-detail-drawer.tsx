import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Tabs } from 'radix-ui'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/shared/ui/sheet'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/shared/ui/table'
import { cn } from '#/shared/lib/cn'
import type { ContainerSummary, ContainerDetail } from '#/modules/docker/domain/docker-types'
import { inspectContainerFn } from '#/modules/docker/server/inspect-container'
import { HealthBadge } from '#/modules/docker/presentation/container-health-badge'

interface ContainerDetailDrawerProps {
  environmentId: string
  container: ContainerSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function StatField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  )
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

export function ContainerDetailDrawer({
  environmentId,
  container,
  open,
  onOpenChange,
}: ContainerDetailDrawerProps) {
  const [showSecrets, setShowSecrets] = useState(false)

  const { data: detail, isLoading } = useQuery({
    queryKey: ['container-detail', environmentId, container?.id],
    queryFn: async (): Promise<ContainerDetail> =>
      inspectContainerFn({
        data: { environmentId, containerId: container!.id },
      }) as Promise<ContainerDetail>,
    enabled: open && !!container,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            {container?.name ?? 'Container'}
            {container && <HealthBadge health={container.health} />}
          </SheetTitle>
          <SheetDescription className="font-mono text-xs break-all">
            {container?.id ?? ''}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted-foreground">
            Loading container details…
          </div>
        ) : !detail ? (
          <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted-foreground">
            No details available.
          </div>
        ) : (
          <Tabs.Root defaultValue="overview" className="flex flex-1 flex-col overflow-hidden">
            <Tabs.List className="flex shrink-0 gap-1 border-b px-4 pt-3">
              <Tabs.Trigger
                value="overview"
                className={cn(
                  'rounded-t-md px-3 py-1.5 text-sm font-medium text-muted-foreground',
                  'data-[state=active]:bg-muted data-[state=active]:text-foreground',
                )}
              >
                Overview
              </Tabs.Trigger>
              <Tabs.Trigger
                value="ports"
                className={cn(
                  'rounded-t-md px-3 py-1.5 text-sm font-medium text-muted-foreground',
                  'data-[state=active]:bg-muted data-[state=active]:text-foreground',
                )}
              >
                Ports
              </Tabs.Trigger>
              <Tabs.Trigger
                value="env"
                className={cn(
                  'rounded-t-md px-3 py-1.5 text-sm font-medium text-muted-foreground',
                  'data-[state=active]:bg-muted data-[state=active]:text-foreground',
                )}
              >
                Environment
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content
              value="overview"
              className="flex-1 overflow-y-auto p-4 data-[state=inactive]:hidden"
            >
              <dl className="grid grid-cols-2 gap-4">
                <StatField label="Image">
                  <span className="font-mono text-xs break-all">{detail.image}</span>
                </StatField>
                <StatField label="State">
                  <Badge variant="outline" className="capitalize">
                    {detail.state}
                  </Badge>
                </StatField>
                <StatField label="Status">{detail.status}</StatField>
                <StatField label="Health">
                  <HealthBadge health={detail.health} />
                </StatField>
                <StatField label="Created">{formatDate(detail.createdAt)}</StatField>
                <StatField label="Restart Policy">
                  {detail.restartPolicy || '—'}
                </StatField>
                <StatField label="Command">
                  <span className="font-mono text-xs break-all">
                    {detail.cmd?.join(' ') || '—'}
                  </span>
                </StatField>
                <StatField label="Entrypoint">
                  <span className="font-mono text-xs break-all">
                    {detail.entrypoint?.join(' ') || '—'}
                  </span>
                </StatField>
                <StatField label="Working Dir">
                  <span className="font-mono text-xs break-all">
                    {detail.workingDir || '—'}
                  </span>
                </StatField>
              </dl>
            </Tabs.Content>

            <Tabs.Content
              value="ports"
              className="flex-1 overflow-y-auto p-4 data-[state=inactive]:hidden"
            >
              {detail.portMappings?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Container</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Protocol</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.portMappings.map((p, i) => (
                      <TableRow key={`${p.containerPort}-${p.protocol}-${i}`}>
                        <TableCell className="font-mono">
                          {p.containerPort}/{p.protocol}
                        </TableCell>
                        <TableCell className="font-mono">
                          {p.hostPort != null
                            ? `${p.hostIp ?? '0.0.0.0'}:${p.hostPort}`
                            : '—'}
                        </TableCell>
                        <TableCell>{p.protocol}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No port mappings.
                </p>
              )}
            </Tabs.Content>

            <Tabs.Content
              value="env"
              className="flex flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
            >
              <div className="flex items-center justify-between px-4 pt-3">
                <span className="text-sm text-muted-foreground">
                  {detail.env?.length ?? 0} variables
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSecrets((s) => !s)}
                >
                  {showSecrets ? 'Hide secrets' : 'Show secrets'}
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {detail.env?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.env.map((e) => (
                        <TableRow key={e.key}>
                          <TableCell className="font-mono text-xs">
                            {e.key}
                          </TableCell>
                          <TableCell className="font-mono text-xs break-all">
                            {!showSecrets ? '••••••••' : e.value}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No environment variables.
                  </p>
                )}
              </div>
            </Tabs.Content>
          </Tabs.Root>
        )}
      </SheetContent>
    </Sheet>
  )
}
