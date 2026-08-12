import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/projects')({
  staticData: { title: 'Projects' },
  component: ProjectsPage,
})

function ProjectsPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
      <p className="text-sm text-muted-foreground">Project CRUD akan tersedia pada implementasi Sprint 1.</p>
    </div>
  )
}
