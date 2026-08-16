import type { ToolDefinition } from '#/modules/agent/domain/agent-types'
import { readFileTool } from './read-file'
import { writeFileTool } from './write-file'
import { listFilesTool } from './list-files'
import { execCommandTool } from './exec-command'

export const agentTools: ToolDefinition[] = [
  readFileTool,
  writeFileTool,
  listFilesTool,
  execCommandTool,
]

export function getToolByName(name: string): ToolDefinition | undefined {
  return agentTools.find((tool) => tool.name === name)
}

export function getToolSchemas(): Record<string, { description: string; parameters: unknown }> {
  return Object.fromEntries(
    agentTools.map((tool) => [
      tool.name,
      { description: tool.description, parameters: tool.parameters },
    ]),
  )
}
