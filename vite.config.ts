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
  // bcryptjs uses Node.js Buffer which is not available in browser.
  // Mark as external for client builds — server functions handle it separately.
  optimizeDeps: {
    exclude: ['bcryptjs'],
  },
  ssr: {
    noExternal: ['bcryptjs'],
  },
})

export default config
