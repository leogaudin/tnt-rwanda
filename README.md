# TnT (Track-and-Trace)

Open-source system to track the delivery of boxes (textbooks, supplies) to schools, funded by the World Bank.
Licensed AGPL-3.0 with an attribution term: see [LICENSE](LICENSE). The "Powered by TnT" notice in the web app and the mobile scanner must stay.

| Package | What it is |
|---|---|
| `server/` | Express + TypeScript API on MongoDB (Mongoose), deployed on Vercel. |
| `client/` | Web dashboard: Vite, React 18, Chakra UI. |
| `app/` | Android scanner: React Native 0.75. iOS is not built. |
| `tests/` | Vitest suite for all three packages. |
| `scripts/` | Standalone export and database migration tools. |

## One codebase, one config per country

Every deployment runs this repo. What differs per country lives in a folder named after the country, in each package:

```
client/countries/<country>/   config.ts (name, colors, API URL, box fields, labels, languages, school view)
                              public/ (icons, web manifest), locales/ (extra languages, optional)
server/countries/<country>/   config.ts (box fields, report columns, GPS match fields, feature flags)
app/countries/<country>/      config.json (application id, app name, API URL, colors), android/res/ (launcher icons)
```

The country is chosen by the `TNT_COUNTRY` environment variable, else by `countries/default.json` in each package.
`_default` is the development and test configuration: the server refuses it in production
(unless `TNT_ALLOW_DEFAULT_COUNTRY=true`, used only by a demo deployment).
Values that two packages share (box fields, colors, API URL) are written in both, and `tests/countries/consistency.test.ts` fails if they disagree.
All values in these files are public: **secrets never go there.**

### Adding a country

1. Copy the `_default` folder in `client/countries`, `server/countries` and `app/countries` to `<country>`, then edit the copies
   (and replace the icons). The `applicationId` must be unique and must never change once the app is published.
2. Register the server config in `server/countries/index.ts`.
3. `cd tests && npm run test:all` runs the whole suite once for every country.
4. Create the two Vercel projects (below).

### Environment variables

| Variable | Where | Meaning |
|---|---|---|
| `TNT_COUNTRY` | server, client build, app build | Country folder to use. |
| `STRING_URI` | server | MongoDB connection string. Each country has its own database. |
| `VITE_API_URL` | client build, optional | Overrides the API URL of the config. |

### Deploying a country (Vercel)

Two projects per country, both connected to this repo with production branch `main`:
- API: Root Directory `server`, env `TNT_COUNTRY` and `STRING_URI`.
- Client: Root Directory `client`, env `TNT_COUNTRY`.

The API domain (`https://tnt-<country>-api.vercel.app`) is compiled into the installed phones: never change it.
A push to `main` redeploys every project, and CI (`.github/workflows/ci.yml`) runs the suite once per country first.

## Development

```
cd server && npm ci && npm run dev        # API on http://localhost:3000 (needs STRING_URI)
cd client && npm ci && npm run dev        # dashboard; TNT_COUNTRY=<country> npm run dev for another country
cd tests  && npm ci && npm test           # suite for the default country
cd tests  && npm run test:all             # suite once for every country
```

## Mobile app (Android)

```
./assemble release <country>            # APK in dist/mobile/<country>-<version>-release.apk
./assemble debug <country>
./assemble release <country> --aab      # Play Store bundle
```

One version for every country: `app/package.json` `version`, with `versionCode = major*10000 + minor*100 + patch`.
The Play Store rejects a lower `versionCode` than the one published, so only ever raise the version.
Release builds use the debug keystore unless `app/countries/<country>/signing.properties` exists
(`storeFile`, `storePassword`, `keyAlias`, `keyPassword`; never commit it).

## Standalone copy of one country

For a government hand-over or an on-premise install:

```
node scripts/export-standalone.mjs <country> <outDir> [--git]
```

The result contains only that country, builds and runs with no `TNT_COUNTRY`, and has its own README and CI.

## Database migration tools

`scripts/migration/` moves a legacy (JavaScript-era) country database to the current schema: `audit.mjs` (read-only),
`indexes.mjs`, `backfill-embedded-scans.mjs`, `recompute.ts`, `verify.ts`, `restore-derived-fields.mjs` and `drop-staging.mjs`.
They read `STRING_URI` from the environment. Anything that writes needs `--confirm` and either `--db <tnt_staging_*>`
(rehearsal on a restored copy) or `--production`; check the `Database:` line they print first.
