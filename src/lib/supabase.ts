import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const defaultUrl = 'https://rarawrgxqbnmzcjhxyic.supabase.co'
const defaultPublishableKey = 'sb_publishable_j8vEqkDP83U5ggKsfoC_Xw_oRY6lp3t'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultUrl
export const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || defaultPublishableKey
export const publicAppUrl = import.meta.env.VITE_PUBLIC_APP_URL || ''

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce',
    // PLOT resolves the callback before booting a guest workspace. This avoids a
    // race between getSession(), the one-use PKCE exchange and board loading.
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
