const NAVIGATION_PARAMETERS = ['board', 'invite'] as const
const AUTH_QUERY_PARAMETERS = [
  'code',
  'error',
  'error_code',
  'error_description',
  'sb_flow_id',
  'type',
] as const

export interface PlotNavigationState {
  boardId: string | null
  invitationToken: string | null
}

export interface SupabaseAuthCallback {
  code: string | null
  accessToken: string | null
  refreshToken: string | null
  error: string | null
  isCallback: boolean
}

function cleanBaseUrl(currentHref: string, configuredAppUrl?: string) {
  const currentUrl = new URL(currentHref)
  const targetUrl = configuredAppUrl?.trim()
    ? new URL(configuredAppUrl, currentUrl.origin)
    : currentUrl
  targetUrl.search = ''
  targetUrl.hash = ''
  return targetUrl
}

export function readPlotNavigation(href: string): PlotNavigationState {
  const url = new URL(href)
  return {
    boardId: url.searchParams.get('board'),
    invitationToken: url.searchParams.get('invite'),
  }
}

export function readSupabaseAuthCallback(href: string): SupabaseAuthCallback {
  const url = new URL(href)
  const hashParameters = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : '')
  const error =
    url.searchParams.get('error_description') ||
    url.searchParams.get('error') ||
    hashParameters.get('error_description') ||
    hashParameters.get('error')
  const code = url.searchParams.get('code')
  const accessToken = hashParameters.get('access_token')
  const refreshToken = hashParameters.get('refresh_token')

  return {
    code,
    accessToken,
    refreshToken,
    error,
    isCallback: Boolean(code || accessToken || refreshToken || error),
  }
}

export function buildAuthRedirectUrl(currentHref: string, configuredAppUrl?: string) {
  const currentUrl = new URL(currentHref)
  const targetUrl = cleanBaseUrl(currentHref, configuredAppUrl)
  for (const parameter of NAVIGATION_PARAMETERS) {
    const value = currentUrl.searchParams.get(parameter)
    if (value) targetUrl.searchParams.set(parameter, value)
  }
  return targetUrl.toString()
}

export function buildBoardUrl(
  currentHref: string,
  boardId: string,
  invitationToken?: string,
  configuredAppUrl?: string,
) {
  const targetUrl = cleanBaseUrl(currentHref, configuredAppUrl)
  targetUrl.searchParams.set('board', boardId)
  if (invitationToken) targetUrl.searchParams.set('invite', invitationToken)
  return targetUrl.toString()
}

export function cleanAuthCallbackUrl(href: string) {
  const url = new URL(href)
  for (const parameter of AUTH_QUERY_PARAMETERS) url.searchParams.delete(parameter)

  const hashParameters = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : '')
  if (
    hashParameters.has('access_token') ||
    hashParameters.has('refresh_token') ||
    hashParameters.has('error') ||
    hashParameters.has('error_description')
  ) {
    url.hash = ''
  }
  return url.toString()
}

export function removeInvitationFromUrl(href: string) {
  const url = new URL(href)
  url.searchParams.delete('invite')
  return url.toString()
}
