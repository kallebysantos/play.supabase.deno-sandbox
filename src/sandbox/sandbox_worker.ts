/// <reference lib="deno.worker" />

import {
  SandboxEvalCodeEvent,
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
  if (e.data.event === 'eval-code') {
    handleEvalCode(e.data)
  }
  if (e.data.event === 'terminate') {
    handleTerminate(e.data)
  }
}

function postNewState(newState: SandboxState) {
  state = newState
  postMessage({ event: 'new-state', newState: state } satisfies SandboxNewStateEvent)
}

function handleInit(e: SandboxInitEvent) {
  id = e.id

  postNewState('idle')
}

function handleEvalCode(e: SandboxEvalCodeEvent) {
  if (process) throw new Error('Process already running')

  const command = new Deno.Command(Deno.execPath(), {
    args: ['eval', e.code],
  })

  process = command.spawn()

  postNewState('processing')
}

function handleTerminate(_e: SandboxTerminateEvent) {
  if (process) {
    process.kill()
  }

  postNewState('terminated')
}
