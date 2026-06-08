'use client'

import { createClient } from '@supabase/supabase-js'
import { getFirebaseClientAuth } from '@/lib/firebase/client'

let client

export function createSupabaseBrowserClient() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        accessToken: async () => (
          await getFirebaseClientAuth().currentUser?.getIdToken(false)
        ) || null,
      },
    )
  }
  return client
}
