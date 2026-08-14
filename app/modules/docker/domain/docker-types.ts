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

function normalizeHealth(status: string): ContainerHealth {
  const match = /\((healthy|unhealthy|starting)\)/i.exec(status)
  return match ? (match[1].toLowerCase() as ContainerHealth) : 'none'
}

function mapPorts(ports: Docker.ContainerInfo['Ports']): string[] {
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
