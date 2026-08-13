import type { HTMLAttributes } from 'react'
import { cn } from '#/shared/lib/cn'

/* ------------------------------------------------------------------ */
/* Shared base class strings — single source of truth for glass surface */
/* ------------------------------------------------------------------ */

/** Base glass surface — dipakai oleh GlassCard, GlassSurface, GlassPanel */
const GLASS_SURFACE_BASE = [
  'border backdrop-blur-[var(--glass-blur)]',
  'bg-[var(--glass-surface)] border-[var(--glass-border)]',
  'shadow-[var(--glass-shadow)]',
  'text-white',
].join(' ')

/** Variant modifiers untuk surface opacity */
const GLASS_VARIANTS = {
  strong: 'bg-[var(--glass-surface-strong)] border-[var(--glass-border-strong)]',
  subtle: 'bg-[var(--glass-surface-subtle)]',
} as const

/* ------------------------------------------------------------------ */
/* GlassCard — surface kaca utama                                      */
/* ------------------------------------------------------------------ */

type GlassCardProps = {
  children?: React.ReactNode
  className?: string
  /** Surface lebih tebal (untuk dialog, panel utama) */
  strong?: boolean
  /** Surface lebih tipis (untuk widget, tile) */
  subtle?: boolean
  /** Border lebih terang */
  borderStrong?: boolean
} & HTMLAttributes<HTMLDivElement>

/**
 * Komponen kaca reusable — pengganti glass-panel class.
 * Menggunakan CSS token --glass-* dari globals.css.
 */
export function GlassCard({
  children,
  className,
  strong,
  subtle,
  borderStrong,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        `rounded-[var(--glass-radius)] ${GLASS_SURFACE_BASE}`,
        strong && GLASS_VARIANTS.strong,
        subtle && GLASS_VARIANTS.subtle,
        borderStrong && 'border-[var(--glass-border-strong)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* GlassCardContent — card dengan padding standar                      */
/* ------------------------------------------------------------------ */

export function GlassCardContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('p-6', className)}>{children}</div>
}

/* ------------------------------------------------------------------ */
/* GlassCardCompact — card dengan padding compact                      */
/* ------------------------------------------------------------------ */

export function GlassCardCompact({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('p-4', className)}>{children}</div>
}

/* ------------------------------------------------------------------ */
/* GlassSurface — wrapper kaca generic (untuk div, section, aside)     */
/* ------------------------------------------------------------------ */

type GlassSurfaceProps = {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'section' | 'aside' | 'main' | 'article' | 'header' | 'footer'
  strong?: boolean
  subtle?: boolean
} & HTMLAttributes<HTMLElement>

/**
 * Wrapper kaca untuk elemen semantik (section, aside, dll).
 * Tidak menambahkan padding — pemanggil yang atur.
 */
export function GlassSurface({
  children,
  className,
  as = 'div',
  strong,
  subtle,
  ...props
}: GlassSurfaceProps) {
  const Comp = as
  return (
    <Comp
      className={cn(
        `rounded-[var(--glass-radius)] ${GLASS_SURFACE_BASE}`,
        strong && GLASS_VARIANTS.strong,
        subtle && GLASS_VARIANTS.subtle,
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}

/* ------------------------------------------------------------------ */
/* GlassPanel — inline glass panel (radius sm, blur sm)                */
/* ------------------------------------------------------------------ */

type GlassPanelProps = {
  children: React.ReactNode
  className?: string
  /**
   * Surface opacity variant.
   * - default: --glass-surface
   * - strong: --glass-surface-strong + border-strong
   * - subtle: --glass-surface-subtle
   */
  strong?: boolean
  subtle?: boolean
} & HTMLAttributes<HTMLDivElement>

/**
 * Inline glass panel untuk wrapper kecil (alert, callout, toolbar,
 * stat widget, app tile).
 * Pakai radius sm, blur sm — lebih compact dari GlassCard.
 */
export function GlassPanel({
  children,
  className,
  strong,
  subtle,
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--glass-radius-sm)] border backdrop-blur-[var(--glass-blur-sm)]',
        'bg-[var(--glass-surface)] border-[var(--glass-border)] text-white',
        strong && GLASS_VARIANTS.strong,
        subtle && GLASS_VARIANTS.subtle,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* PageHeader — header halaman dengan title + description konsisten    */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {description ? (
          <p className="text-sm text-white/60">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  )
}
