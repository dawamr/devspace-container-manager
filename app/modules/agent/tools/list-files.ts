import { z } from 'zod'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { ToolDefinition, ToolParams, ToolCallResult } from '#/modules/agent/domain/agent-types'
import { resolveWorkspaceRoot, validatePath } from '#/modules/agent/infrastructure/path-guard'

const ListFilesSchema = z.object({
  path: z.string().min(1).max(500).default('.'),
})

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number
}

export const listFilesTool: ToolDefinition = {
  name: 'listFiles',
  description: 'List files and directories in a given path. Path is relative to workspace root.',
  parameters: ListFilesSchema,
  async execute(params: ToolParams, args: unknown): Promise<ToolCallResult> {
    const start = Date.now()
    try {
      const { path: dirPath } = ListFilesSchema.parse(args)
      const rootPath = await resolveWorkspaceRoot(params.userId, params.workspaceId)
      const validation = validatePath(rootPath, dirPath)

      if (!validation.valid || !validation.resolved) {
        return {
          tool: 'listFiles',
          success: false,
          output: '',
          error: validation.reason,
          durationMs: Date.now() - start,
        }
      }

      const entries = await fs.readdir(validation.resolved, { withFileTypes: true })
      const result: FileEntry[] = await Promise.all(
        entries
          .filter((entry) => !entry.name.startsWith('.'))
          .map(async (entry) => {
            const fullPath = path.join(validation.resolved!, entry.name)
            const stats = await fs.stat(fullPath)
            return {
              name: entry.name,
              path: path.join(dirPath, entry.name),
              isDirectory: entry.isDirectory(),
              size: stats.size,
            }
          }),
      )

      // Sort: directories first, then files, alphabetically
      result.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      return {
        tool: 'listFiles',
        success: true,
        output: JSON.stringify(result),
        durationMs: Date.now() - start,
      }
    } catch (err) {
      return {
        tool: 'listFiles',
        success: false,
        output: '',
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      }
    }
  },
}
