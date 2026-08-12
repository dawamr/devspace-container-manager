import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '#/shared/ui/sheet'

interface MobileDrawerProps {
  title: string
  trigger: ReactNode
  children: ReactNode
}

export function MobileDrawer({ title, trigger, children }: MobileDrawerProps) {
  const [open, setOpen] = useState(false)
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  // Links rendered inside SheetContent don't count as an outside click, so the
  // drawer would stay open on top of the page the user just navigated to.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 px-4">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
