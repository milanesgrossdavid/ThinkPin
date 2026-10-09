# ThinkPin Extension

Manifest V3 extension for saving the active page to the same ThinkPin
account and bookmark API as the web app. It does not connect directly to
Postgres or Supabase tables and contains no service-role credentials.

## Load in Chrome

1. Deploy the web app and apply its existing Supabase migrations.
2. Open `chrome://extensions`, enable **Developer mode**, and select **Load
   unpacked**.
3. Select this `extension/` directory.
4. Open the extension, enter the deployed app URL, and grant the requested
   host permissions.
5. Sign in with Google or the same email and password used for the web app.

The extension obtains the Supabase URL and publishable key from
`GET /api/extension/config`. The publishable key is public by design; the
extension stores it only as client configuration. Access and refresh tokens
are stored in `chrome.storage.local`, which is available to extension pages
and the service worker; this extension has no content scripts. The password
is not persisted. Storage access is restricted to trusted extension contexts.
Refresh tokens are rotated by Supabase and replaced on refresh. Signing out
clears the local session and asks Supabase to revoke it.

The extension requests optional host permissions only for the configured app
and Supabase origins. The popup guides setup one step at a time and provides
contextual help for host permissions, Google OAuth configuration, and the
save controls. Google sign-in opens a dedicated extension tab so the OAuth
flow stays visible and does not depend on the short-lived popup or service
worker. For Google sign-in, register the exact URL returned by
`chrome.identity.getRedirectURL()` shown in the popup (typically
`https://<extension-id>.chromiumapp.org/`) in Supabase Auth → URL Configuration
→ Redirect URLs. The Google provider must also be enabled in Supabase and its
Google OAuth client must allow the Supabase callback URL shown in the provider
settings. OAuth uses PKCE and exchanges the returned authorization code inside
the extension; the verifier is held only for the duration of sign-in.

Its toolbar popup previews the active page and can save
it with a collection, tags, or a reason. The context menu and `Alt+Shift+S`
command perform a quick save. Bookmark creation, URL normalization,
deduplication, metadata processing, and Inngest scheduling remain on the
existing backend.

Email/password and Google sign-in use the same Supabase Auth account as the
web app. Other social providers and passwordless sign-in are not yet available
in the extension.

## API contract

- `GET /api/extension/config`: returns only the public Supabase URL and
  publishable key.
- `POST /api/bookmarks` with `Authorization: Bearer <access-token>` and
  `{ "url": "https://example.com/" }`: create or detect a duplicate.
- `PATCH /api/bookmarks/:bookmarkId`: optionally set collection, tags, and
  saved reason after creation.

The same bearer-token authentication is accepted by the existing
`GET /api/bookmarks` and `GET`, `PATCH`, and `DELETE /api/bookmarks/:bookmarkId`
endpoints. Every request is validated by Supabase Auth and uses the token-bound
client for RLS.
