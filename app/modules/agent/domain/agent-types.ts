import type { z } from 'zod'

export type AgentSessionStatus = 'active' | 'completed' | 'error' | 'cancelled'

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCallId?: string
  toolName?: string
  toolArgs?: unknown
}

export interface ToolCallResult {
  tool: string
  success: boolean
  output: string
  error?: string
  durationMs: number
}

export interface ToolParams {
  userId: string
  workspaceId: string
  containerRegistryId: string | null
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: z.ZodSchema
  execute: (params: ToolParams, args: unknown) => Promise<ToolCallResult>
}

export interface AgentRunConfig {
  sessionId: string
  userId: string
  workspaceId: string
  containerRegistryId: string | null
  onToken: (token: string) => void
  onToolCall: (tool: string, args: unknown, result: ToolCallResult) => void
  signal?: AbortSignal
}
