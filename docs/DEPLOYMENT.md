# Deploying PLOT

PLOT is a static React/Vite frontend backed by the hosted Supabase project. WebMCP lives in the browser bundle; no separate MCP server or Node process is required in production.

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
```

The publishable key is safe to include in the client bundle. Never expose a Supabase `service_role` key or another secret through a `VITE_` variable.

## 3. Deploy to Hostinger

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

1. Set **Site URL** to the production HTTPS origin.
2. Add the production URL to **Redirect URLs**.
3. Keep the local development redirect only if it is still needed.

Magic-link login and invitation acceptance return to the current frontend URL, so this step is required for collaboration outside localhost.

## 5. Production verification

- Open the public URL in a clean browser session.
- Confirm the public template loads and WebMCP reports 17 registered tools in a capable browser.
- Sign in with a real email and create a sprint.
- Generate an editor invite and a live-view invite.
- Accept each link in a separate browser profile.
- Create or move a card as the editor and confirm that it appears for the viewer without refresh.
- Confirm that viewer mutation controls are disabled.
- Run one real browser-agent tool call and capture it for the challenge demo.
- Check the browser console and Supabase logs for unexpected errors.

## 6. Rollback

Keep the previous contents of `public_html/` until the new deployment passes the clean-session check. A frontend rollback only requires restoring the prior static files; database migrations should be treated separately and never rolled back by deleting production data.
