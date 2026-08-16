import { useState } from 'react'
import { ChevronRight, ChevronDown, Wrench, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '#/shared/lib/cn'
import type { ToolCallResult } from '#/modules/agent/domain/agent-types'

interface ToolCallCardProps {
  toolName: string
  args: unknown
  result: ToolCallResult
}

export function ToolCallCard({ toolName, args, result }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="my-2 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-black/40">
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="size-3 text-white/40" />
        ) : (
          <ChevronRight className="size-3 text-white/40" />
        )}
        <Wrench className="size-3.5 text-white/50" />
        <span className="font-mono text-xs font-medium">{toolName}</span>
        {result.success ? (
          <CheckCircle2 className="size-3.5 text-green-500" />
        ) : (
          <XCircle className="size-3.5 text-red-500" />
        )}
        <span className="text-xs text-white/40">{result.durationMs}ms</span>
      </button>
      {expanded && (
        <div className="border-t border-[var(--glass-border)] px-3 py-2">
          {!!args && (
            <div className="mb-2">
              <div className="text-xs font-semibold text-white/40">Input</div>
              <pre className="mt-1 max-h-32 overflow-auto rounded-md bg-black/40 p-2 text-xs">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          <div>
            <div className="text-xs font-semibold text-white/40">Output</div>
            <pre className={cn(
              'mt-1 max-h-48 overflow-auto rounded-md bg-black/40 p-2 text-xs',
              !result.success && 'text-red-400',
            )}>
              {result.output || result.error || '(empty)'}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
