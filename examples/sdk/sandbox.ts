import * as path from '@std/path'

export type SandboxClientSettings = {
  baseUrl: string
  apikey?: string
}

export function getSandboxClientSettings(): SandboxClientSettings {
  return {
    baseUrl: Deno.env.get('SUPABASE_URL') ?? 'http://localhost:8000',
    apikey: Deno.env.get('SUPABASE_SECRET_KEY'),
  }
}

type SandboxItemResponse = {
  id: string
}
type CreateSandboxResponse = SandboxItemResponse
type ListSandboxResponse = SandboxItemResponse[]

export class Sandbox {
  private constructor(readonly id: string) {}

  private static fromSandboxItemResponse({ id }: SandboxItemResponse) {
    return new Sandbox(id)
  }

  static async create(
    wait = true,
    { baseUrl, apikey } = getSandboxClientSettings(),
  ): Promise<Sandbox> {
    const headers = new Headers()
    if (apikey) {
      headers.set('apikey', apikey)
    }

    const res = await fetch(new URL('/create', baseUrl), {
      method: 'POST',
      headers,
      body: JSON.stringify({ wait }),
    })

    const data = await res.json() as CreateSandboxResponse
    return this.fromSandboxItemResponse(data)
  }

  static async list(
    { baseUrl, apikey } = getSandboxClientSettings(),
  ): Promise<Sandbox[]> {
    const headers = new Headers()
    if (apikey) {
      headers.set('apikey', apikey)
    }

    const res = await fetch(new URL('/list', baseUrl), {
      method: 'GET',
      headers,
    })

    const sandboxes = await res.json() as ListSandboxResponse
    return sandboxes.map(this.fromSandboxItemResponse)
  }

  async runCommand(
    command: string,
    args?: string[],
    { baseUrl, apikey, wait } = {
      ...getSandboxClientSettings(),
      wait: true,
    },
  ) {
    const headers = new Headers()
    if (apikey) {
      headers.set('apikey', apikey)
    }

    const res = await fetch(new URL(`/run/${this.id}`, baseUrl), {
      method: 'POST',
      headers,
      body: JSON.stringify({ command, args, wait }),
    })

    if (wait) {
      return await res.text()
    }

    return res.ok
  }

  async upload(
    source: string,
    target: string,
    { baseUrl, apikey } = getSandboxClientSettings(),
  ) {
    const headers = new Headers()
    if (apikey) {
      headers.set('apikey', apikey)
    }

    const scriptDir = path.dirname(path.fromFileUrl(import.meta.url))
    const sourcePath = path.resolve(scriptDir, source)
    const sourceStat = await Deno.stat(sourcePath)
    if (!sourceStat.isFile) {
      throw new Error('Not a file')
    }

    const sourceData = await Deno.readFile(sourcePath)

    const upload = new FormData()
    upload.append('filepath', target)
    upload.append('data', new Blob([sourceData]))

    const res = await fetch(new URL(`/files/upload/${this.id}`, baseUrl), {
      method: 'POST',
      headers,
      body: upload,
    })

    console.log(res)

    return res.ok
  }

  /*
  async evalCode(
    code: string,
    { baseUrl, apikey, wait } = {
      ...getSandboxClientSettings(),
      wait: true,
    },
  ) {
    const headers = new Headers()
    if (apikey) {
      headers.set('apikey', apikey)
    }

    const res = await fetch(new URL(`/run/${this.id}`, baseUrl), {
      method: 'POST',
      headers,
      body: JSON.stringify({ code, wait }),
    })

    if (wait) {
      return await res.text()
    }

    return res.ok
  }
  */

  async terminate(
    { baseUrl, apikey } = getSandboxClientSettings(),
  ) {
    const headers = new Headers()
    if (apikey) {
      headers.set('apikey', apikey)
    }

    const res = await fetch(new URL(`/terminate/${this.id}`, baseUrl), {
      method: 'DELETE',
      headers,
    })

    return res.ok
  }
}
