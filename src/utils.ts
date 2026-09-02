import { resolveEnv } from '@supabase/server/core'

export const devEnv = Deno.env.get('USE_DEV_ENV')
  ? resolveEnv({
    publishableKeys: {
      default: 'sb_pub_123',
    },
    secretKeys: {
      default: 'sb_sec_123',
    },
    url: 'http://localhost:54321',
  }).data ?? undefined
  : undefined
