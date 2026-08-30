import { SandboxManager } from './sandbox/manager.ts'

const sandboxManager = new SandboxManager()

export default {
  fetch: (req, info) => {
    console.log(info, req)
    const url = new URL(req.url)

    if (url.pathname.startsWith('/list')) {
      const sandboxes = sandboxManager.list()

      return Response.json(sandboxes, { status: 201 })
    }

    if (url.pathname.startsWith('/create')) {
      const sandbox = sandboxManager.create()

      return Response.json(sandbox, { status: 201 })
    }

    if (url.pathname.startsWith('/run')) {
      const id = url.pathname.split('/').at(2)
      if (!id) return new Response('missing id', { status: 400 })

      const sandbox = sandboxManager.get(id)
      if (!sandbox) return new Response(null, { status: 404 })

      sandbox.run(`console.log('Hello from Sandbox')`)

      return new Response(null, { status: 200 })
    }

    if (url.pathname.startsWith('/terminate')) {
      const id = url.pathname.split('/').at(2)
      if (!id) return new Response('missing id', { status: 400 })

      sandboxManager.delete(id)

      return new Response(null, { status: 204 })
    }

    return new Response()
  },
} satisfies Deno.ServeDefaultExport
