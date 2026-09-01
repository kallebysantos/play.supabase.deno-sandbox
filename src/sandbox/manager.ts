import {
  SandboxEvalCodeEvent,
  SandboxEvent,
  SandboxInitEvent,
  SandboxRequestOutputEvent,
  SandboxState,
  SandboxTerminateEvent,
} from './types.ts'

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

  async create(wait = false): Promise<Sandbox> {
    const id = Deno.env.get('ENV') === 'USE_DEV_ID' ? '123' : crypto.randomUUID()
    const worker = new Worker(this.workerModulePath.href, {
      type: 'module',
    })

    const workerBox = new Sandbox(id, worker)
    this.sandboxes.set(id, workerBox)

    if (wait) {
      for await (const state of workerBox.waitState('idle')) {
        if (state === 'idle') {
          break
        }
      }
    }

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
  #output: Uint8Array<ArrayBuffer> | null = null

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
    if (e.data.event === 'output') {
      this.setOutput(e.data.output)
    }
    if (e.data.event === 'terminate') {
      this._terminate()
    }
  }

  private setState(newState: SandboxState) {
    const oldState = this.#state
    this.#state = newState

    return oldState
  }

  private setOutput(newOutput: Uint8Array<ArrayBuffer>) {
    this.#output = newOutput
  }

  state() {
    return this.#state
  }

  flush() {
    this.#output = null
  }

  async output() {
    if (this.#output) {
      return this.#output
    }

    for await (const state of this.waitState('finished')) {
      if (state === 'finished') {
        this.setState('idle')

        return this.#output
      }
    }
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

  isBlocked() {
    return (
      this.#state === 'init' ||
      this.#state === 'processing' ||
      this.#state === 'terminated'
    )
  }

  run(code: string, wait = false) {
    if (this.isBlocked()) {
      throw new Error(`Sandbox can't run because its '${this.#state}'`)
    }

    if (wait) {
      this.flush()
    }

    this.#inner.postMessage(
      {
        event: 'eval-code',
        code,
        wait,
      } satisfies SandboxEvalCodeEvent,
    )
  }

  askOutput() {
    if (this.#state !== 'processing') {
      throw new Error(`Working is not 'processing' but ${this.#state}`)
    }

    this.#inner.postMessage({ event: 'request-output' } satisfies SandboxRequestOutputEvent)
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
