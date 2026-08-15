import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [tanstackStart({ srcDirectory: 'app' }), viteReact(), tailwindcss()],
  server: {
    // DevSpace runs behind Traefik + Cloudflare Tunnel in dev containers;
    // allow the public hostname through vite's host check.
    allowedHosts: ['devspace.1dev.my.id', '.1dev.my.id'],
  },
  // dockerode pulls in ssh2 → cpu-features (native .node addon). These are
  // server-only modules that must stay externalized — Vite must not try to
  // bundle them for the browser or SSR optimize them.
  ssr: {
    noExternal: ['bcryptjs'],
    external: ['dockerode', 'ssh2', 'cpu-features', 'posthog-node'],
  },
  optimizeDeps: {
    exclude: ['dockerode', 'ssh2', 'cpu-features'],
  },
  // bcryptjs is server-only via createServerFn — TanStack Start strips
  // server function handlers from the client bundle. No manual exclusion
  // needed; doing so can cause dev-mode module resolution issues.
})

export default config
