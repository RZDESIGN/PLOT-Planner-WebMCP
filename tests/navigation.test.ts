import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildAuthRedirectUrl,
  buildBoardUrl,
  cleanAuthCallbackUrl,
  readPlotNavigation,
  readSupabaseAuthCallback,
  removeInvitationFromUrl,
} from '../src/lib/navigation.ts'

test('magic-link redirects keep board context but drop transient auth and tracking data', () => {
  const redirect = buildAuthRedirectUrl(
    'http://localhost:5173/?board=board-1&invite=secret&code=old&utm_source=test#top',
    'https://plot.example.com/app/',
  )
  assert.equal(redirect, 'https://plot.example.com/app/?board=board-1&invite=secret')
})

test('board and invitation links use a canonical, addressable board URL', () => {
  assert.equal(
    buildBoardUrl(
      'http://localhost:5173/?code=secret',
      'board-2',
      'invitation-token',
      'https://plot.example.com/',
    ),
    'https://plot.example.com/?board=board-2&invite=invitation-token',
  )
})

test('PKCE and legacy implicit callbacks are detected and safely removed', () => {
  const pkce = readSupabaseAuthCallback(
    'https://plot.example.com/?board=board-1&code=one-use-code',
  )
  assert.equal(pkce.code, 'one-use-code')
  assert.equal(pkce.isCallback, true)

  const legacyHref =
    'https://plot.example.com/?board=board-1&invite=join#access_token=access&refresh_token=refresh&type=magiclink'
  const legacy = readSupabaseAuthCallback(legacyHref)
  assert.equal(legacy.accessToken, 'access')
  assert.equal(legacy.refreshToken, 'refresh')
  assert.equal(
    cleanAuthCallbackUrl(legacyHref),
    'https://plot.example.com/?board=board-1&invite=join',
  )
})

test('callback cleanup and invitation acceptance preserve the stable board reference', () => {
  const callbackUrl = cleanAuthCallbackUrl(
    'https://plot.example.com/?board=board-1&invite=join&error=access_denied&error_description=Expired',
  )
  assert.deepEqual(readPlotNavigation(callbackUrl), {
    boardId: 'board-1',
    invitationToken: 'join',
  })
  assert.equal(
    removeInvitationFromUrl(callbackUrl),
    'https://plot.example.com/?board=board-1',
  )
})
