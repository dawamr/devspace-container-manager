import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Folder, Plus } from 'lucide-react'

import { listProjectsFn } from '#/modules/projects/server/list-projects'
import { createProjectFn } from '#/modules/projects/server/create-project'
import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import { Label } from '#/shared/ui/label'

export const Route = createFileRoute('/_dashboard/projects')({
  staticData: { title: 'Projects' },
  component: ProjectsPage,
})

type Project = {
  id: string
  name: string
  description: string | null
  createdAt: Date
}

function ProjectsPage() {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loaded, setLoaded] = useState(false)

  async function loadProjects() {
    try {
      const data = await listProjectsFn()
      setProjects(data as Project[])
    } catch {
      setProjects([])
    }
    setLoaded(true)
  }

  if (!loaded) {
    void loadProjects()
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await createProjectFn({ data: { name, description: description || undefined } })
      setName('')
      setDescription('')
      setShowForm(false)
      await loadProjects()
    } catch {
      // ignore
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">Kelola project & environment tim</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 size-4" />
          Project Baru
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
        >
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Nama Project</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Internal Tools"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-desc">Deskripsi</Label>
            <Input
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opsional"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Batal
            </Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada project. Buat project pertama.
          </p>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
            >
              <Folder className="mt-0.5 size-5 text-primary" />
              <div>
                <h3 className="font-medium text-card-foreground">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
