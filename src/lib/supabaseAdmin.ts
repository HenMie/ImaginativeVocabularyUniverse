import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase'

let adminClient: SupabaseClient<Database> | null = null

/**
 * Lazily creates a Supabase client that uses the service role key.
 * Returns null when the key is not configured so callers can degrade gracefully.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  if (adminClient) {
    return adminClient
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'X-Client-Info': 'IVU-Admin'
      }
    }
  })

  return adminClient
}
