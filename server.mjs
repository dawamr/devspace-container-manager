import { serve } from 'srvx'
import { serveStatic } from 'srvx/static'

import ssr from './dist/server/server.js'

const port = Number(process.env.PORT ?? 3000)
const hostname = process.env.HOST ?? '0.0.0.0'

// Build output is content-hashed, so it can be cached indefinitely.
const cacheAssets = async (request, next) => {
  const response = await next()

  if (new URL(request.url).pathname.startsWith('/assets/')) {
    response.headers.set('cache-control', 'public, max-age=31536000, immutable')
  }

  return response
}

const server = serve({
  port,
  hostname,
  middleware: [cacheAssets, serveStatic({ dir: './dist/client' })],
  fetch: (request) => ssr.fetch(request),
})

await server.ready()

console.log(`DevSpace listening on http://${hostname}:${port}`)
