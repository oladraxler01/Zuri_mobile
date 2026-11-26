# Builds, updates and crash reporting

Roadmap Phase 0. How the app is built, shipped and monitored.

## Build profiles (`eas.json`)

| Profile | What it is | Channel | Diagnostics page |
|---|---|---|---|
| `development` | Dev client (`expo-dev-client`): runs your local Metro bundle, has native modules (background audio, etc.) that Expo Go lacks | `development` | yes |
| `preview` | Internal testers. Points at the live gateway until a staging gateway exists | `preview` | yes |
| `production` | Store builds, build number auto-incremented | `production` | no |

```bash
npx eas build --profile development --platform android
npx eas build --profile preview --platform all
```

## Over-the-air updates (`expo-updates`)

Publish JavaScript changes to the APKs testers already have:

```bash
npm run update:preview -- "Timetable import from photos"
npm run update:production -- "Fix sign-in"
```

Use these scripts, not plain `eas update`. `eas update` bundles on your computer, so `EXPO_PUBLIC_*` values would come from your local `.env` (APP_ENV=development, no diagnostics) instead of the build profile. `scripts/publish-update.mjs` copies the `env` of the `eas.json` profile that uses the channel.

**Who receives an update**
- Only builds on the same channel (preview APKs listen on `preview`).
- Only builds with the same runtime version. `runtimeVersion` follows `app.json` `"version"` (`"policy": "appVersion"`), now `1.1.0`. APKs built as `1.0.0` never receive `1.1.0` updates: those testers need the new APK once.

**How it reaches the phone** (`src/services/app-updates.ts`, `src/components/update-banner.tsx`)
- The app checks when it opens and each time it comes back to the front (at most every 5 minutes).
- Once downloaded, a banner offers "Restart now". If the student ignores it, the app switches to the update the next time it comes back from the background.
- It never restarts while a lecture is being recorded or waiting to be saved (`src/services/recording/busy.ts`).
- You screen: "Check for updates" pulls one by hand; the build line shows `update ab12cd34` when an update is running.

**When you need a new build instead** (JS updates can't carry these)
- Adding or upgrading a package with native code (e.g. `expo-image-picker`), or changing `app.json` plugins, permissions, icon, splash or package name.
- Then bump `app.json` `"version"` (e.g. `1.2.0`), build (`npx eas build --profile preview --platform android`) and send testers the new APK. Updates published after that target the new version.

## CI/CD pipeline (GitHub Actions)

| Workflow | When | What |
|---|---|---|
| `ci.yml` | Every pull request and push to `main` | Design tokens, typecheck, lint, tests, web export |
| `eas-update.yml` | After CI passes on a push to `main`; or by hand (Actions → Publish app update) | Publishes the JS to `preview` (by hand: `preview` or `production`). Installed APKs on that channel and version pick it up |
| `eas-build.yml` | By hand only (Actions → Build app) | Starts an EAS build (APK for testers, or store build). Needed only for native changes |

Both Expo workflows need the repository secret **`EXPO_TOKEN`**, made in the Expo account that owns the project (`app.json` → `extra.eas.projectId`, slug `LexiMobile`): expo.dev → Account settings → Access tokens (a robot token on an organisation is best). Without it, the automatic update is skipped with a warning.

Installed APKs only ever listen to the project, channel and runtime version they were built with. Publishing from a different Expo account or project never reaches them.

## Crash reporting (Sentry)

- Off unless `EXPO_PUBLIC_SENTRY_DSN` is set, so local runs and CI never report.
- No personal data: no user, no request bodies/headers/cookies, no console breadcrumbs, and URLs lose their query strings (`src/services/monitoring.ts`).
- Screen crashes caught by the root error boundary are reported too.

**To turn it on** (needs a Sentry org and project):

1. Create a React Native project in Sentry and copy its DSN.
2. Add the DSN to each EAS profile: `npx eas env:create --name EXPO_PUBLIC_SENTRY_DSN --value <dsn> --environment preview` (and `production`).
3. For readable stack traces, add `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` (secret) as EAS env vars, and remove `SENTRY_DISABLE_AUTO_UPLOAD` from `eas.json`.
4. Build a preview, open `/dev/design-system`, and tap **Send test error**. It should show up in Sentry as "Zuri test error (preview)". That's the roadmap's Phase 0 check.

## Diagnostics page

`/dev/design-system` shows the component gallery and the crash-reporting check. It's available in dev and in builds with `EXPO_PUBLIC_DIAGNOSTICS=1` (development and preview profiles), and redirects home in production.
