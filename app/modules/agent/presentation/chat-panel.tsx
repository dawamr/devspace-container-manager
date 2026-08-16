import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Send, Loader2, Square } from 'lucide-react'
import { Button } from '#/shared/ui/button'
import { cn } from '#/shared/lib/cn'
import { sendAgentMessageFn } from '#/modules/agent/server/send-agent-message'
import { cancelAgentSessionFn } from '#/modules/agent/server/cancel-agent-session'
import { ToolCallCard } from './tool-call-card'
import type { ToolCallResult } from '#/modules/agent/domain/agent-types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: Array<{ tool: string; args: unknown; result: ToolCallResult }>
}

interface ChatPanelProps {
  sessionId: string | null
}

export function ChatPanel({ sessionId }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const mutation = useMutation({
    mutationFn: async (message: string) => {
      if (!sessionId) throw new Error('No session')
      return sendAgentMessageFn({ data: { sessionId, message } })
    },
    onMutate: (message) => {
      setMessages((prev) => [...prev, { role: 'user', content: message }])
      setIsRunning(true)
    },
    onSuccess: (data) => {
      const assistantMsg: ChatMessage = { role: 'assistant', content: '', toolCalls: [] }
      for (const event of data.events) {
        const match = event.match(/^data: (.+)\n\n$/)
        if (!match) continue
        try {
          const parsed = JSON.parse(match[1])
          if (parsed.type === 'token') {
            assistantMsg.content += parsed.content
          } else if (parsed.type === 'tool_call') {
            assistantMsg.toolCalls?.push({
              tool: parsed.tool,
              args: parsed.args,
              result: parsed.result,
            })
          }
        } catch {
          // skip malformed events
        }
      }
      setMessages((prev) => [...prev, assistantMsg])
      setIsRunning(false)
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      ])
      setIsRunning(false)
    },
  })

  const handleCancel = async () => {
    if (!sessionId) return
    await cancelAgentSessionFn({ data: { sessionId } })
    setIsRunning(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !sessionId || isRunning) return
    mutation.mutate(input.trim())
    setInput('')
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-white/30">
            {sessionId ? 'Ask the agent anything about your workspace...' : 'Select a workspace to start chatting'}
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'mb-4 rounded-[var(--glass-radius)] px-4 py-3',
              msg.role === 'user'
                ? 'ml-8 bg-blue-500/10 border border-blue-500/20'
                : 'mr-8 bg-white/5 border border-[var(--glass-border)]',
            )}
          >
            <div className="mb-1 text-xs font-semibold text-white/40">
              {msg.role === 'user' ? 'You' : 'Agent'}
            </div>
            <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
            {msg.toolCalls?.map((tc, j) => (
              <ToolCallCard key={j} toolName={tc.tool} args={tc.args} result={tc.result} />
            ))}
          </div>
        ))}
        {isRunning && (
          <div className="mb-4 flex items-center gap-2 text-sm text-white/40">
            <Loader2 className="size-4 animate-spin" />
            Agent is working...
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="border-t border-[var(--glass-border)] p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask agent..."
            rows={1}
            className="flex-1 resize-none rounded-[var(--glass-radius)] border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-white/30"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          {isRunning ? (
            <Button type="button" variant="destructive" size="icon" onClick={handleCancel}>
              <Square className="size-4" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim() || !sessionId}>
              <Send className="size-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
