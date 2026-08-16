require('dotenv/config')
const postgres = require('postgres')
const sql = postgres(process.env.DATABASE_URL, { max: 1 })

;(async () => {
  console.log('--- workspaces ---')
  const ws = await sql`SELECT * FROM workspaces`
  console.log(ws)

  console.log('--- workspace_mounts ---')
  const wm = await sql`SELECT * FROM workspace_mounts`
  console.log(wm)

  console.log('--- workspace_assignments ---')
  const wa = await sql`SELECT * FROM workspace_assignments`
  console.log(wa)

  await sql.end()
})()
