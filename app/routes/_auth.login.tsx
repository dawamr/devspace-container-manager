import type { FormEvent } from 'react'
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import { Label } from '#/shared/ui/label'

export const Route = createFileRoute('/_auth/login')({
  component: LoginPage,
})

function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setTimeout(() => setIsSubmitting(false), 800)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">Masuk ke DevSpace</h2>
        <p className="text-sm text-muted-foreground">Gunakan akun yang diberikan admin untuk masuk.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="nama@tspindonesia.com" required />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <a href="#" className="text-xs font-medium text-primary hover:underline">
            Lupa password?
          </a>
        </div>
        <Input id="password" name="password" type="password" required />
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? 'Memproses...' : 'Masuk'}
      </Button>
    </form>
  )
}
