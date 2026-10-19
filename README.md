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

- **B## How it works

- **Backend** (`backend/`, TypeScript, Hono, Docker): reads the daily store of every Riot account
  every 15 minutes and records an alert for each wishlisted skin. The skin catalog comes from
  [valorant-api.com](https://valorant-api.com) and is refreshed daily.
- **Cloudflare tunnel** (`docker-compose.yml`): the phone reaches the backend at `recon.isx.re` over
  HTTPS, no port is opened on your network.
- **Android app** (`android/`, Kotlin + Compose): shows the stores, manages the wishlist and the Riot
  accounts, and polls every 15 minutes in the background to post notifications.
- **Users**: everyone signs up in the app and only sees their own Riot accounts and wishlist.
  Signing in returns a ticket-granting ticket (90 days, stored hashed, revoked on sign out), traded
  for a one-hour signed service ticket used on every call.

## Deploy the backend

1. Cloudflare Zero Trust > Networks > Tunnels: create a tunnel, copy its token, and add the public
   hostname `recon.isx.re` pointing to `http://backend:8080`.
2. `cp .env.example .env` and fill `API_TOKEN`, `SECRET` (`openssl rand -hex 32` for each) and
   `TUNNEL_TOKEN`. `API_TOKEN` is the app key baked into the APK (it only keeps scanners out, the
   user tickets guard the data); `SECRET` encrypts Riot cookies and signs tickets, losing it means
   signing everything in again. Put the same `API_TOKEN` in the GitHub secrets for the APK build.
3. `docker compose up -d`. After a release: `docker compose pull && docker compose up -d`.

## Install the app

Download `Recon-android.apk` from the [latest release](https://github.com/Arylite/recon/releases/latest),
create an account, then **Add a Riot account**. The server address is built in.

The app never sees your Riot password: Riot's login page runs in a web view, and once Riot confirms
the sign-in the app only reads the session cookies and wipes the web view. Tick "Stay signed in".
Google and Apple logins do not work inside apps: use your Riot ID.

## Develop

```
cd backend && npm ci && npm test        # run: API_TOKEN=x SECRET=y npm run dev
cd android && ./gradlew assembleDebug -PapiToken=x -PapiUrl=http://localhost:8080   # + adb reverse tcp:8080 tcp:8080
```

## Releasing

Every push to `main` runs CI, then publishes the image `ghcr.io/arylite/recon`
(`latest` and `1.0.N`) and a GitHub release `v1.0.N` with the signed APK. Signing uses the secrets
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`.

## Limits

- Only the 4 daily skins are watched, not the night market, bundles or accessories.
- Matching is a case-insensitive substring of the skin name, so "Reaver" watches the whole line.
- Notifications are polled every 15 minutes (the WorkManager minimum), not pushed.
- This uses Riot's unofficial client API. Riot does not endorse it; use it on your own accounts at
  your own risk. The region detection relies on an undocumented endpoint with a fallback.

See [DESIGN.md](DESIGN.md) for the design brief and [SECURITY.md](SECURITY.md) to report a vulnerability.

## Disclaimer

Recon isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games
or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all
associated properties are trademarks or registered trademarks of Riot Games, Inc.
