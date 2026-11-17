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

- `runtimeVersion` follows the app version (`"policy": "appVersion"`): a JS-only fix ships as an update; anything that changes native code needs a new version and a new build.
- Each profile listens on its own channel, so an update reaches only that kind of build:

```bash
npx eas update --channel preview --message "Fix timetable import"
```

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
