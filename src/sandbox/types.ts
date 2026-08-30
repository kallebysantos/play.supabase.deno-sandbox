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
}

export type SandboxNewStateEvent = {
  event: 'new-state'
  newState: SandboxState
}

export type SandboxTerminateEvent = {
  event: 'terminate'
}

export type SandboxEvent = SandboxInitEvent | SandboxNewStateEvent | SandboxTerminateEvent
