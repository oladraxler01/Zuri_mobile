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

Pushes to `main` publish to `preview` by themselves (see CI/CD pipeline below); these commands are for publishing by hand. Use them, not plain `eas update`. `eas update` bundles on your computer, so `EXPO_PUBLIC_*` values would come from your local `.env` (APP_ENV=development, no diagnostics) instead of the build profile. `scripts/publish-update.mjs` copies the `env` of the `eas.json` profile that uses the channel.

**Who receives an update**
- Only builds on the same channel (preview APKs listen on `preview`).
- Only builds with the same runtime version. `runtimeVersion` follows `app.json` `"version"` (`"policy": "appVersion"`), now `1.2.0`. APKs built as `1.1.0` never receive `1.2.0` updates: those testers need the new APK once.

**How it reaches the phone** (`src/services/app-updates.ts`, `src/components/update-banner.tsx`)
- The app checks when it opens and each time it comes back to the front (at most every 5 minutes).
- Once downloaded, a banner offers "Restart now". If the student ignores it, the app switches to the update the next time it comes back from the background.
- It never restarts while a lecture is being recorded or waiting to be saved (`src/services/recording/busy.ts`).
- You screen: "Check for updates" pulls one by hand; the build line shows `update ab12cd34` when an update is running.

**Rule: when you add a package with native code, bump `app.json` `"version"` in the same PR.** The runtime version then changes, so the update can't reach older APKs that lack the native code (an older APK running JavaScript that calls a missing native module can crash). 1.2.0 was bumped for Google / Apple sign-in after exactly that slipped through.

**When you need a new build instead** (JS updates can't carry these)
- Adding or upgrading a package with native code (e.g. `expo-image-picker`), or changing `app.json` plugins, permissions, icon, splash or package name.
- Then bump `app.json` `"version"` (e.g. `1.2.0`), build (`npx eas build --profile preview --platform android`) and send testers the new APK. Updates published after that target the new version.

## CI/CD pipeline

| Where | When | What |
|---|---|---|
| GitHub Actions `.github/workflows/ci.yml` | Every pull request and push to `main` | Design tokens, typecheck, lint, tests, web export: the check before merging |
| EAS Workflows `.eas/workflows/deploy.yml` | Every push to `main` | **Test** (typecheck, lint, tests) → over-the-air **update to `preview`**: testers get each merge |
| EAS Workflows `.eas/workflows/release.yml` | When you release: push a tag (`git tag v1.1.1 && git push origin v1.1.1`) or run it on expo.dev | **Test** → **update to `production`** with everything merged since the last release, optionally to a share of users first (`rollout`) |
| EAS Workflows `.eas/workflows/build-preview-apk.yml` | By hand only (expo.dev → Workflows, or `npx eas-cli workflow:run .eas/workflows/build-preview-apk.yml`) | A new test APK. Needed only for native changes or a version bump |

**Nothing here rebuilds the app on pull requests or merges.** Pull requests only run GitHub CI (checks, no app). Merges send an update, which is a few MB of JavaScript that installed apps download; the APK stays the same. A new build is only made when you start one, for a native change.

EAS Workflows run on Expo's servers. For pushes to start them, the GitHub repo must be connected to the Expo project: expo.dev → the project → **Settings → GitHub** → install the Expo GitHub app → pick `Zuri_mobile`. No GitHub secret is needed.

The `EXPO_PUBLIC_*` values for each update are set in `deploy.yml` and match the `eas.json` build profile, so updates behave like the builds they land on. Add `[eas skip]` to a commit message to skip a run.

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
