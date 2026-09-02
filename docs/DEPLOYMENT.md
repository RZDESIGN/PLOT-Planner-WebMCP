# Deploying PLOT

PLOT is a static React/Vite frontend backed by the hosted Supabase project. WebMCP lives in the browser bundle; no separate MCP server or Node process is required in production.

The production app is https://plotplanner.xyz/. See [the dated production verification record](PRODUCTION_VERIFICATION.md) for completed checks and remaining authentication checks.

## 1. Build the production bundle

```bash
npm ci
npm run check
```

The deployable files are generated in `dist/`.

## 2. Configure environment variables

Vite reads these variables at build time:

```text
VITE_SUPABASE_URL=https://rarawrgxqbnmzcjhxyic.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
VITE_PUBLIC_APP_URL=https://plotplanner.xyz/
```

`VITE_PUBLIC_APP_URL` is the single canonical URL used in magic links, board permalinks, and invitations. Do not mix apex and `www` origins: browser session storage is origin-specific. The publishable key is safe to include in the client bundle. Never expose a Supabase `service_role` key or another secret through a `VITE_` variable.

## 3. Deploy to Hostinger

### GitHub deployment

Connect `RZDESIGN/PLOT-Planner-WebMCP` and use these build settings:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Branch | `main` |
| Node.js version | `24.x` |
| Root directory | `./` |
| Package manager | npm |
| Install command, if shown | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |

Add all three environment variables from section 2 before deploying. Copy the
publishable key from `.env.example`. This frontend does not need a start command
or server entry file; Hostinger serves the generated static files. Changing a
`VITE_` variable requires a new build.

Click **Deploy** after saving the settings. Hostinger's [Node.js web app
guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)
also covers GitHub imports and the Vite preset.

### Manual static upload

1. Build locally with `npm run check`.
2. Upload the **contents** of `dist/` to the site's document root, normally `public_html/`.
3. Ensure unknown routes fall back to `/index.html`. PLOT currently uses query parameters for invitations, but an SPA fallback keeps future client-side routes refresh-safe.
4. Serve the site over HTTPS.
5. Open the final URL in a fresh incognito session and verify that the anonymous demo loads without local storage or a cached login.

An Apache `.htaccess` fallback, when Hostinger uses Apache, can be configured as:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## 4. Configure Supabase Auth

In the Supabase dashboard, open **Authentication → URL Configuration**:

1. Set **Site URL** to `https://plotplanner.xyz/`, matching `VITE_PUBLIC_APP_URL`.
2. Add `https://plotplanner.xyz/` to **Redirect URLs**.
3. Keep the local development redirect only if it is still needed.

The base settings in `supabase/config.toml` configure local development at `http://localhost:5173/`. The `[remotes.production]` override selects the hosted PLOT project and sets its canonical HTTPS URL while preserving its TOTP and email-confirmation settings. The hosted redirect allow-list includes `https://plotplanner.xyz/`, `http://localhost:5173/` and `http://127.0.0.1:5173/`.

The configuration was synchronized and verified with Supabase CLI 2.116.0. Run from the repository root, using the exact project reference so the production override is loaded:

```bash
supabase config push --project-ref rarawrgxqbnmzcjhxyic
```

This is a write command, not a dry run. Review the configuration and matching remote override before invoking it: an agent or noninteractive environment may apply changes without pausing for confirmation. During this deployment, running the CLI from the actual intended directory was necessary to select its configuration reliably.

Magic-link login uses a one-time PKCE code and returns to the canonical frontend while preserving only the `board` and `invite` context. This step is required for collaboration outside localhost. Open the link in the same browser that requested it so the PKCE verifier is available.

## 5. Production verification

- Open the public URL in a clean browser session.
- Confirm the public template loads and WebMCP reports 17 registered tools in a capable browser.
- Sign in with a real email and create a sprint.
- Refresh twice and confirm the account and selected `?board=<id>` remain active.
- Copy the stable board permalink and confirm an existing member lands on that board in another profile.
- Generate an editor invite and a live-view invite.
- Accept each link in a separate browser profile.
- Confirm the invitation token disappears after acceptance while `?board=<id>` remains.
- Create or move a card as the editor and confirm that it appears for the viewer without refresh.
- Confirm that viewer mutation controls are disabled.
- Run one real browser-agent tool call and capture it for the challenge demo.
- Check the browser console and Supabase logs for unexpected errors.

## 6. Rollback

Keep the previous contents of `public_html/` until the new deployment passes the clean-session check. A frontend rollback only requires restoring the prior static files; database migrations should be treated separately and never rolled back by deleting production data.
