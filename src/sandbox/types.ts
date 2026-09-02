export type SandboxState =
  | 'init'
  | 'idle'
  | 'ready'
  | 'processing'
  | 'finished'
  | 'failed'
  | 'terminated'

export type SandboxInitEvent = {
  event: 'init'
  id: string
  workdir: string
}

export type SandboxNewStateEvent = {
  event: 'new-state'
  newState: SandboxState
}

export type SandboxRunCommandEvent = {
  event: 'run-command'
  command: string
  args?: string[]
  wait?: boolean
}

export type SandboxEvalCodeEvent = {
  event: 'eval-code'
  code: string
  wait?: boolean
}

export type SandboxRequestOutputEvent = {
  event: 'request-output'
}

export type SandboxOutputEvent = {
  event: 'output'
  output: Uint8Array<ArrayBuffer>
}

export type SandboxWriteFileEvent = {
  event: 'file-write'
  filepath: string
  data: ArrayBuffer
  wait?: boolean
}

export type SandboxTerminateEvent = {
  event: 'terminate'
}

export type SandboxEvent =
  | SandboxInitEvent
  | SandboxNewStateEvent
  | SandboxRunCommandEvent
  | SandboxEvalCodeEvent
  | SandboxRequestOutputEvent
  | SandboxOutputEvent
  | SandboxWriteFileEvent
  | SandboxTerminateEvent
