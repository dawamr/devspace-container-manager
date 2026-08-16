import { env } from '#/shared/config/env'
import { buildSystemPrompt } from '#/modules/agent/domain/system-prompt'
import { getToolSchemas, getToolByName } from '#/modules/agent/tools/factory'
import type { AgentRunConfig, ToolCallResult, ToolParams } from '#/modules/agent/domain/agent-types'
import { findWorkspaceById } from '#/modules/agent/infrastructure/workspace-repository'
import { resolveContainerPath } from '#/modules/agent/infrastructure/path-guard'
import { incrementToolCallCount, addTokenUsage, updateSession } from '#/modules/agent/infrastructure/agent-session-repository'
import { db } from '#/shared/db/client'
import { containerRegistry } from '#/shared/db/schema'
import { eq } from 'drizzle-orm'

const MAX_ITERATIONS = 20

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
}

interface LLMResponse {
  type: 'text' | 'tool_call'
  content: string
  toolName?: string
  toolArgs?: unknown
  toolCallId?: string
  usage?: { total_tokens: number }
}

export async function runAgentLoop(
  config: AgentRunConfig,
  userMessage: string,
): Promise<void> {
  const { sessionId, userId, workspaceId, containerRegistryId, onToken, onToolCall, signal } = config

  // Get workspace details for system prompt
  const workspace = await findWorkspaceById(workspaceId)
  if (!workspace) throw new Error('Workspace not found')

  // Get container name if assigned
  let containerName = 'none'
  let containerRootPath = workspace.rootPath
  if (containerRegistryId) {
    const [container] = await db.select().from(containerRegistry).where(eq(containerRegistry.id, containerRegistryId)).limit(1)
    if (container) {
      containerName = container.name
      const mountPath = await resolveContainerPath(workspaceId, workspace.rootPath)
      if (mountPath) containerRootPath = mountPath
    }
  }

  const systemPrompt = buildSystemPrompt({
    workspaceName: workspace.name,
    containerRootPath,
    containerName,
  })

  const toolSchemas = getToolSchemas()
  const toolParams: ToolParams = { userId, workspaceId, containerRegistryId }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ]

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    if (signal?.aborted) break

    // Call LLM API
    const response = await callLLM(messages, toolSchemas, signal)
    await addTokenUsage(sessionId, response.usage?.total_tokens ?? 0)

    if (response.type === 'text') {
      // Stream tokens to UI
      onToken(response.content)
      messages.push({ role: 'assistant', content: response.content })
      break
    }

    if (response.type === 'tool_call') {
      if (!response.toolName || !response.toolCallId) {
        messages.push({ role: 'assistant', content: 'Error: malformed tool call response from LLM' })
        continue
      }

      // Push assistant message with tool_calls for conversation continuity
      messages.push({
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: response.toolCallId,
          type: 'function',
          function: {
            name: response.toolName,
            arguments: JSON.stringify(response.toolArgs ?? {}),
          },
        }],
      })

      // Execute tool
      const tool = getToolByName(response.toolName)
      if (!tool) {
        const errorResult: ToolCallResult = {
          tool: response.toolName,
          success: false,
          output: '',
          error: `Unknown tool: ${response.toolName}`,
          durationMs: 0,
        }
        onToolCall(response.toolName, response.toolArgs, errorResult)
        messages.push({
          role: 'tool',
          content: JSON.stringify(errorResult),
          tool_call_id: response.toolCallId,
        })
        continue
      }

      const result = await tool.execute(toolParams, response.toolArgs)
      onToolCall(response.toolName, response.toolArgs, result)
      await incrementToolCallCount(sessionId)
      messages.push({
        role: 'tool',
        content: result.output,
        tool_call_id: response.toolCallId,
      })
      continue
    }

    break
  }

  await updateSession(sessionId, { status: 'completed', endedAt: new Date() })
}

async function callLLM(
  messages: ChatMessage[],
  tools: Record<string, { description: string; parameters: unknown }>,
  signal?: AbortSignal,
): Promise<LLMResponse> {
  const baseUrl = env.LLM_BASE_URL || 'https://api.openai.com/v1'
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.LLM_MODEL,
      messages,
      tools: Object.entries(tools).map(([name, def]) => ({
        type: 'function',
        function: {
          name,
          description: def.description,
          parameters: def.parameters,
        },
      })),
    }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const choice = data.choices[0]
  const message = choice.message

  if (message.tool_calls?.length > 0) {
    const toolCall = message.tool_calls[0]
    return {
      type: 'tool_call',
      content: '',
      toolName: toolCall.function.name,
      toolArgs: JSON.parse(toolCall.function.arguments),
      toolCallId: toolCall.id,
      usage: data.usage,
    }
  }

  return {
    type: 'text',
    content: message.content ?? '',
    usage: data.usage,
  }
}
