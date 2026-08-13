import { useEffect, useRef, type ReactNode } from 'react'
import { GlassCard } from '#/shared/ui/glass-card'

const CLIP_START = 3
const CLIP_END = 8

export function AuthLayout({ children }: { children: ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
  const video = videoRef.current
  if (!video) return
  const el: HTMLVideoElement = video

  el.playbackRate = 0.4

  function seekToClipStart() {
  el.currentTime = CLIP_START
  }

  function handleTimeUpdate() {
  if (el.currentTime >= CLIP_END) el.currentTime = CLIP_START
  }

  // Metadata may already be loaded from cache before this effect runs
  if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
  seekToClipStart()
  } else {
  el.addEventListener('loadedmetadata', seekToClipStart, { once: true })
  }

  el.addEventListener('timeupdate', handleTimeUpdate)

  return () => {
  el.removeEventListener('loadedmetadata', seekToClipStart)
  el.removeEventListener('timeupdate', handleTimeUpdate)
  }
  }, [])

  return (
    <div className="relative min-h-svh overflow-hidden">
      {/* Background video */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      >
              <source src="/assets/bg-login3.mp4" type="video/mp4" />
      </video>

      {/* Overlay: dark gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70" />

      {/* Content */}
      <div className="relative z-10 flex min-h-svh flex-col lg:flex-row">
        {/* Left: brand panel (desktop only) */}
        <div className="hidden flex-col justify-between p-10 lg:flex lg:w-[45%] xl:p-14">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-lg font-bold text-white backdrop-blur-sm">
              D
            </span>
            <span className="text-lg font-semibold tracking-tight text-white">DevSpace</span>
          </div>

          <div className="max-w-md space-y-4">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
              Kelola container & stack tanpa ribet
            </h1>
            <p className="text-base leading-relaxed text-white/70">
              DevSpace membantu tim mengelola project, environment, dan deployment Docker lewat
              Portainer dalam satu dashboard.
            </p>
          </div>

          <p className="text-xs text-white/40">© 2025 DevSpace — Internal Developer Platform</p>
        </div>

        {/* Right: form panel */}
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-sm">
            {/* Mobile brand header */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-base font-bold text-white backdrop-blur-sm">
                D
              </span>
              <span className="text-lg font-semibold tracking-tight text-white">DevSpace</span>
            </div>

            {/* Glass card */}
            <GlassCard strong className="rounded-2xl p-6 sm:p-8">
              {children}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  )
}
