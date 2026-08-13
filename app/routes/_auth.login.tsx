import type { FormEvent } from 'react'
import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { loginFn } from '#/modules/auth/server/login'
import { captureEvent, identifyUser } from '#/shared/lib/posthog'
import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import { Label } from '#/shared/ui/label'

export const Route = createFileRoute('/_auth/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    const startTime = Date.now()
    captureEvent('auth_login_started')
    try {
      const result = await loginFn({ data: { email, password } })
      captureEvent('auth_login_completed', {
        duration_ms: Date.now() - startTime,
        user_id: result.user.id,
      })
      identifyUser(result.user.id, {
        email: result.user.email,
        name: result.user.name,
        role: result.user.roleName,
      })
      navigate({ to: '/' })
    } catch (err) {
      captureEvent('auth_login_failed', {
        duration_ms: Date.now() - startTime,
      })
      setError(err instanceof Error ? err.message : 'Login gagal')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold tracking-tight text-white">Masuk ke DevSpace</h2>
        <p className="text-sm text-white/60">Gunakan akun yang diberikan admin untuk masuk.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-white/80">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="admin@devspace.local"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border-white/20 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-white/20"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-white/80">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="border-white/20 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-white/20"
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 h-10 w-full bg-white text-black transition-colors hover:bg-white/90"
      >
        {isSubmitting ? 'Memproses...' : 'Masuk'}
      </Button>
    </form>
  )
}
