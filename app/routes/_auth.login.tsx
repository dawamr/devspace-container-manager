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
        <h2 className="text-xl font-semibold text-foreground">Masuk ke DevSpace</h2>
        <p className="text-sm text-muted-foreground">
          Gunakan akun yang diberikan admin untuk masuk.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="admin@devspace.local"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? 'Memproses...' : 'Masuk'}
      </Button>
    </form>
  )
}
