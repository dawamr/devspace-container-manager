import { z } from 'zod'
import { eq } from 'drizzle-orm'
import type { ToolDefinition, ToolParams, ToolCallResult } from '#/modules/agent/domain/agent-types'
import { execInContainer } from '#/modules/agent/infrastructure/docker-exec'
import { resolveWorkspaceRoot, resolveContainerPath } from '#/modules/agent/infrastructure/path-guard'
import { db } from '#/shared/db/client'
import { containerRegistry } from '#/shared/db/schema'
import { env } from '#/shared/config/env'

const ExecCommandSchema = z.object({
  command: z.string().min(1).max(500),
})

export const execCommandTool: ToolDefinition = {
  name: 'execCommand',
  description: 'Execute a whitelisted command inside the assigned Docker container. Shell operators (&&, ||, ;, |, >, <) are forbidden.',
  parameters: ExecCommandSchema,
  async execute(params: ToolParams, args: unknown): Promise<ToolCallResult> {
    const start = Date.now()
    try {
      const { command } = ExecCommandSchema.parse(args)

      if (!params.containerRegistryId) {
        return {
          tool: 'execCommand',
          success: false,
          output: '',
          error: 'No container assigned to this workspace',
          durationMs: Date.now() - start,
        }
      }

      // Look up the Docker container ID from the container_registry table.
      // params.containerRegistryId is the row UUID; containerId is the Docker container ID.
      const rows = await db
        .select({ containerId: containerRegistry.containerId })
        .from(containerRegistry)
        .where(eq(containerRegistry.id, params.containerRegistryId))
        .limit(1)

      if (rows.length === 0) {
        return {
          tool: 'execCommand',
          success: false,
          output: '',
          error: 'Container registry entry not found',
          durationMs: Date.now() - start,
        }
      }

      const dockerContainerId = rows[0].containerId

      // Resolve container working directory from workspace mounts
      const rootPath = await resolveWorkspaceRoot(params.userId, params.workspaceId)
      const containerPath = await resolveContainerPath(params.workspaceId, rootPath)

      const result = await execInContainer(
        dockerContainerId,
        command,
        env.DOCKER_HOST,
        env.DOCKER_CERT_PATH,
        containerPath ?? undefined,
      )

      const output = result.stderr
        ? `${result.stdout}\n--- STDERR ---\n${result.stderr}\nExit code: ${result.exitCode}`
        : `${result.stdout}\nExit code: ${result.exitCode}`

      return {
        tool: 'execCommand',
        success: result.exitCode === 0,
        output,
        error: result.exitCode !== 0 ? `Command exited with code ${result.exitCode}` : undefined,
        durationMs: Date.now() - start,
      }
    } catch (err) {
      return {
        tool: 'execCommand',
        success: false,
        output: '',
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      }
    }
  },
}
