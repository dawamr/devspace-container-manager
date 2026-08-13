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
})

export default config
