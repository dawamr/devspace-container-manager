import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { cn } from '#/shared/lib/cn'
import type { RoutePath } from '#/shared/lib/route-path'

/* ------------------------------------------------------------------ */
/* Clock widget (CasaOS hero: tanggal + jam besar)                     */
/* ------------------------------------------------------------------ */

const DATE_FORMAT = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function ClockWidget() {
  const now = useNow()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')

  return (
    <section aria-label="Jam" className="glass-panel flex flex-col gap-1 rounded-2xl p-6">
      <span className="glass-text-muted text-sm capitalize">{DATE_FORMAT.format(now)}</span>
      <span className="text-5xl font-semibold tracking-tight tabular-nums md:text-6xl">
        {hours}
        <span className="glass-text-muted">:</span>
        {minutes}
      </span>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Circular gauge (CPU / RAM)                                          */
/* ------------------------------------------------------------------ */

export interface GaugeWidgetProps {
  label: string
  /** 0 - 100 */
  value: number
  detail?: string
}

const GAUGE_RADIUS = 34
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS

export function GaugeWidget({ label, value, detail }: GaugeWidgetProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const offset = GAUGE_CIRCUMFERENCE * (1 - clamped / 100)

  return (
    <section
      aria-label={label}
      className="glass-panel flex items-center gap-4 rounded-2xl p-4"
    >
      <svg viewBox="0 0 80 80" className="size-20 shrink-0 -rotate-90" role="img" aria-hidden>
        <circle
          cx="40"
          cy="40"
          r={GAUGE_RADIUS}
          fill="none"
          strokeWidth="7"
          className="stroke-white/15"
        />
        <circle
          cx="40"
          cy="40"
          r={GAUGE_RADIUS}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={GAUGE_CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="stroke-sky-300 transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="flex flex-col">
        <span className="glass-text-muted text-xs font-medium uppercase tracking-wide">{label}</span>
        <span className="text-2xl font-semibold tabular-nums">{Math.round(clamped)}%</span>
        {detail ? <span className="glass-text-muted text-xs">{detail}</span> : null}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Storage usage bar                                                   */
/* ------------------------------------------------------------------ */

export interface StorageWidgetProps {
  label: string
  usedLabel: string
  totalLabel: string
  /** 0 - 100 */
  percent: number
}

export function StorageWidget({ label, usedLabel, totalLabel, percent }: StorageWidgetProps) {
  const clamped = Math.min(100, Math.max(0, percent))

  return (
    <section aria-label={label} className="glass-panel flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="glass-text-muted text-xs tabular-nums">
          {usedLabel} / {totalLabel}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 overflow-hidden rounded-full bg-white/15"
      >
        <div
          className="h-full rounded-full bg-sky-300 transition-[width] duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Network throughput (sparkline sederhana)                            */
/* ------------------------------------------------------------------ */

export interface NetworkWidgetProps {
  label: string
  downLabel: string
  upLabel: string
  /** Riwayat throughput 0 - 1, index terakhir = terbaru */
  history: number[]
}

export function NetworkWidget({ label, downLabel, upLabel, history }: NetworkWidgetProps) {
  const points = history
    .map((v, i) => `${(i / Math.max(1, history.length - 1)) * 100},${32 - Math.min(1, Math.max(0, v)) * 28}`)
    .join(' ')

  return (
    <section aria-label={label} className="glass-panel flex flex-col gap-3 rounded-2xl p-4">
      <span className="text-sm font-medium">{label}</span>
      <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="h-12 w-full" aria-hidden>
        <polyline points={points} fill="none" strokeWidth="2" className="stroke-emerald-300" />
      </svg>
      <div className="flex items-center justify-between text-xs">
        <span className="glass-text-muted">
          ↓ <span className="text-white/90 tabular-nums">{downLabel}</span>
        </span>
        <span className="glass-text-muted">
          ↑ <span className="text-white/90 tabular-nums">{upLabel}</span>
        </span>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* App icon tile (CasaOS home grid)                                    */
/* ------------------------------------------------------------------ */

export interface GlassAppTileConfig {
  title: string
  description: string
  href: RoutePath
  icon: LucideIcon
}

export function GlassAppTile({ title, description, href, icon: Icon }: GlassAppTileConfig) {
  return (
    <Link
      to={href}
      className={cn(
        'group glass-panel-subtle flex flex-col items-center gap-3 rounded-2xl p-5 text-center transition-all',
        'hover:-translate-y-1 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-white/15 text-white shadow-inner transition-transform group-hover:scale-105">
        <Icon className="size-7" />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{title}</span>
        <span className="glass-text-muted text-xs">{description}</span>
      </span>
    </Link>
  )
}
