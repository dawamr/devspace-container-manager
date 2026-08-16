# Workspace Assignment Management UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin can manage which workspaces each user is allowed to access, via a dialog from the Users admin page.

**Architecture:** Per-User dialog approach — a new `WorkspaceAssignmentDialog` component renders a checkbox list of all workspaces. Three new server functions handle listing all workspaces (with joined project/env/container names), listing a user's assigned workspace IDs, and batch assign/unassign via server-side diff. The existing `users-table.tsx` is patched to add a "Manage Workspaces" action button per row.

**Tech Stack:** TanStack Start (server functions), TanStack Query, TanStack Router, React, Tailwind CSS, shadcn/ui (Checkbox, Dialog, Input, Badge, Button), Drizzle ORM, PostgreSQL

**Spec:** `docs/superpowers/specs/2026-08-16-workspace-assignment-ui-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `app/modules/agent/server/list-all-workspaces.ts` | Create | List ALL workspaces with project/env/container names (admin view, no user filter) |
| `app/modules/agent/server/list-user-workspace-assignments.ts` | Create | List workspace IDs assigned to a specific user |
| `app/modules/agent/server/update-user-workspaces.ts` | Create | Batch assign/unassign workspaces for a user (server-side diff) |
| `app/modules/users/presentation/workspace-assignment-dialog.tsx` | Create | Dialog with searchable checkbox list of workspaces |
| `app/modules/users/presentation/users-table.tsx` | Modify | Add "Manage Workspaces" action button + render dialog |

**Dependency order:** Server functions first (Task 1–3), then UI component (Task 4), then patch users-table (Task 5).

---

## Task 1: list-all-workspaces server function

**Files:**
- Create: `app/modules/agent/server/list-all-workspaces.ts`

- [ ] **Step 1: Create the server function**

```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, asc } from 'drizzle-orm'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { db } from '#/shared/db/client'
import { workspaces, projects, environments, containerRegistry } from '#/shared/db/schema'

export interface WorkspaceListItem {
  id: string
  name: string
  projectName: string
  environmentName: string
  containerName: string | null
  rootPath: string
  isActive: boolean
}

const listInput = z.object({}).optional()

export const listAllWorkspacesFn = createServerFn({ method: 'GET' })
  .validator(listInput)
  .handler(async () => {
    await requirePermission(RESOURCES.WORKSPACES, ACTIONS.READ)

    const rows = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        rootPath: workspaces.rootPath,
        isActive: workspaces.isActive,
        projectName: projects.name,
        environmentName: environments.name,
        containerName: containerRegistry.name,
      })
      .from(workspaces)
      .innerJoin(projects, eq(workspaces.projectId, projects.id))
      .innerJoin(environments, eq(workspaces.environmentId, environments.id))
      .leftJoin(containerRegistry, eq(workspaces.containerRegistryId, containerRegistry.id))
      .orderBy(asc(workspaces.name))

    const workspacesList: WorkspaceListItem[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      projectName: r.projectName,
      environmentName: r.environmentName,
      containerName: r.containerName,
      rootPath: r.rootPath,
      isActive: r.isActive,
    }))

    return { workspaces: workspacesList }
  })
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add app/modules/agent/server/list-all-workspaces.ts
git commit -m "feat(agent): add listAllWorkspacesFn — admin view with joined project/env/container names"
```

---

## Task 2: list-user-workspace-assignments server function

**Files:**
- Create: `app/modules/agent/server/list-user-workspace-assignments.ts`

- [ ] **Step 1: Create the server function**

```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findAssignmentsByUser } from '../infrastructure/workspace-assignment-repository'

const listInput = z.object({
  userId: z.string().uuid(),
})

export const listUserWorkspaceAssignmentsFn = createServerFn({ method: 'GET' })
  .validator(listInput)
  .handler(async ({ data }) => {
    await requirePermission(RESOURCES.WORKSPACES, ACTIONS.READ)

    const assignments = await findAssignmentsByUser(data.userId)

    return {
      workspaceIds: assignments.map((a) => a.workspace.id),
    }
  })
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add app/modules/agent/server/list-user-workspace-assignments.ts
git commit -m "feat(agent): add listUserWorkspaceAssignmentsFn — get assigned workspace IDs for a user"
```

---

## Task 3: update-user-workspaces server function

**Files:**
- Create: `app/modules/agent/server/update-user-workspaces.ts`

- [ ] **Step 1: Create the server function**

```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import {
  findAssignmentsByUser,
  createAssignment,
  deleteAssignment,
} from '../infrastructure/workspace-assignment-repository'

const updateInput = z.object({
  userId: z.string().uuid(),
  workspaceIds: z.array(z.string().uuid()),
})

export const updateUserWorkspacesFn = createServerFn({ method: 'POST' })
  .validator(updateInput)
  .handler(async ({ data }) => {
    const admin = await requirePermission(RESOURCES.WORKSPACES, ACTIONS.ASSIGN)

    // Fetch current assignments
    const existing = await findAssignmentsByUser(data.userId)
    const existingIds = new Set(existing.map((a) => a.workspace.id))
    const requestedIds = new Set(data.workspaceIds)

    // Compute diff
    const toAdd = data.workspaceIds.filter((id) => !existingIds.has(id))
    const toRemove = existing
      .filter((a) => !requestedIds.has(a.workspace.id))
      .map((a) => a.workspace.id)

    // Apply: create new assignments
    for (const workspaceId of toAdd) {
      await createAssignment({
        workspaceId,
        userId: data.userId,
        role: 'developer',
        assignedBy: admin.id,
      })
    }

    // Apply: delete removed assignments
    for (const workspaceId of toRemove) {
      await deleteAssignment(workspaceId, data.userId)
    }

    // Track in PostHog
    await captureServerEvent('agent_workspace_assignment_updated', {
      userId: data.userId,
      added: toAdd.length,
      removed: toRemove.length,
      updatedBy: admin.id,
    })

    return {
      added: toAdd.length,
      removed: toRemove.length,
    }
  })
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add app/modules/agent/server/update-user-workspaces.ts
git commit -m "feat(agent): add updateUserWorkspacesFn — batch assign/unassign with server-side diff + PostHog"
```

---

## Task 4: WorkspaceAssignmentDialog component

**Files:**
- Create: `app/modules/users/presentation/workspace-assignment-dialog.tsx`

- [ ] **Step 1: Create the dialog component**

```tsx
import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Search, Save, CheckCircle2 } from 'lucide-react'
import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import { Badge } from '#/shared/ui/badge'
import { Checkbox } from '#/shared/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/shared/ui/dialog'
import { listAllWorkspacesFn, type WorkspaceListItem } from '#/modules/agent/server/list-all-workspaces'
import { listUserWorkspaceAssignmentsFn } from '#/modules/agent/server/list-user-workspace-assignments'
import { updateUserWorkspacesFn } from '#/modules/agent/server/update-user-workspaces'

interface WorkspaceAssignmentDialogProps {
  userId: string
  userName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WorkspaceAssignmentDialog({
  userId,
  userName,
  open,
  onOpenChange,
}: WorkspaceAssignmentDialogProps) {
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [saved, setSaved] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Fetch all workspaces
  const { data: allWorkspacesData, isLoading: isLoadingWorkspaces } = useQuery({
    queryKey: ['all-workspaces'],
    queryFn: () => listAllWorkspacesFn({ data: {} }),
    enabled: open,
  })

  // Fetch user's current assignments
  const { data: assignmentsData, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['user-workspace-assignments', userId],
    queryFn: () => listUserWorkspaceAssignmentsFn({ data: { userId } }),
    enabled: open,
  })

  // Initialize selectedIds from server data (once per open)
  useEffect(() => {
    if (assignmentsData && !initialized) {
      setSelectedIds(new Set(assignmentsData.workspaceIds))
      setInitialized(true)
    }
  }, [assignmentsData, initialized])

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set())
      setSearch('')
      setSaved(false)
      setInitialized(false)
    }
  }, [open])

  const mutation = useMutation({
    mutationFn: (ids: string[]) =>
      updateUserWorkspacesFn({ data: { userId, workspaceIds: ids } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-workspace-assignments', userId] })
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        onOpenChange(false)
      }, 1500)
    },
  })

  const filteredWorkspaces = useMemo(() => {
    const list = allWorkspacesData?.workspaces ?? []
    if (!search) return list
    return list.filter((w) =>
      w.name.toLowerCase().includes(search.toLowerCase()),
    )
  }, [allWorkspacesData, search])

  const handleToggle = (workspaceId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(workspaceId)) {
        next.delete(workspaceId)
      } else {
        next.add(workspaceId)
      }
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(Array.from(selectedIds))
  }

  const isLoading = isLoadingWorkspaces || isLoadingAssignments

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Workspaces — {userName}</DialogTitle>
          <DialogDescription>
            Pilih workspace yang dapat diakses oleh user ini.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-white/40" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
              <Input
                placeholder="Cari workspace..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                variant="glass"
                className="pl-9"
              />
            </div>

            {/* Workspace list */}
            <div className="max-h-[400px] overflow-y-auto rounded-[var(--glass-radius-sm)] border border-[var(--glass-border)]">
              {filteredWorkspaces.length === 0 ? (
                <div className="p-6 text-center text-sm text-white/60">
                  Tidak ada workspace
                </div>
              ) : (
                filteredWorkspaces.map((ws: WorkspaceListItem) => (
                  <label
                    key={ws.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-[var(--glass-border)] px-4 py-3 last:border-b-0 transition-colors hover:bg-white/5"
                  >
                    <Checkbox
                      checked={selectedIds.has(ws.id)}
                      onCheckedChange={() => handleToggle(ws.id)}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{ws.name}</span>
                        {!ws.isActive && (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <span>{ws.projectName}</span>
                        <span>·</span>
                        <span>{ws.environmentName}</span>
                        {ws.containerName && (
                          <>
                            <span>·</span>
                            <span className="truncate">{ws.containerName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            {/* Error */}
            {mutation.isError && (
              <p className="text-sm text-red-400">
                Error: {mutation.error instanceof Error ? mutation.error.message : 'Unknown error'}
              </p>
            )}

            {/* Footer */}
            <DialogFooter>
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-green-400">
                  <CheckCircle2 className="size-4" />
                  Assignments saved
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save Assignments
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add app/modules/users/presentation/workspace-assignment-dialog.tsx
git commit -m "feat(users): add WorkspaceAssignmentDialog — searchable checkbox list with batch save"
```

---

## Task 5: Patch users-table.tsx — add Manage Workspaces action

**Files:**
- Modify: `app/modules/users/presentation/users-table.tsx`

- [ ] **Step 1: Add imports for dialog + icon**

At the top of the file, after the existing lucide-react import line, update the import to add `FolderCog`:

```typescript
import { Plus, Search, Pencil, Trash2, FolderCog } from 'lucide-react'
```

Add import for the new dialog component after `UserFormDialog` import:

```typescript
import { WorkspaceAssignmentDialog } from './workspace-assignment-dialog'
```

- [ ] **Step 2: Add state for assignment dialog**

Inside `UsersTable()` function, after the existing `deleteId` state, add:

```typescript
const [assignmentUser, setAssignmentUser] = useState<{ id: string; name: string } | null>(null)
```

- [ ] **Step 3: Add Manage Workspaces button in actions column**

In the actions `<div className="flex justify-end gap-1">` for each user row, add a new button **before** the Edit (`Pencil`) button:

```tsx
<Button
  variant="ghost"
  size="icon"
  title="Manage Workspaces"
  onClick={() => setAssignmentUser({ id: user.id, name: user.name })}
>
  <FolderCog className="h-4 w-4" />
</Button>
```

- [ ] **Step 4: Render the dialog at the bottom of the component**

After the delete confirmation `<Dialog>` block (the one wrapped in `{deleteId && (`), add:

```tsx
{assignmentUser && (
  <WorkspaceAssignmentDialog
    userId={assignmentUser.id}
    userName={assignmentUser.name}
    open={!!assignmentUser}
    onOpenChange={(o) => !o && setAssignmentUser(null)}
  />
)}
```

- [ ] **Step 5: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 6: Commit**

```bash
git add app/modules/users/presentation/users-table.tsx
git commit -m "feat(users): add Manage Workspaces action button in users table

- FolderCog icon button per user row
- Opens WorkspaceAssignmentDialog
- Placed before Edit button in actions column"
```

---

## Verification

- [ ] **Step 1: Run dev server**

```bash
pnpm dev --port 8081 --host 0.0.0.0
```

- [ ] **Step 2: Manual E2E test**

1. Login as admin → go to Administration → Users
2. Click FolderCog icon on a user row → dialog opens
3. Verify workspace list loads with project/env/container names
4. Check 2 workspaces → click Save → "Assignments saved" appears
5. Reopen dialog → verify checkboxes persist
6. Uncheck 1 workspace → Save → reopen → 1 checkbox remains
7. Login as that user → go to Agent page → verify only assigned workspaces appear in selector
