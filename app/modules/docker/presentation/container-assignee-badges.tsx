import { Users } from 'lucide-react'

import type { ContainerAssignee } from '#/modules/docker/server/list-container-assignees'
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from '#/shared/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '#/shared/ui/tooltip'
import { cn } from '#/shared/lib/cn'

interface ContainerAssigneeBadgesProps {
  assignees: ContainerAssignee[]
  max?: number
  size?: 'default' | 'sm' | 'lg'
  onClick?: () => void
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Avatar stack showing container assignees. Empty state shows "Unassigned". */
export function ContainerAssigneeBadges({
  assignees,
  max = 3,
  size = 'sm',
  onClick,
}: ContainerAssigneeBadgesProps) {
  if (assignees.length === 0) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex items-center gap-1.5 text-xs text-white/40 transition-colors hover:text-white/60',
          onClick && 'cursor-pointer',
        )}
      >
        <Users className="size-3.5" />
        <span>Unassigned</span>
      </button>
    )
  }

  const visible = assignees.slice(0, max)
  const overflow = assignees.length - max

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn('flex items-center gap-2', onClick && 'cursor-pointer')}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClick()
                }
              }
            : undefined
        }
      >
        <AvatarGroup>
          {visible.map((a) => (
            <Tooltip key={a.userId}>
              <TooltipTrigger asChild>
                <Avatar size={size}>
                  <AvatarFallback>{getInitials(a.name)}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">{a.name}</p>
                <p className={cn('text-xs capitalize', a.role === 'owner' ? 'text-amber-300' : a.role === 'operator' ? 'text-blue-300' : 'text-white/50')}>
                  {a.role}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
          {overflow > 0 && (
            <Avatar size={size}>
              <AvatarGroupCount>+{overflow}</AvatarGroupCount>
            </Avatar>
          )}
        </AvatarGroup>
      </div>
    </TooltipProvider>
  )
}
