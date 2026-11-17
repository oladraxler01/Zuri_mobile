# Phase 0 plan: foundations

Date: 2026-11-17 · Status: in progress · Reads with: `docs/MOBILE_ROADMAP.md` §3 Phase 0, the `zuri-design-system` skill

Phase 0 doesn't depend on the backend. It's worth +7% (31% → ~38%). This file breaks it into PRs, in the order they'll land, and lists what each one is waiting on.

## Done when (from the roadmap)

- CI is green on `main`.
- Sentry receives a test crash from a preview build.
- Onboarding and Home use only tokens and render correctly in both themes.
- The Maestro sign-up flow passes against the live API.

## PRs

| # | PR | Branch | Base | Needs | Status |
|---|----|--------|------|-------|--------|
| 1 | Theme module: `src/theme/`, tokens, `useTheme`, `<Text>`, 7 components | `feat/theme-tokens` | `main` | nothing | open (#7) |
| 2 | This plan | `docs/phase-0-plan` | `main` | nothing | open |
| 3 | Tests, lint and CI | `chore/tests-ci` | `main` | nothing | next |
| 4 | Navigation clean-up | `chore/nav-cleanup` | `main` | backend answer on admin roles (alignment report Q10) for the final routing | next |
| 5 | Onboarding on tokens | `feat/tokens-onboarding` | PR 1 | PR 1 merged | next |
| 6 | Home on tokens | `feat/tokens-home` | PR 5 | PR 1 merged | next |
| 7 | Dev client, EAS channels, OTA updates, Sentry | `chore/builds-monitoring` | `main` | a Sentry project and DSN (EAS secret); a native build to verify | scaffold now |
| 8 | Maestro sign-up → verify → onboarding → Home | `chore/maestro` | PR 7 | a dev build and the test student account (EAS secret) | after 7 |
| 9 | Spike: chunked background recording (Phase 4) | `spike/chunked-recording` | `main` | a dev build, a low-end Android phone | after 7 |
| 10 | Spike: streaming on Hermes (Phase 3) | `spike/hermes-streaming` | `main` | a backend streaming format (alignment report Q5) or a mock | after 7 |

### 3. Tests, lint and CI

- Jest with `jest-expo` and React Native Testing Library.
- First unit tests: `utils/planner.ts`, `utils/mastery.ts`, `utils/timetable-import.ts` (the academic-context sync merge follows once it's extracted into a pure function).
- ESLint with `eslint-config-expo` (flat config). Hex literals stay warnings until an area is migrated; each migration PR turns its area into an error.
- GitHub Actions on every PR and on `main`: `npm ci`, typecheck, lint, `tokens:check`, unit tests, `expo export --platform web`.

### 4. Navigation clean-up

- Remove `onboarding/admin-sign-in.tsx`. School Board in role select and the welcome link go to the normal sign-in; the server role routes the account.
- Label the deferred apps' sample-data screens (lecturer, school admin, research) as "Preview". They stay: they're deferred, not scrapped.

### 5–6. Onboarding and Home on tokens

- Swap `UI` / `ZuriColors` / literals for `useTheme()` and `<Text variant>`, following the migration map in the skill. Reuse `Button`, `TextField`, `Chip`, `Card`, `ListRow` and `StateView`.
- Check each screen in light and dark with `DARK_MODE_ENABLED` forced on locally (it stays off in the PR).
- Once an area is clean, the lint rule forbids hex literals there.

### 7. Builds and monitoring

- `expo-dev-client`; EAS profiles `development` / `preview` / `production` with matching `channel`s.
- `expo-updates` with `runtimeVersion: { policy: "appVersion" }`.
- `@sentry/react-native` with the Expo plugin. Initialised only when `EXPO_PUBLIC_SENTRY_DSN` is set, with `sendDefaultPii: false` and a `beforeSend` that strips user fields.
- Product analytics waits on the decision below.

## Decisions needed (roadmap §8)

1. Analytics tool: PostHog, or the backend's own event pipeline?
2. Staging gateway for preview builds?
3. Admin and lecturer role issuance (alignment report Q10): needed to finish PR 4's routing.
4. Sentry: which org/project, and who holds the DSN?

## Out of Phase 0

`TabBar` moves onto tokens with the screen migration. `NextClassCard`, `ReadinessRing`, `AnswerBubble` and `RecordingBar` are built in the phases that use them (2–6).
