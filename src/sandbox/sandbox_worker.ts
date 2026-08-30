/// <reference lib="deno.worker" />

import {
  SandboxEvent,
  SandboxInitEvent,
  SandboxNewStateEvent,
  SandboxState,
  SandboxTerminateEvent,
} from './types.ts'

let id: string | null = null
let state: SandboxState = 'init'
let process: Deno.ChildProcess | null = null

onmessage = (e: MessageEvent<SandboxEvent>) => {
  if (e.data.event === 'init') {
    handleInit(e.data)
  }
  if (e.data.event === 'terminate') {
    handleTerminate(e.data)
  }
}

function handleInit(e: SandboxInitEvent) {
  id = e.id
  state = 'idle'

  postMessage({ event: 'new-state', newState: state } satisfies SandboxNewStateEvent)
}

function handleTerminate(_e: SandboxTerminateEvent) {
  if (process) {
    process.kill()
  }

  state = 'terminated'
  postMessage({ event: 'terminate' } satisfies SandboxTerminateEvent)
}

function evalCode(code: string) {
  if (process) throw new Error('Process already running')

  const command = new Deno.Command(Deno.execPath(), {
    args: ['eval', code],
  })

  process = command.spawn()
}
