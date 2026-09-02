# Production verification — September 2, 2026

App: https://plotplanner.xyz/

Video: https://youtu.be/EtIJsp6dBow

Public source: https://github.com/RZDESIGN/PLOT-Planner-WebMCP

This record distinguishes completed checks from additional verification. The Devpost submission was confirmed through the official connector on September 2, 2026: [PLOT](https://devpost.com/software/plot-vyrc2b), submission `1157337`, recorded at `2026-09-02T11:20:52.947-04:00`.

## HTTPS and deployed frontend

- A normal HTTPS request returned **200**, with Hostinger response headers and the PLOT application HTML.
- The page loaded the anonymous activation sprint in Codex's in-app browser.
- The served `index-CylxIj3Z.js` bundle contains the `resolvingProposal` guard fix, the canonical `https://plotplanner.xyz` domain and the expected Supabase project reference.
- The guard fix and editable Remotion source were published in commit `c5b685c87ebd7da57ce23a075d98cb1551b2c821`.

## Native WebMCP on the public origin

Client: **Codex in-app browser**. Origin: **https://plotplanner.xyz/**. These checks use the browser's native page-tool capability, not the `window.__PLOT_WEBMCP_TEST__` bridge.

- All **17** page-defined tools were discovered.
- `plot.get_board` returned the anonymous guest/demo board.
- `plot.analyze_board` returned focus **69**, planned points **10**, capacity **13**.
- `plot.create_sticky_note` and `plot.convert_sticky_to_card` created and shaped a temporary customer signal in the guest demo.
- `plot.propose_sprint` produced the expected three ghost moves without changing the structured live board.
- `plot.dismiss_proposal` succeeded; the before/after structured board snapshots were identical.
- The final native `plot.apply_proposal` check awaits participant approval of the specific three card moves. The automated browser approval review blocked that action before execution. No fallback or indirect mutation was attempted.

The anonymous demo changes are local to the guest session. No signed-in private board was mutated during these public checks. Chrome and ChatGPT browser tests are not claimed.

## Supabase

Project: `rarawrgxqbnmzcjhxyic` (**PLOT**, `eu-west-1`), reported **ACTIVE_HEALTHY**.

- All **11** remote migrations match the migration versions and names in `supabase/migrations/`.
- All **11** application tables in the `public` schema have Row Level Security enabled.
- The final security advisor returned no database/RLS findings. It reported one Auth warning: leaked-password protection is disabled. PLOT's interface uses email magic links, not password login; no plan upgrade was made.
- Hosted Auth configuration was synchronized with the existing Supabase CLI login. **Site URL:** `https://plotplanner.xyz/`. **Redirect allow-list:** `https://plotplanner.xyz/`, `http://localhost:5173/`, `http://127.0.0.1:5173/`. A subsequent CLI comparison reported Auth, API, database and storage configuration up to date.
- The original hosted TOTP enrollment/verification and email-confirmation settings are enabled. Email requests retain their original one-minute interval and eight-digit OTP setting. The final security advisor check has no MFA finding.
- The earlier HTTP 403 came from Cloudflare rejecting a standalone HTTP client, not a missing Supabase account login. The official CLI could access and synchronize the configuration.
- End-to-end production magic-link email delivery remains untested; the anonymous judge flow does not require authentication.
- The base `supabase/config.toml` uses Vite's local origin. Its `[remotes.production]` override pins the hosted project, production URLs and existing hosted Auth protections. A CLI run from the repository root confirmed this override loads and matches the hosted configuration.

The password-protection advisory is described in [Supabase's documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Production URL configuration follows [Supabase's redirect guidance](https://supabase.com/docs/guides/auth/redirect-urls).

## Video and source checks

- YouTube confirmed **Public** publication on `@RicardoDeZoete`, with no copyright issues detected.
- The public player played the film and displayed the supplied English captions. Duration: **136.341 seconds**.
- The uploaded file is H.264, 1920 × 1080, 30 fps with AAC audio. The film has a PLOT poster and AI narration disclosure.
- A public unauthenticated metadata request returned the expected video title and author.
- GitHub reports the repository as public and recognizes its root **MIT** license. Its About homepage is `https://plotplanner.xyz/`.
- YouTube Studio confirmed the updated description was saved after the public-origin checks; the obsolete DNS-pending sentence was removed.
- The local app's **27 tests**, lint, TypeScript check and production build passed after the proposal fix and again during the final repository sync on September 2, 2026.

## Submission and additional verification

- After explicit participant approval, the project description, custom form answers, live URL and video were sent to Devpost. The returned status is **Submitted**; a separate project read confirmed its `submitted_at` value and published state. The description content matches the approved copy after Markdown normalization.
- The existing PLOT poster was uploaded as the project thumbnail. Its processed CDN image returned HTTP 200.
- Additional verification can complete the native apply test after approval of its proposed moves, and exercise production magic-link delivery. These results are not claimed by this record; the successful local apply evidence remains separately identified.
