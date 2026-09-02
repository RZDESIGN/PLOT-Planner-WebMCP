import type { EmailOtpType, Session } from '@supabase/supabase-js'
import { cleanAuthCallbackUrl, readSupabaseAuthCallback } from './navigation'
import { supabase } from './supabase'

export interface AuthInitializationResult {
  session: Session | null
  callbackError: Error | null
}

let initializationPromise: Promise<AuthInitializationResult> | null = null

/**
 * Supabase's callback errors are written for the developer: the verifier
 * failure, for instance, ends with advice about Next.js and SvelteKit. Someone
 * who just clicked a link in their inbox needs to know what to do instead.
 */
function callbackFailure(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error)
  const lowered = detail.toLowerCase()

  if (lowered.includes('code verifier') || lowered.includes('code_verifier')) {
    return new Error(
      'Open the link in the same browser you requested it from. Sign-in links cannot be completed from a different browser, a private window, or an email app’s built-in viewer.',
    )
  }
  if (lowered.includes('expired')) {
    return new Error('This sign-in link has expired. Request a new one and open it within the hour.')
  }
  if (lowered.includes('already') || lowered.includes('used')) {
    return new Error('This sign-in link was already used. Request a new one.')
  }
  if (!detail) {
    return new Error('This sign-in link is invalid or expired. Request a new magic link.')
  }
  return new Error(`This sign-in link could not be completed: ${detail}`)
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

    // Templates that use {{ .TokenHash }} deliver ?token_hash=&type= instead of
    // a PKCE code. Verifying it here is what turns that link into a session;
    // without this branch the callback is not recognised at all and the visitor
    // silently lands signed out.
    if (callback.tokenHash) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: callback.tokenHash,
        type: (callback.otpType || 'magiclink') as EmailOtpType,
      })
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
