import { SandboxEvent, SandboxInitEvent, SandboxState, SandboxTerminateEvent } from './types.ts'

export const WORKER_MODULE = new URL('./sandbox_worker.ts', import.meta.url)

export class SandboxManager {
  private sandboxes = new Map<string, Sandbox>()

  constructor(private workerModulePath = WORKER_MODULE) {
  }

  get(id: string) {
    return this.sandboxes.get(id)
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

  async delete(id: string) {
    const sandbox = this.sandboxes.get(id)
    if (!sandbox) return

    sandbox.terminate()

    for await (const state of sandbox.waitState('terminated')) {
      if (state === 'terminated') {
        this.sandboxes.delete(id)
      }
    }
  }
}

export class Sandbox {
  readonly #inner: Worker
  #state: SandboxState

  constructor(
    private readonly id: string,
    worker: Worker,
  ) {
    console.info(`Sandbox ${this.id} initializing`)

    this.#inner = worker
    this.#state = 'init'
    this.#inner.onmessage = (e) => this.handleInnerMessage(e)
    this.#inner.postMessage(
      {
        event: 'init',
        id: this.id,
      } satisfies SandboxInitEvent,
    )
  }

  private handleInnerMessage(e: MessageEvent<SandboxEvent>) {
    if (e.data.event === 'new-state') {
      this.setState(e.data.newState)
    }
    if (e.data.event === 'terminate') {
      this._terminate()
    }
  }

  private setState(newState: SandboxState) {
    const oldState = this.#state
    this.#state = newState
    console.info(`Sandbox state: ${oldState} -> ${newState}`)

    return oldState
  }

  getState() {
    return this.#state
  }

  async *waitState(expected: SandboxState): AsyncGenerator<SandboxState> {
    let last: SandboxState | undefined
    while (true) {
      if (this.#state !== last) {
        last = this.#state
        yield this.#state
      }

      if (this.#state === expected) return

      await new Promise((r) => setTimeout(r, 50)) // poll interval
    }
  }

  run(code: string) {
    this.#inner.postMessage({
      command: 'eval',
      data: { code },
    })
  }

  private _terminate() {
    this.#inner.terminate()
    this.setState('terminated')
  }

  terminate(graceful = true) {
    if (!graceful) {
      return this._terminate()
    }

    this.#inner.postMessage({ event: 'terminate' } satisfies SandboxTerminateEvent)
  }
}
