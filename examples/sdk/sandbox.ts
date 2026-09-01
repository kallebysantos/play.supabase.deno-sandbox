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
