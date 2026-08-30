// deno-lint-ignore-file require-await
import { SandboxManager } from './sandbox/manager.ts'

const context = {
  sandboxManager: new SandboxManager(),
}

export type ServerCtx = typeof context

export type ServerRoute<T = unknown> = {
  match: URLPattern
  fetch: T extends object ? (req: Request, ctx: ServerCtx, values: T) => Promise<Response>
    : (req: Request, ctx: ServerCtx) => Promise<Response>
}

export const list: ServerRoute = {
  match: new URLPattern({ pathname: '/list' }),
  async fetch(_req, ctx) {
    const sandboxes = ctx.sandboxManager.list()
    return Response.json(sandboxes, { status: 201 })
  },
}

const create: ServerRoute = {
  match: new URLPattern({ pathname: '/create' }),
  async fetch(_req, ctx) {
    const sandbox = ctx.sandboxManager.create()

    return Response.json(sandbox, { status: 201 })
  },
}

const terminate: ServerRoute<{ id: string }> = {
  match: new URLPattern({ pathname: '/terminate' }),
  async fetch(_req, ctx, { id }) {
    ctx.sandboxManager.delete(id)

    return new Response(null, { status: 204 })
  },
}

export const run: ServerRoute<{ id: string }> = {
  match: new URLPattern({ pathname: '/run/:id' }),
  async fetch(_req, ctx, { id }) {
    const sandbox = ctx.sandboxManager.get(id)
    if (!sandbox) return new Response(null, { status: 404 })

    sandbox.run(`console.log('Hello from Sandbox')`)

    return new Response(null, { status: 200 })
  },
}

export default {
  fetch: (req) => {
    const isList = list.match.exec(req.url)
    if (isList) {
      return list.fetch(req, context)
    }

    const isCreate = create.match.exec(req.url)
    if (isCreate) {
      return create.fetch(req, context)
    }

    const isRun = run.match.exec(req.url)
    if (isRun) {
      return run.fetch(req, context, { id: isRun.pathname.groups.id! })
    }

    const isTerminate = terminate.match.exec(req.url)
    if (isTerminate) {
      return terminate.fetch(req, context, { id: isTerminate.pathname.groups.id! })
    }

    return new Response('Action NotFound', { status: 404 })
  },
} satisfies Deno.ServeDefaultExport
