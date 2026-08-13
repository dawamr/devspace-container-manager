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
  // bcryptjs is server-only via createServerFn — TanStack Start strips
  // server function handlers from the client bundle. No manual exclusion
  // needed; doing so can cause dev-mode module resolution issues.
})

export default config
