const workers = new Map<string, Worker>()

export default {
  fetch: (req, info) => {
    console.log(info, req)
    const url = new URL(req.url)
    if (url.pathname.startsWith('/create')) {
      const id = '123'
      const worker = init()
      worker.postMessage({
        command: 'init',
        data: { id },
      })

      workers.set(id, worker)
      return Response.json({ worker: { id } }, { status: 201 })
    }

    if (url.pathname.startsWith('/terminate')) {
      const id = '123'
      const worker = workers.get(id)
      if (!worker) {
        return new Response(null, { status: 404 })
      }

      worker.postMessage({
        command: 'init',
        data: { id },
      })

      worker.terminate()
      workers.delete(id)

      return Response.json({ worker: { id } }, { status: 202 })
    }

    return Response.json({ msg: 'Hello' })
  },
} satisfies Deno.ServeDefaultExport

export function init() {
  const worker = new Worker(new URL('./worker.ts', import.meta.url).href, {
    type: 'module',
  })

  return worker
}
