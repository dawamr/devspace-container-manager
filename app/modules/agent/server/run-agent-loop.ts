import { buildSystemPrompt } from '#/modules/agent/domain/system-prompt'
import { getToolSchemas, getToolByName } from '#/modules/agent/tools/factory'
import type { AgentRunConfig, ToolCallResult, ToolParams } from '#/modules/agent/domain/agent-types'
import { findWorkspaceById } from '#/modules/agent/infrastructure/workspace-repository'
import { resolveContainerPath } from '#/modules/agent/infrastructure/path-guard'
import { incrementToolCallCount, addTokensAndReturn, updateSession, findSessionById } from '#/modules/agent/infrastructure/agent-session-repository'
import { getAgentSettings } from '#/modules/agent/infrastructure/settings-repository'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import { env } from '#/shared/config/env'
import { db } from '#/shared/db/client'
import { containerRegistry } from '#/shared/db/schema'
import { eq } from 'drizzle-orm'

const MAX_ITERATIONS = env.AGENT_TOOL_LIMIT

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

    // Check token budget before calling LLM
    const session = await findSessionById(sessionId)
    if (session && session.tokenUsage >= session.tokenBudget) {
      onToken('⚠️ Token budget exceeded. Session stopped to prevent cost overrun.')
      break
    }

    // Call LLM API
    const response = await callLLM(messages, toolSchemas, signal)
    const updated = await addTokensAndReturn(sessionId, response.usage?.total_tokens ?? 0)

    // Check budget after adding tokens — stop if exceeded
    if (updated && updated.tokenUsage >= updated.tokenBudget) {
      onToken('⚠️ Token budget exceeded. Session stopped to prevent cost overrun.')
      break
    }

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

      // PostHog: track tool call
      await captureServerEvent('agent_tool_call', {
        sessionId,
        tool: response.toolName,
        success: result.success,
        durationMs: result.durationMs,
        workspaceId,
        iteration,
      })

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
  const config = await getAgentSettings()
  const baseUrl = config.llmBaseUrl || 'https://api.openai.com/v1'
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.llmApiKey}`,
    },
    body: JSON.stringify({
      model: config.llmModel,
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
