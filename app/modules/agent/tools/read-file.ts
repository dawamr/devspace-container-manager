import { z } from 'zod'
import fs from 'node:fs/promises'
import type { ToolDefinition, ToolParams, ToolCallResult } from '#/modules/agent/domain/agent-types'
import { resolveWorkspaceRoot, validatePath } from '#/modules/agent/infrastructure/path-guard'

const MAX_FILE_SIZE = 10 * 1024 // 10KB

const ReadFileSchema = z.object({
  path: z.string().min(1).max(500),
})

export const readFileTool: ToolDefinition = {
  name: 'readFile',
  description: 'Read the contents of a file. Path is relative to workspace root. Max 10KB per file.',
  parameters: ReadFileSchema,
  async execute(params: ToolParams, args: unknown): Promise<ToolCallResult> {
    const start = Date.now()
    try {
      const { path: filePath } = ReadFileSchema.parse(args)
      const rootPath = await resolveWorkspaceRoot(params.userId, params.workspaceId)
      const validation = validatePath(rootPath, filePath)

      if (!validation.valid || !validation.resolved) {
        return {
          tool: 'readFile',
          success: false,
          output: '',
          error: validation.reason,
          durationMs: Date.now() - start,
        }
      }

      const stats = await fs.stat(validation.resolved)
      if (stats.size > MAX_FILE_SIZE) {
        return {
          tool: 'readFile',
          success: false,
          output: '',
          error: `File exceeds ${MAX_FILE_SIZE} bytes`,
          durationMs: Date.now() - start,
        }
      }

      const content = await fs.readFile(validation.resolved, 'utf8')
      return {
        tool: 'readFile',
        success: true,
        output: content,
        durationMs: Date.now() - start,
      }
    } catch (err) {
      return {
        tool: 'readFile',
        success: false,
        output: '',
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      }
    }
  },
}
