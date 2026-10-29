<p align="center"><img src="docs/logo.svg" width="96" alt="Recon logo"></p>

<h1 align="center">Recon</h1>

<p align="center">
  <a href="https://github.com/Arylite/recon/actions/workflows/ci.yml"><img src="https://github.com/Arylite/recon/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/Arylite/recon/releases/latest"><img src="https://img.shields.io/github/v/release/Arylite/recon" alt="Latest release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/Arylite/recon" alt="MIT license"></a>
</p>

Watches the Valorant daily store of several Riot accounts and sends a notification to your phone as
soon as a skin from your wishlist shows up.

<p align="center">
  <img src="docs/screenshot-store.png" width="260" alt="Store screen">
  &nbsp;
  <img src="docs/screenshot-wishlist.png" width="260" alt="Wishlist screen">
</p>
<p align="center"><sub>Screenshots use fake accounts. Skin names, art and tiers come from valorant-api.com.</sub></p>

## How it works

- **Backend and website** (`backend/`, Next.js on Vercel): reads the daily store of every Riot account
  every 15 minutes and records an alert for each wishlisted skin. The website at `recon.isx.re` shows the
  stores, manages the wishlist and the Riot accounts, and can notify you while it is open. The skin
  catalog comes from [valorant-api.com](https://valorant-api.com) and is refreshed daily.
- **Data**: Upstash Redis, added from the Vercel marketplace. One document per user, written under a lock,
  so parallel requests never overwrite each other.
- **Scheduler** (`.github/workflows/check.yml`): GitHub calls `GET /cron/check` every 15 minutes, because
  Vercel's free plan only runs a cron job once a day.
- **Android app** (`android/`, Kotlin + Compose): shows the stores, manages the wishlist and the Riot
  accounts, and polls every 15 minutes in the background to post notifications.
- **Users**: everyone signs up on the website or in the app and only sees their own Riot accounts and
  wishlist. The same account works on both.

## Security

- The password never leaves the client: it is hashed there (PBKDF2, salted with the name) and the server
  hashes that again (PBKDF2, 310 000 rounds, random salt) before storing it.
- The website keeps its session in an `httpOnly`, `Secure`, `SameSite=Strict` `__Host-` cookie, out of
  reach of scripts. Calls with the cookie must come from the same origin and carry a custom header (CSRF).
  The app uses a 90-day ticket-granting ticket (stored hashed, revoked on sign out) traded for a one-hour
  signed service ticket.
- Sign-in and sign-up are rate limited per address and per name; an unknown name answers like a wrong
  password and takes as long.
- Riot cookies are encrypted with AES-256-GCM. They are never returned by the API.
- A strict Content-Security-Policy with a nonce per request (no inline script, images only from
  media.valorant-api.com), HSTS, `X-Frame-Options: DENY`, `no-store` on every API answer, no CORS.
- Unexpected errors answer `server error`; the details go to the logs only.
- `ALLOW_REGISTRATION=false` closes sign-ups once everyone has an account.

## Deploy

1. Vercel: import the repository, set the **Root Directory** to `backend` (the framework is detected).
2. Add the **Upstash for Redis** integration from the Vercel marketplace; it sets `KV_REST_API_URL` and
   `KV_REST_API_TOKEN`.
3. Project environment variables, each from `openssl rand -hex 32`: `API_TOKEN`, `SECRET`, `CRON_SECRET`.
   `API_TOKEN` is the app key baked into the APK (it only keeps scanners out, the user tickets guard the
   data); `SECRET` encrypts Riot cookies and signs tickets, losing it means signing everything in again.
4. Add the domain `recon.isx.re` to the project and point its DNS at Vercel.
5. GitHub repository secrets: `CRON_SECRET` (same value as in Vercel, used by `check.yml`) and `API_TOKEN`
   (same value, used to build the APK).

Every push to `main` deploys by itself.

## Install the app

Open `recon.isx.re` in a browser, or download `Recon-android.apk` from the
[latest release](https://github.com/Arylite/recon/releases/latest), create an account, then **Add a Riot
account**. The server address is built in.

Recon never sees your Riot password. In the app, Riot's login page runs in a web view, and once Riot
confirms the sign-in the app only reads the session cookies and wipes the web view. Tick "Stay signed
in". On the website, copy the session cookies from your browser's developer tools (Setup shows the
steps). Google and Apple logins do not work inside apps: use your Riot ID.

## Develop

```
cd backend && npm ci && npm test && npm run typecheck
API_TOKEN=x SECRET=y npm run dev        # http://localhost:8080, data kept in memory without Redis
cd android && ./gradlew assembleDebug -PapiToken=x -PapiUrl=http://localhost:8080   # + adb reverse tcp:8080 tcp:8080
```

## Releasing

Every push to `main` runs CI, then publishes a GitHub release `v1.0.N` with the signed APK; Vercel deploys
the backend and the website from the same push. Signing uses the secrets `ANDROID_KEYSTORE_BASE64`,
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`.

## Limits

- Only the 4 daily skins are watched, not the night market, bundles or accessories.
- Matching is a case-insensitive substring of the skin name, so "Reaver" watches the whole line.
- Stores are read every 15 minutes, and the app polls every 15 minutes (the WorkManager minimum): alerts are not pushed.
- This uses Riot's unofficial client API. Riot does not endorse it; use it on your own accounts at
  your own risk. The region detection relies on an undocumented endpoint with a fallback.

See [DESIGN.md](DESIGN.md) for the design brief and [SECURITY.md](SECURITY.md) to report a vulnerability.

## Disclaimer

Recon isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games
or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all
associated properties are trademarks or registered trademarks of Riot Games, Inc.
