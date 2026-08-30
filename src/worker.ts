/// <reference lib="deno.worker" />

self.onmessage = (e: MessageEvent) => {
  console.log(e)

  self.close()
}
