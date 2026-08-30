/// <reference lib="deno.worker" />

let id: string | null = null
let process: Deno.ChildProcess | null = null

self.onmessage = (e: MessageEvent) => {
  console.log(e)

  if (e.data?.command === 'init') {
    if (!id) {
      id = e.data?.data.id
    }
  }

  if (e.data?.command === 'eval') {
    evalCode(e.data?.data.code)
  }

  if (e.data?.command === 'stdout' && process) {
    process.output().then((output) => {
      console.log('STDOUT', output)
      /*
      self.postMessage({
        callback: 'stdout',
        data: output.stdout,
      })
      */
    })
  }
}

function evalCode(code: string) {
  if (process) throw new Error('Process already running')

  const command = new Deno.Command(Deno.execPath(), {
    args: ['eval', code],
  })

  process = command.spawn()
}
