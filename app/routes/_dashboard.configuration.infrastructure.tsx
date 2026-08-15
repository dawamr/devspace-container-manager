import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus, Server, Trash2 } from 'lucide-react'

import { listEnvironmentsFn } from '#/modules/environments/server/list-environments'
import { createEnvironmentFn } from '#/modules/environments/server/create-environment'
import { deleteEnvironmentFn } from '#/modules/environments/server/delete-environment'
import { listProjectsFn } from '#/modules/projects/server/list-projects'
import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import { Label } from '#/shared/ui/label'
import { Checkbox } from '#/shared/ui/checkbox'
import { PageHeader } from '#/shared/ui/glass-card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '#/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/shared/ui/select'

export const Route = createFileRoute('/_dashboard/configuration/infrastructure')({
  staticData: { title: 'Infrastructure' },
  component: InfrastructurePage,
})

type Environment = {
  id: string
  projectId: string
  name: string
  dockerHost: string
  dockerCertPath: string | null
  tlsEnabled: boolean
  createdAt: Date
}

type Project = {
  id: string
  name: string
}

function InfrastructurePage() {
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loaded, setLoaded] = useState(false)

  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [projectId, setProjectId] = useState('')
  const [name, setName] = useState('')
  const [dockerHost, setDockerHost] = useState('')
  const [dockerCertPath, setDockerCertPath] = useState('')
  const [tlsEnabled, setTlsEnabled] = useState(false)

  const [selectedProject, setSelectedProject] = useState('')

  async function load() {
    try {
      const projs = await listProjectsFn()
      setProjects(projs as Project[])
      if (projs.length > 0) {
        setSelectedProject(projs[0].id)
        await loadEnvironments(projs[0].id)
      }
    } catch {
      setProjects([])
    }
    setLoaded(true)
  }

  async function loadEnvironments(pid: string) {
    try {
      const data = await listEnvironmentsFn({ data: { projectId: pid } })
      setEnvironments(data as Environment[])
    } catch {
      setEnvironments([])
    }
  }

  function handleProjectChange(pid: string) {
    setSelectedProject(pid)
    void loadEnvironments(pid)
  }

  if (!loaded) {
    void load()
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await createEnvironmentFn({
        data: {
          projectId,
          name,
          dockerHost,
          dockerCertPath: dockerCertPath || null,
          tlsEnabled,
        },
      })
      setName('')
      setDockerHost('')
      setDockerCertPath('')
      setTlsEnabled(false)
      setOpen(false)
      await loadEnvironments(selectedProject || projectId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat environment')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteEnvironmentFn({ data: { id } })
      setEnvironments((prev) => prev.filter((env) => env.id !== id))
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Infrastructure" description="Kelola Docker host environment per project">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={projects.length === 0}>
              <Plus className="mr-2 size-4" />
              Environment Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Environment Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="env-project">Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="env-project">
                    <SelectValue placeholder="Pilih project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="env-name">Nama Environment</Label>
                <Input
                  id="env-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Production Host"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="env-host">Docker Host</Label>
                <Input
                  id="env-host"
                  value={dockerHost}
                  onChange={(e) => setDockerHost(e.target.value)}
                  placeholder="unix:///var/run/docker.sock"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="env-cert">Docker Cert Path (opsional)</Label>
                <Input
                  id="env-cert"
                  value={dockerCertPath}
                  onChange={(e) => setDockerCertPath(e.target.value)}
                  placeholder="/path/to/certs"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="env-tls"
                  checked={tlsEnabled}
                  onCheckedChange={(c) => setTlsEnabled(c === true)}
                />
                <Label htmlFor="env-tls" className="cursor-pointer">
                  TLS Enabled
                </Label>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Batal
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={submitting || !projectId}>
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {projects.length === 0 ? (
        <p className="text-sm text-white/60">
          Buat project terlebih dahulu sebelum menambah environment.
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <Label htmlFor="project-filter">Project</Label>
          <Select value={selectedProject} onValueChange={handleProjectChange}>
            <SelectTrigger id="project-filter" className="w-64">
              <SelectValue placeholder="Pilih project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {environments.length === 0 ? (
        <p className="text-sm text-white/60">
          Belum ada environment untuk project ini.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {environments.map((env) => (
            <div
              key={env.id}
              className="group relative flex items-start gap-3 rounded-[var(--glass-radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-surface)] p-4 backdrop-blur-[var(--glass-blur-sm)]"
            >
              <Link
                to="/configuration/projects/$projectId/environments/$environmentId/containers"
                params={{
                  projectId: selectedProject,
                  environmentId: env.id,
                }}
                className="flex min-w-0 flex-1 items-start gap-3"
              >
                <Server className="mt-0.5 size-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-card-foreground group-hover:text-primary">
                    {env.name}
                  </h3>
                  <p className="truncate text-sm text-white/60">{env.dockerHost}</p>
                  {env.tlsEnabled && (
                    <span className="mt-1 inline-block rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/70">
                      TLS
                    </span>
                  )}
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(env.id)}
                aria-label="Hapus environment"
              >
                <Trash2 className="size-4 text-white/60" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
