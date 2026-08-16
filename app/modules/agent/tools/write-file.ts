import { z } from 'zod'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { ToolDefinition, ToolParams, ToolCallResult } from '#/modules/agent/domain/agent-types'
import { resolveWorkspaceRoot, validatePath } from '#/modules/agent/infrastructure/path-guard'

const MAX_WRITE_SIZE = 100 * 1024 // 100KB

const WriteFileSchema = z.object({
  path: z.string().min(1).max(500),
  content: z.string().max(MAX_WRITE_SIZE),
})

export const writeFileTool: ToolDefinition = {
  name: 'writeFile',
  description: 'Write content to a file. Path is relative to workspace root. Max 100KB. Auto-applied — user sees the result.',
  parameters: WriteFileSchema,
  async execute(params: ToolParams, args: unknown): Promise<ToolCallResult> {
    const start = Date.now()
    try {
      const { path: filePath, content } = WriteFileSchema.parse(args)
      const rootPath = await resolveWorkspaceRoot(params.userId, params.workspaceId)
      const validation = validatePath(rootPath, filePath)

      if (!validation.valid || !validation.resolved) {
        return {
          tool: 'writeFile',
          success: false,
          output: '',
          error: validation.reason,
          durationMs: Date.now() - start,
        }
      }

      // Ensure parent directory exists
      await fs.mkdir(path.dirname(validation.resolved), { recursive: true })
      await fs.writeFile(validation.resolved, content, 'utf8')

      return {
        tool: 'writeFile',
        success: true,
        output: `File written: ${filePath}`,
        durationMs: Date.now() - start,
      }
    } catch (err) {
      return {
        tool: 'writeFile',
        success: false,
        output: '',
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      }
    }
  },
}
