/**
 * Task 10: Seed a test workspace + mount + assignment.
 *
 * Usage: node scripts/seed-workspace.cjs
 *
 * Reads DATABASE_URL from .env via dotenv, connects with the `postgres`
 * package (already a dependency), queries for existing rows to reference,
 * then inserts workspaces / workspace_mounts / workspace_assignments rows.
 * Idempotent: deletes any prior seed workspace named 'dev-spaces-local' first.
 */
require('dotenv/config')
const postgres = require('postgres')

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set in .env')
  process.exit(1)
}

const ROOT_PATH = '/srv/apps/mono/dev-spaces'
const WORKSPACE_NAME = 'dev-spaces-local'
const MOUNT_CONTAINER_PATH = '/app'

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 })

  try {
    // --- reference existing data ---
    const users = await sql`SELECT id, email FROM users ORDER BY created_at ASC LIMIT 5`
    if (users.length === 0) {
      throw new Error('No users found in the database. Seed users first.')
    }
    const admin = users[0]
    console.log(`[ref] admin user: id=${admin.id} email=${admin.email}`)

    const projects = await sql`SELECT id, name FROM projects LIMIT 1`
    if (projects.length === 0) {
      throw new Error('No projects found. Seed a project first.')
    }
    const project = projects[0]
    console.log(`[ref] project: id=${project.id} name=${project.name}`)

    const environments = await sql`SELECT id, name FROM environments LIMIT 1`
    if (environments.length === 0) {
      throw new Error('No environments found. Seed an environment first.')
    }
    const env = environments[0]
    console.log(`[ref] environment: id=${env.id} name=${env.name}`)

    const containers = await sql`SELECT id, name, container_id FROM container_registry LIMIT 1`
    const container = containers[0] || null
    if (container) {
      console.log(`[ref] container: id=${container.id} name=${container.name} container_id=${container.container_id}`)
    } else {
      console.log('[ref] no container_registry rows; container_registry_id will be NULL')
    }

    // --- idempotency: remove a prior seed workspace (cascades to mounts+assignments) ---
    await sql`DELETE FROM workspaces WHERE name = ${WORKSPACE_NAME}`
    console.log(`[clean] removed any prior workspace named '${WORKSPACE_NAME}'`)

    // --- insert workspace ---
    const [workspace] = await sql`
      INSERT INTO workspaces
        (name, project_id, environment_id, container_registry_id, root_path, is_active, created_by)
      VALUES
        (${WORKSPACE_NAME}, ${project.id}, ${env.id}, ${container ? container.id : null}, ${ROOT_PATH}, true, ${admin.id})
      RETURNING id, name, root_path, is_active
    `
    console.log(`[insert] workspace: id=${workspace.id} name=${workspace.name} root_path=${workspace.root_path}`)

    // --- insert workspace_mount ---
    const [mount] = await sql`
      INSERT INTO workspace_mounts
        (workspace_id, host_path, container_path, is_read_only)
      VALUES
        (${workspace.id}, ${ROOT_PATH}, ${MOUNT_CONTAINER_PATH}, false)
      RETURNING id, workspace_id, host_path, container_path
    `
    console.log(`[insert] mount: id=${mount.id} ${mount.host_path} -> ${mount.container_path}`)

    // --- insert workspace_assignment (admin, role=developer, assigned by self) ---
    const [assignment] = await sql`
      INSERT INTO workspace_assignments
        (workspace_id, user_id, role, assigned_by)
      VALUES
        (${workspace.id}, ${admin.id}, 'developer', ${admin.id})
      RETURNING id, workspace_id, user_id, role, assigned_by
    `
    console.log(`[insert] assignment: id=${assignment.id} workspace=${assignment.workspace_id} user=${assignment.user_id} role=${assignment.role}`)

    console.log('\n=== SEED COMPLETE ===')
    console.log(JSON.stringify({
      workspace_id: workspace.id,
      workspace_name: workspace.name,
      root_path: workspace.root_path,
      mount_id: mount.id,
      assignment_id: assignment.id,
      admin_email: admin.email,
      role: assignment.role,
    }, null, 2))
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error('SEED FAILED:', err)
  process.exit(1)
})
