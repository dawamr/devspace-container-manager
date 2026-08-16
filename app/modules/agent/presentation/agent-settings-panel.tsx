import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import { Label } from '#/shared/ui/label'
import { GlassCard } from '#/shared/ui/glass-card'
import { getAgentSettingsFn } from '#/modules/agent/server/get-agent-settings'
import { updateAgentSettingsFn } from '#/modules/agent/server/update-agent-settings'

interface AgentSettingsForm {
  llmApiKey: string
  llmModel: string
  llmBaseUrl: string
  agentTokenBudget: number
  agentToolLimit: number
}

export function AgentSettingsPanel() {
  const queryClient = useQueryClient()
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<AgentSettingsForm>({
    llmApiKey: '',
    llmModel: 'gpt-4o',
    llmBaseUrl: '',
    agentTokenBudget: 50000,
    agentToolLimit: 50,
  })

  const { isLoading } = useQuery({
    queryKey: ['agent-settings'],
    queryFn: () => getAgentSettingsFn({ data: undefined }),
    enabled: true,
  })

  // Sync server data → form once loaded
  const { data } = useQuery({
    queryKey: ['agent-settings-raw'],
    queryFn: () => getAgentSettingsFn({ data: undefined }),
  })

  // Initialize form from server data
  useState(() => {
    if (data) {
      setForm({
        llmApiKey: data.hasApiKey ? '••••••••' : '',
        llmModel: data.llmModel,
        llmBaseUrl: data.llmBaseUrl,
        agentTokenBudget: data.agentTokenBudget,
        agentToolLimit: data.agentToolLimit,
      })
    }
  })

  const mutation = useMutation({
    mutationFn: (values: AgentSettingsForm) =>
      updateAgentSettingsFn({ data: values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-white/40" />
      </div>
    )
  }

  // Sync data to form if form hasn't been edited yet
  if (data && form.llmModel === 'gpt-4o' && !mutation.isPending) {
    const synced = {
      llmApiKey: data.hasApiKey ? '••••••••' : '',
      llmModel: data.llmModel,
      llmBaseUrl: data.llmBaseUrl,
      agentTokenBudget: data.agentTokenBudget,
      agentToolLimit: data.agentToolLimit,
    }
    if (JSON.stringify(synced) !== JSON.stringify(form)) {
      setForm(synced)
    }
  }

  return (
    <GlassCard className="p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* API Key */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="llm-api-key">LLM API Key</Label>
          <div className="flex items-center gap-2">
            <Input
              id="llm-api-key"
              type={showKey ? 'text' : 'password'}
              value={form.llmApiKey}
              onChange={(e) => setForm({ ...form, llmApiKey: e.target.value })}
              placeholder={data?.hasApiKey ? '•••••••• (leave as-is to keep)' : 'sk-...'}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
          <p className="text-xs text-white/40">
            {data?.hasApiKey
              ? 'API key is set. Leave the mask to keep the current key.'
              : 'No API key set. Required for agent to function.'}
          </p>
        </div>

        {/* Model */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="llm-model">Model</Label>
          <Input
            id="llm-model"
            type="text"
            value={form.llmModel}
            onChange={(e) => setForm({ ...form, llmModel: e.target.value })}
            placeholder="gpt-4o"
          />
        </div>

        {/* Base URL */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="llm-base-url">Base URL</Label>
          <Input
            id="llm-base-url"
            type="text"
            value={form.llmBaseUrl}
            onChange={(e) => setForm({ ...form, llmBaseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1"
          />
          <p className="text-xs text-white/40">
            Leave empty to use the default OpenAI endpoint.
          </p>
        </div>

        {/* Token Budget */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="token-budget">Token Budget per Session</Label>
          <Input
            id="token-budget"
            type="number"
            min={1000}
            max={1000000}
            value={form.agentTokenBudget}
            onChange={(e) => setForm({ ...form, agentTokenBudget: Number(e.target.value) })}
          />
          <p className="text-xs text-white/40">
            Maximum tokens the agent can use in a single session.
          </p>
        </div>

        {/* Tool Limit */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="tool-limit">Tool Call Limit</Label>
          <Input
            id="tool-limit"
            type="number"
            min={1}
            max={500}
            value={form.agentToolLimit}
            onChange={(e) => setForm({ ...form, agentToolLimit: Number(e.target.value) })}
          />
          <p className="text-xs text-white/40">
            Maximum tool calls the agent can make in a single session.
          </p>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save Settings
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-400">
              <CheckCircle2 className="size-4" />
              Settings saved
            </span>
          )}
          {mutation.isError && (
            <span className="text-sm text-red-400">
              Error: {mutation.error instanceof Error ? mutation.error.message : 'Unknown error'}
            </span>
          )}
        </div>
      </form>
    </GlassCard>
  )
}
