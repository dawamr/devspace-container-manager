import type { ReactNode } from 'react'
import { useState } from 'react'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '#/shared/ui/sheet'

interface MobileDrawerProps {
  title: string
  trigger: ReactNode
  children: ReactNode
}

export function MobileDrawer({ title, trigger, children }: MobileDrawerProps) {
  const [open, setOpen] = useState(false)

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
