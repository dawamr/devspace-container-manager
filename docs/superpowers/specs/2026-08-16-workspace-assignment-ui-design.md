# Workspace Assignment Management UI — Design Spec

> **Date:** 2026-08-16
> **Sprint:** Sprint 6 (AI Agentic & LLM Tooling)
> **Status:** Approved (default — async timeout, user said "lanjutkan")

## Context

DevSpace punya AI agent module (Sprint 6) yang memungkinkan user berinteraksi dengan container via chat. Akses ke workspace diatur via tabel `workspace_assignments`. Infrastructure repository sudah lengkap (`createAssignment`, `deleteAssignment`, `findAssignmentsByUser`, `hasWorkspaceAssignment`), tapi **tidak ada UI admin** untuk mengelola assignment.

LLM API & Base URL settings sudah ada dan berfungsi di `/administration/agent-settings` (`AgentSettingsPanel`). Tidak perlu dibangun ulang.

## Goal

Admin bisa mengelola workspace mana yang boleh diakses oleh user tertentu, dari halaman Administration → Users.

## Scope

- **In scope:** Per-User workspace assignment dialog (checkbox list, search, batch save)
- **Out of scope:** Per-Workspace view (assign user dari sisi workspace), workspace CRUD UI (sudah ada via server functions tapi belum ada admin page — deferred), editing assignment role (default `developer`, role editing deferred)

## Architecture

```
Administration > Users
  └── UsersTable (existing)
       └── Actions column
            ├── Edit (existing — UserFormDialog)
            ├── Delete (existing)
            └── Manage Workspaces (NEW — WorkspaceAssignmentDialog)
                 ├── listAllWorkspacesFn → semua workspace (no filter)
                 ├── listUserWorkspaceAssignmentsFn → workspace IDs assigned to user
                 └── updateUserWorkspacesFn → batch assign/unassign
```

### Data Flow

```
Admin clicks "Manage Workspaces" icon on user row
  ↓
WorkspaceAssignmentDialog opens
  ↓
Parallel fetch: listAllWorkspacesFn + listUserWorkspaceAssignmentsFn
  ↓
Render checkbox list with workspace name, project, environment, container, status
  ↓
Admin checks/unchecks workspaces
  ↓
Admin clicks "Save"
  ↓
updateUserWorkspacesFn receives { userId, workspaceIds: string[] }
  ↓
Diff: existing assignments vs requested
  ↓
Delete removed assignments, create new assignments
  ↓
PostHog: agent_workspace_assignment_updated
  ↓
Invalidate ['users'] query cache
  ↓
Dialog closes, toast notification
```

## Components

### 1. Server Functions

#### `list-all-workspaces.ts`
- **Method:** GET
- **RBAC:** `RESOURCES.WORKSPACES` + `ACTIONS.READ`
- **Returns:** Array of `{ id, name, projectName, environmentName, containerName, rootPath, isActive }`
- **Join:** workspaces → projects (name), environments (name), container_registry (name)
- **No filter** — admin sees all workspaces

#### `list-user-workspace-assignments.ts`
- **Method:** GET
- **RBAC:** `RESOURCES.WORKSPACES` + `ACTIONS.READ`
- **Input:** `{ userId: string }`
- **Returns:** `{ workspaceIds: string[] }` — IDs of workspaces assigned to the user

#### `update-user-workspaces.ts`
- **Method:** POST
- **RBAC:** `RESOURCES.WORKSPACES` + `ACTIONS.ASSIGN`
- **Input:** `{ userId: string, workspaceIds: string[] }`
- **Logic:**
  1. Fetch current assignments via `findAssignmentsByUser(userId)`
  2. Compute diff: `toAdd = requested - existing`, `toRemove = existing - requested`
  3. Call `createAssignment` for each `toAdd` (role: `developer`, assignedBy: admin.id)
  4. Call `deleteAssignment` for each `toRemove`
  5. Emit PostHog event `agent_workspace_assignment_updated` with `{ userId, added, removed }`
- **Returns:** `{ added: number, removed: number }`

### 2. UI Component

#### `WorkspaceAssignmentDialog`
- **Location:** `app/modules/users/presentation/workspace-assignment-dialog.tsx`
- **Props:** `{ userId: string, userName: string, open: boolean, onOpenChange: (open: boolean) => void }`
- **Layout:**
  - Dialog header: "Manage Workspaces — {userName}"
  - Search input (filter by workspace name)
  - Scrollable checkbox list (max-height 400px, overflow-y auto)
  - Each row: checkbox + workspace name + project badge + environment badge + container name (muted) + active/inactive status
  - Footer: Cancel + Save buttons
- **State:**
  - `selectedIds: Set<string>` — initialized from `listUserWorkspaceAssignmentsFn`, updated on checkbox toggle
  - `search: string` — filter workspace list
  - `isLoading: boolean` — loading state for initial fetch
  - `isSaving: boolean` — saving state for mutation
- **Behavior:**
  - Checkbox toggle adds/removes from `selectedIds`
  - Search filters displayed workspaces but does not affect selection
  - Save button calls `updateUserWorkspacesFn` with `Array.from(selectedIds)`
  - On success: invalidate `['users']` query, close dialog, show toast
  - On error: show error message in dialog footer

### 3. Patch `users-table.tsx`

- Tambah `FolderCog` (atau `LayoutGrid`) icon button di actions column, sebelum delete button
- Tooltip: "Manage Workspaces"
- OnClick: set `assignmentUserId` + `assignmentUserName` + open dialog
- Render `<WorkspaceAssignmentDialog>` di bottom table
- `createRouteGuard('users', 'update')` sudah ada di route level — dialog hanya muncul jika admin punya akses update users

## RBAC

| Server Function | Resource | Action |
|----------------|----------|--------|
| `listAllWorkspacesFn` | WORKSPACES | READ |
| `listUserWorkspaceAssignmentsFn` | WORKSPACES | READ |
| `updateUserWorkspacesFn` | WORKSPACES | ASSIGN |

Route guard: Users page sudah di-guard dengan `createRouteGuard('users', 'read')`. Dialog hanya render action button jika admin punya `users.update`.

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/modules/agent/server/list-all-workspaces.ts` | Create | List all workspaces with project/env/container names |
| `app/modules/agent/server/list-user-workspace-assignments.ts` | Create | List workspace IDs assigned to a user |
| `app/modules/agent/server/update-user-workspaces.ts` | Create | Batch assign/unassign workspaces |
| `app/modules/users/presentation/workspace-assignment-dialog.tsx` | Create | Dialog component with checkbox list |
| `app/modules/users/presentation/users-table.tsx` | Modify | Add "Manage Workspaces" action button + render dialog |

## Design Decisions

1. **Per-User scope, bukan Per-Workspace** — konsisten dengan pola Users page yang sudah ada. Admin natural flow: lihat user → assign workspace. YAGNI untuk halaman terpisah.
2. **Checkbox list, bukan multi-select transfer** — simpler UX, fewer components, cukup untuk jumlah workspace < 100. Transfer list (shuttleshuttle) overkill untuk MVP.
3. **Default role `developer`** — assignment role editing deferred. Saat ini semua assignment default ke `developer`. Role editing bisa ditambah nanti dengan dropdown per row.
4. **Server-side diff** — `updateUserWorkspacesFn` menerima full list, compute diff di server. Lebih aman (client tidak tahu apa yang berubah) dan idempotent.
5. **PostHog event** — `agent_workspace_assignment_updated` untuk tracking admin activity.
6. **No new route** — dialog adalah client-side state, tidak butuh URL. Consistent dengan `UserFormDialog` pattern.

## Edge Cases

- **User has no assignments** — dialog opens with no checkboxes checked
- **All workspaces assigned** — all checkboxes checked, save = no-op
- **Workspace inactive** — shown with muted badge, still assignable (admin choice)
- **Save with zero changes** — no mutation, just close dialog
- **Network error during save** — error shown in dialog, selectedIds preserved

## Testing

Manual E2E:
1. Login as admin
2. Go to Administration → Users
3. Click "Manage Workspaces" on a user row
4. Verify workspace list loads with correct data
5. Check 2 workspaces, save
6. Reopen dialog — verify checkboxes persist
7. Uncheck 1 workspace, save
8. Reopen — verify 1 checkbox remains
9. Login as that user, go to Agent page — verify only assigned workspaces appear in selector
