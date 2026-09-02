import {
  SandboxEvalCodeEvent,
  SandboxEvent,
  SandboxInitEvent,
  SandboxRequestOutputEvent,
  SandboxRunCommandEvent,
  SandboxState,
  SandboxTerminateEvent,
  SandboxWriteFileEvent,
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
    const workdir = await Deno.makeTempDir({ prefix: `deno_sandbox_${id}_` })
    const worker = new Worker(this.workerModulePath.href, {
      type: 'module',
      name: `sandbox_${id}`,
      deno: {
        permissions: {
          env: 'inherit',
          read: [this.workerModulePath, workdir],
          write: [workdir],
          run: true,
        },
      },
    })

    const workerBox = new Sandbox(id, workdir, worker)
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

    await sandbox.terminate()

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
    private readonly workdir: string,
    worker: Worker,
  ) {
    console.info(`Sandbox ${this.id} initializing`)

    this.#inner = worker
    this.#state = 'init'
    this.#inner.onmessage = async (e) => await this.handleInnerMessage(e)
    this.#inner.postMessage(
      {
        event: 'init',
        id: this.id,
        workdir: this.workdir,
      } satisfies SandboxInitEvent,
    )
  }

  private async handleInnerMessage(e: MessageEvent<SandboxEvent>) {
    if (e.data.event === 'new-state') {
      this.setState(e.data.newState)
    }
    if (e.data.event === 'output') {
      this.setOutput(e.data.output)
    }
    if (e.data.event === 'terminate') {
      await this._terminate()
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

  run(command: string, args?: string[], wait = false) {
    if (this.isBlocked()) {
      throw new Error(`Sandbox can't run because its '${this.#state}'`)
    }

    if (wait) {
      this.flush()
    }

    this.#inner.postMessage(
      {
        event: 'run-command',
        command,
        args,
        wait,
      } satisfies SandboxRunCommandEvent,
    )
  }

  evalCode(code: string, wait = false) {
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

  async writeFile(filepath: string, data: ArrayBuffer, wait = false) {
    // Ensuring Permission Container by moving the file creation to inner
    this.#inner.postMessage(
      {
        event: 'file-write',
        filepath,
        data,
        wait,
      } satisfies SandboxWriteFileEvent,
      [data],
    )

    await Promise.resolve()
  }

  askOutput() {
    if (this.#state !== 'processing') {
      throw new Error(`Working is not 'processing' but ${this.#state}`)
    }

    this.#inner.postMessage({ event: 'request-output' } satisfies SandboxRequestOutputEvent)
  }

  private async _terminate() {
    this.#inner.terminate()
    this.setState('terminated')
    await Deno.remove(this.workdir, { recursive: true })
  }

  async terminate(graceful = true) {
    if (!graceful) {
      return await this._terminate()
    }

    this.#inner.postMessage({ event: 'terminate' } satisfies SandboxTerminateEvent)
  }
}
