import type { Session } from '@supabase/supabase-js'
import { cleanAuthCallbackUrl, readSupabaseAuthCallback } from './navigation'
import { supabase } from './supabase'

export interface AuthInitializationResult {
  session: Session | null
  callbackError: Error | null
}

let initializationPromise: Promise<AuthInitializationResult> | null = null

function callbackFailure(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error)
  return new Error(
    detail
      ? `This sign-in link could not be completed: ${detail}`
      : 'This sign-in link is invalid or expired. Request a new magic link.',
  )
}

async function resolveInitialSession(
  href: string,
  replaceUrl: (nextHref: string) => void,
): Promise<AuthInitializationResult> {
  const callback = readSupabaseAuthCallback(href)
  if (!callback.isCallback) {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return { session: data.session, callbackError: null }
  }

  try {
    if (callback.error) throw new Error(callback.error)

    if (callback.code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(callback.code)
      if (error) throw error
      return { session: data.session, callbackError: null }
    }

    if (!callback.accessToken || !callback.refreshToken) {
      throw new Error('The callback did not contain a complete session.')
    }

    // Keeps magic links sent before the PKCE migration working. setSession also
    // writes the recovered session to Supabase's durable browser storage.
    const { data, error } = await supabase.auth.setSession({
      access_token: callback.accessToken,
      refresh_token: callback.refreshToken,
    })
    if (error) throw error
    return { session: data.session, callbackError: null }
  } catch (error) {
    // A session may already have been persisted before a one-use callback was
    // refreshed. Never discard that healthy session just because the URL is stale.
    const { data } = await supabase.auth.getSession()
    return { session: data.session, callbackError: callbackFailure(error) }
  } finally {
    replaceUrl(cleanAuthCallbackUrl(href))
  }
}

export function initializeSupabaseSession(
  href: string,
  replaceUrl: (nextHref: string) => void,
) {
  // React StrictMode mounts effects twice in development. A module-level promise
  // guarantees that a one-use PKCE code is exchanged exactly once.
  initializationPromise ??= resolveInitialSession(href, replaceUrl)
  return initializationPromise
}
