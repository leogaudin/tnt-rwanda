# Rwanda: what differs from central

Compared `tnt-rwanda` `origin/main` (2649b0b) with its merge-base with central `optimized` (e80a574),
ignoring images and lock files. Rwanda is an on-premise install at `https://booktracking.reb.rw:8000`.

## (a) Country config, already captured by Phase 2

| Rwanda change | Where it lives now |
|---|---|
| name `Rwanda Textbooks Distribution Tracking System 🇷🇼`, colours, API URL | `client/countries/rwanda/config.ts`, `app/countries/rwanda/config.json` |
| `boxFields`: project, district, sector, cell, village (all required), school, schoolCode (required), htName, htPhone | client and server `config.ts` |
| `reportFields`: project, district, sector, cell, village, school, schoolCode | `server/countries/rwanda/config.ts` |
| `enableProjectEmails = true` | client `features.projectEmails: true` |
| labels for `sector`, `cell`, `village`; `uploadPrompt` wording | client `labels` |
| application id `com.tntrwanda.scanner`, `versionCode 10001` (1.0.1) | `app/countries/rwanda/config.json`; the shared version is above it |
| `reb.webp` next to the favicons | `client/countries/rwanda/public/reb.webp` (copied; used by the Login page, see below) |

## (b) Needs central code behind a config key or feature flag (Phase 9)

1. **Login page with the REB logo** (`client/src/pages/Login/index.tsx`): shows `/reb.webp` next to the TnT logo, in a
   column-reverse layout, and the title is `login` instead of `welcomeBack login`.
   Plan: optional client config `loginLogos: string[]`. With none configured the page must stay exactly as today.
   The `welcomeBack` wording change is a user-visible detail: ask the user whether to keep it for Rwanda.
2. **Daily report** (`crons/daily_report/*`): a Python script that emails a daily delivery report.
   Plan: `features.dailyReport` in the server config, and the script moves to `extras/daily-report/` with its settings in env vars.
3. **`POST /insights/emails` writes the admin id into `/crons/daily_report/emails.txt`** so the cron knows whom to report on.
   This is the commented "ONLY UNCOMMENT THIS IF SERVER IS SETUP ACCORDINGLY" block, active in Rwanda.
   Plan: do it only when `features.dailyReport` is true, with the folder taken from an env var (`DAILY_REPORT_DIR`,
   default `/crons/daily_report/`). The route's response must stay `200 { message: 'Emails updated successfully' }`.

## (c) On-premise infrastructure: stays in Rwanda's standalone repo (or becomes env vars)

- `server/index.ts`: port `8000` instead of `3000`, and HTTPS with Let's Encrypt certificates in
  `/etc/letsencrypt/live/booktracking.reb.rw/`.
  Better as env vars in central (`PORT`, `HTTPS_CERT_PATH`, `HTTPS_KEY_PATH`; unchanged behaviour when unset). Needs the user's go.
- `server/pm2.config.cjs`: runs `index.ts` through `tsx` instead of `index.js`.
- `crons/auto_updates/entrypoint.sh`: auto-update cron.
- `.gitignore` entry and the iOS display name in `Info.plist` (iOS is out of scope).
- Android: `MainActivity.kt` / `MainApplication.kt` package line and `build.gradle`. The package/namespace stays
  `com.tnt.scanner` in central; only the `applicationId` is per country, so nothing to carry over.

## Other differences found

- Rwanda's `tests/client/service/csv.test.ts` is edited for its fields; the central tests now take their fields from the config.
