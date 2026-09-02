/// <reference lib="deno.worker" />

import {
  SandboxEvalCodeEvent,
  SandboxEvent,
  SandboxInitEvent,
  SandboxNewStateEvent,
  SandboxOutputEvent,
  SandboxRequestOutputEvent,
  SandboxState,
  SandboxTerminateEvent,
} from './types.ts'

let id: string | null = null
let workdir: string | null = null
let state: SandboxState = 'init'
let process: Deno.ChildProcess | null = null

onmessage = async (e: MessageEvent<SandboxEvent>) => {
  if (e.data.event === 'init') {
    handleInit(e.data)
  }
  if (e.data.event === 'eval-code') {
    await handleEvalCode(e.data)
  }
  if (e.data.event === 'request-output') {
    await handleRequestOutput(e.data)
  }
  if (e.data.event === 'terminate') {
    handleTerminate(e.data)
  }
}

function postNewState(newState: SandboxState) {
  state = newState
  postMessage({ event: 'new-state', newState: state } satisfies SandboxNewStateEvent)
}

function postOutput(output: Deno.CommandOutput) {
  const view = new Uint8Array(output.stdout)

  postMessage(
    {
      event: 'output',
      output: view,
    } satisfies SandboxOutputEvent,
    [output.stdout.buffer],
  )
  postNewState('finished')
}

function handleInit(e: SandboxInitEvent) {
  id = e.id
  workdir = e.workdir

  postNewState('idle')
}

async function handleEvalCode(e: SandboxEvalCodeEvent) {
  if (process) throw new Error('Process already running')

  const command = new Deno.Command(Deno.execPath(), {
    args: ['eval', e.code],
    stdin: e.wait ? 'inherit' : 'piped',
    stdout: 'piped',
    stderr: 'piped',
    cwd: workdir!,
  })

  if (e.wait) {
    const output = await command.output()
    postOutput(output)
    return
  }

  process = command.spawn()
  postNewState('processing')
}

async function handleRequestOutput(e: SandboxRequestOutputEvent) {
  if (!process || state !== 'processing') throw new Error('Not processing')

  const output = await process.output()
  postOutput(output)
}

function handleTerminate(_e: SandboxTerminateEvent) {
  if (process) {
    process.kill()
  }

  postNewState('terminated')
}
