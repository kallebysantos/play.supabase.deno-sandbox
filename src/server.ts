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

export const run: ServerRoute<{ id: string }> = {
  match: new URLPattern({ pathname: '/run/:id' }),
  async fetch(req, ctx, { id }) {
    const sandbox = ctx.sandboxManager.get(id)
    if (!sandbox) {
      return new Response(null, { status: 404 })
    }
    if (sandbox.isBlocked()) {
      return Response.json(`Service can't run, right now. state=${sandbox.state()}`, {
        status: 423,
      })
    }

    const { code, wait } = await req.json()

    sandbox.run(code, wait)
    if (!wait) {
      return new Response(null, { status: 202 })
    }

    const output = await sandbox.output()

    return new Response(output, { status: 200 })
  },
}

export const output: ServerRoute<{ id: string }> = {
  match: new URLPattern({ pathname: '/output/:id' }),
  async fetch(_req, ctx, { id }) {
    const sandbox = ctx.sandboxManager.get(id)
    if (!sandbox) {
      return new Response(null, { status: 404 })
    }

    if (sandbox.state() === 'processing') {
      sandbox.askOutput()
    }

    const output = await sandbox.output()
    return new Response(output, { status: 200 })
  },
}

const terminate: ServerRoute<{ id: string }> = {
  match: new URLPattern({ pathname: '/terminate/:id' }),
  async fetch(_req, ctx, { id }) {
    await ctx.sandboxManager.delete(id)

    return new Response(null, { status: 204 })
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

    const isOutput = output.match.exec(req.url)
    if (isOutput) {
      return output.fetch(req, context, { id: isOutput.pathname.groups.id! })
    }

    const isTerminate = terminate.match.exec(req.url)
    if (isTerminate) {
      return terminate.fetch(req, context, { id: isTerminate.pathname.groups.id! })
    }

    return new Response('Action NotFound', { status: 404 })
  },
} satisfies Deno.ServeDefaultExport
