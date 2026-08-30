export const WORKER_MODULE = new URL('./sandbox_worker.ts', import.meta.url)

export class SandboxManager {
  private sandboxes = new Map<string, Sandbox>()

  constructor(private workerModulePath = WORKER_MODULE) {
  }

  list(): Sandbox[] {
    return this.sandboxes.values().toArray()
  }

  create(): Sandbox {
    const id = crypto.randomUUID()
    const worker = new Worker(this.workerModulePath.href, {
      type: 'module',
    })

    const workerBox = new Sandbox(id, worker)

    this.sandboxes.set(id, workerBox)

    return workerBox
  }

  delete(id: string) {
    const sandbox = this.sandboxes.get(id)
    if (!sandbox) return

    sandbox.terminate()

    this.sandboxes.delete(id)
  }
}

export class Sandbox {
  readonly #inner: Worker

  constructor(
    private readonly id: string,
    worker: Worker,
  ) {
    this.#inner = worker
    this.#inner.postMessage({
      command: 'init',
      data: { id },
    })
  }

  terminate() {
    this.#inner.terminate()
  }
}
