import type Docker from 'dockerode'

export type ContainerHealth = 'healthy' | 'unhealthy' | 'starting' | 'none'

/**
 * DevSpace representation of a Docker container, decoupled from the raw
 * dockerode shape so UI/domain layers never depend on the SDK types.
 */
export interface ContainerSummary {
  id: string
  name: string // first name from Names[], leading "/" stripped
  image: string
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'dead'
  health: ContainerHealth // parsed from Status e.g. "(healthy)"
  status: string // human-readable from the Status field
  createdAt: string // ISO-8601
  ports: string[] // simplified port mapping strings
}

export interface ContainerEnvVar {
  key: string
  value: string
}

export interface ContainerPortMapping {
  containerPort: number
  protocol: string // "tcp" | "udp"
  hostIp: string | null
  hostPort: number | null // null when not published to host
}

export interface ContainerMount {
  source: string
  destination: string
  mode: string
  readOnly: boolean
}

/**
 * Rich detail view built from `GET /containers/{id}/json` (ContainerInspectInfo).
 */
export interface ContainerDetail extends ContainerSummary {
  env: ContainerEnvVar[]
  portMappings: ContainerPortMapping[]
  mounts: ContainerMount[]
  cmd: string[]
  entrypoint: string[]
  workingDir: string
  restartPolicy: string
  labels: Record<string, string>
  /** Raw inspect payload (JSON string) for full-fidelity JSON viewer. */
  raw: string
}

/**
 * Resource-usage snapshot from `GET /containers/{id}/stats?stream=false`.
 * All byte values are raw numbers — the UI formats them (KB/MB/GB).
 */
export interface ContainerStats {
  cpuPercent: number
  memoryUsage: number // bytes
  memoryLimit: number // bytes
  memoryPercent: number
  networkRx: number // bytes
  networkTx: number // bytes
  blockRead: number // bytes
  blockWrite: number // bytes
  pids: number
  readTime: string // ISO timestamp from stats `read` field
}

/**
 * Map a raw Docker stats snapshot into the `ContainerStats` domain type.
 *
 * The dockerode types are incomplete for stats, so the raw payload is typed
 * as `any`. The fields used here follow the Docker Engine API v1.45 shape:
 * `cpu_stats`/`precpu_stats` (CPU), `memory_stats` (memory),
 * `networks` (network), `blkio_stats` (block I/O), `pids_stats` (PIDs).
 *
 * Edge cases:
 * - First stats read: `precpu_stats` may be empty → cpuPercent = 0
 * - Stopped container: fields may be absent → all zeros
 * - `online_cpus` missing: default to 1
 */
export function mapContainerStats(raw: any): ContainerStats {
  // CPU % — delta-based, requires precpu_stats
  const cpuUsage = raw?.cpu_stats?.cpu_usage?.total_usage ?? 0
  const preCpuUsage = raw?.precpu_stats?.cpu_usage?.total_usage ?? 0
  const systemCpu = raw?.cpu_stats?.system_cpu_usage ?? 0
  const preSystemCpu = raw?.precpu_stats?.system_cpu_usage ?? 0
  const onlineCpus = raw?.cpu_stats?.online_cpus ?? 1

  const cpuDelta = cpuUsage - preCpuUsage
  const systemDelta = systemCpu - preSystemCpu
  const cpuPercent =
    systemDelta > 0 ? (cpuDelta / systemDelta) * onlineCpus * 100 : 0

  // Memory
  const memoryUsage = raw?.memory_stats?.usage ?? 0
  const memoryLimit = raw?.memory_stats?.limit ?? 0
  const memoryPercent =
    memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0

  // Network — sum all interfaces
  let networkRx = 0
  let networkTx = 0
  if (raw?.networks && typeof raw.networks === 'object') {
    for (const iface of Object.values(raw.networks) as any[]) {
      networkRx += iface?.rx_bytes ?? 0
      networkTx += iface?.tx_bytes ?? 0
    }
  }

  // Block I/O — sum io_service_bytes_recursive
  let blockRead = 0
  let blockWrite = 0
  const blkioEntries = raw?.blkio_stats?.io_service_bytes_recursive
  if (Array.isArray(blkioEntries)) {
    for (const entry of blkioEntries) {
      if (entry?.op === 'read') blockRead += entry.value ?? 0
      if (entry?.op === 'write') blockWrite += entry.value ?? 0
    }
  }

  return {
    cpuPercent,
    memoryUsage,
    memoryLimit,
    memoryPercent,
    networkRx,
    networkTx,
    blockRead,
    blockWrite,
    pids: raw?.pids_stats?.current ?? 0,
    readTime: raw?.read ?? '',
  }
}

/**
 * Minimal subset of `GET /info` that DevSpace surfaces in the UI.
 * dockerode types `info()` as `any`, so we model the fields we consume.
 */
export interface DockerInfo {
  Id: string
  Name: string
  ServerVersion: string
  Containers: number
  ContainersRunning: number
  ContainersPaused: number
  ContainersStopped: number
  Images: number
  OperatingSystem: string
  Architecture: string
  NCPU: number
  MemTotal: number
}

const KNOWN_STATES: ReadonlySet<string> = new Set([
  'running',
  'exited',
  'paused',
  'restarting',
  'dead',
])

function normalizeState(state: string): ContainerSummary['state'] {
  return KNOWN_STATES.has(state) ? (state as ContainerSummary['state']) : 'exited'
}

export function normalizeHealth(status: string): ContainerHealth {
  const match = /\((healthy|unhealthy|starting)\)/i.exec(status)
  return match ? (match[1].toLowerCase() as ContainerHealth) : 'none'
}

export function mapPorts(ports: Docker.ContainerInfo['Ports']): string[] {
  if (!ports) return []
  return ports.map((p) => {
    if (p.PublicPort) {
      const ip = p.IP && p.IP !== '0.0.0.0' ? `${p.IP}:` : ''
      return `${ip}${p.PublicPort}->${p.PrivatePort}/${p.Type}`
    }
    return `${p.PrivatePort}/${p.Type}`
  })
}

export function mapContainerInfo(info: Docker.ContainerInfo): ContainerSummary {
  const rawName = info.Names?.[0] ?? ''
  return {
    id: info.Id,
    name: rawName.replace(/^\//, ''),
    image: info.Image,
    state: normalizeState(info.State),
    health: normalizeHealth(info.Status ?? ''),
    status: info.Status,
    createdAt: new Date(info.Created * 1000).toISOString(),
    ports: mapPorts(info.Ports),
  }
}

function mapEnv(env: string[] | undefined): ContainerEnvVar[] {
  if (!env) return []
  return env.map((entry) => {
    const eq = entry.indexOf('=')
    if (eq === -1) return { key: entry, value: '' }
    return { key: entry.slice(0, eq), value: entry.slice(eq + 1) }
  })
}

function mapInspectPorts(
  ports: Docker.ContainerInspectInfo['NetworkSettings']['Ports'] | undefined,
): ContainerPortMapping[] {
  if (!ports) return []
  const mappings: ContainerPortMapping[] = []
  for (const [key, bindings] of Object.entries(ports)) {
    const [portStr, protocol] = key.split('/')
    const containerPort = Number(portStr)
    if (!bindings || bindings.length === 0) {
      mappings.push({ containerPort, protocol, hostIp: null, hostPort: null })
      continue
    }
    for (const binding of bindings) {
      mappings.push({
        containerPort,
        protocol,
        hostIp: binding.HostIp || null,
        hostPort: binding.HostPort ? Number(binding.HostPort) : null,
      })
    }
  }
  return mappings
}

export function mapContainerInspect(info: Docker.ContainerInspectInfo): ContainerDetail {
  const name = (info.Name ?? '').replace(/^\//, '')
  const healthStatus = info.State?.Health?.Status
  return {
    id: info.Id,
    name,
    image: info.Config?.Image ?? '',
    state: normalizeState(info.State?.Status ?? ''),
    health: healthStatus ? normalizeHealth(`(${healthStatus})`) : 'none',
    status: info.State?.Status ?? '',
    createdAt: info.Created ?? '',
    ports: [], // summary port strings only available on list(); detail uses portMappings
    env: mapEnv(info.Config?.Env),
    portMappings: mapInspectPorts(info.NetworkSettings?.Ports),
    mounts: (info.Mounts ?? []).map((m) => ({
      source: m.Source,
      destination: m.Destination,
      mode: m.Mode,
      readOnly: !m.RW,
    })),
    cmd: info.Config?.Cmd ?? [],
    entrypoint:
      typeof info.Config?.Entrypoint === 'string'
        ? [info.Config.Entrypoint]
        : (info.Config?.Entrypoint ?? []),
    workingDir: info.Config?.WorkingDir ?? '',
    restartPolicy: info.HostConfig?.RestartPolicy?.Name ?? '',
    labels: info.Config?.Labels ?? {},
    raw: JSON.stringify(info),
  }
}
