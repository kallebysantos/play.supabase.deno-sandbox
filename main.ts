import Server from './src/server.ts'

console.log('Workers sandbox started')

export default {
  fetch: Server.fetch,
} satisfies Deno.ServeDefaultExport
