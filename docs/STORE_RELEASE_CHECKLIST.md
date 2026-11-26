# Zuri store release checklist (Google Play + App Store)

Tick each box as it's done. Items marked **BLOCKER** will get the app rejected if skipped.

Facts used below:
- **Android package:** `com.zurilearn.app`
- **iOS bundle ID today:** `com.oladraxler.leximobile`
- **Build setup:** Expo SDK 58 with EAS. The `production` profile builds an `.aab`. Export compliance is already set (`ITSAppUsesNonExemptEncryption: false`).
- **API:** `https://api.zurilearn.com`

---

## 0. Blockers to fix first

- [ ] **BLOCKER: real account deletion.** Both stores require that a user can delete their account and data, both inside the app and from a web link. Today "Delete account" in Settings only clears the phone; the server keeps everything.
  - [ ] Backend: a delete-account endpoint that removes the user's data in every service (Phase 7 "export and delete").
  - [ ] App: "Delete account" calls it after a confirmation.
  - [ ] Web: a public page explaining how to delete your account (Google asks for this URL).
- [ ] **BLOCKER: privacy policy and support pages** live at public HTTPS links, e.g. `https://zurilearn.com/privacy` and `https://zurilearn.com/support`.
  - The policy must say what's collected, why, who processes it, and how to delete it.
  - Data: name, email, school and course info, lecture recordings, timetable photos, uploaded study files, questions to the AI, crash reports, push tokens.
  - Processors: AI (OpenRouter / Google Gemini), push (Firebase / Apple), crash reports (Sentry), hosting (Google Cloud, Cloudflare).
- [ ] **Decide the iOS bundle ID before registering it with Apple.** It can never change afterwards. Recommended: `com.zurilearn.app`, the same as Android. Update `app.json` → `ios.bundleIdentifier`.
- [ ] Optional clean-up while renaming: `scheme` (`leximobile`) and `slug` (`LexiMobile`). The slug is tied to the EAS project, so check with whoever owns EAS before changing it.

## 1. Shared prep (both stores)

- [ ] Package name / bundle ID locked (see section 0)
- [ ] Privacy policy URL and support URL live (see section 0)
- [ ] **Reviewer demo account:**
  - [ ] Email already verified, so the reviewer never needs a code.
  - [ ] Its default institution is the test school `inst_zuri_test`: run `infra/ops/mark_test_accounts.sh` on the server.
  - [ ] It has real-looking content: courses, a timetable, one uploaded note.
  - [ ] Save the login in your password manager; it goes into both store forms.
- [ ] **Store graphics:**
  - [ ] App icon: Google 512×512 PNG; Apple 1024×1024 PNG with **no transparency**.
  - [ ] Google feature graphic, 1024×500.
  - [ ] Phone screenshots, at least 2 for Google. Apple needs 6.9" iPhone screenshots (1320×2868, or 1290×2796), and iPad ones only if iPad is supported.
- [ ] **Permission texts the user sees** (Apple rejects vague ones). Set them in `app.json` → `ios.infoPlist`:
  - [ ] Microphone: "Zuri records your lectures so it can transcribe them and make notes for you."
  - [ ] Speech recognition: "Zuri turns what you say into text so you can ask questions by voice."
  - [ ] Photos / camera (timetable photo import): "Zuri reads a photo of your timetable to add your classes."
  - [ ] If recording continues with the screen off: background audio mode, plus a visible recording indicator in the app.
- [ ] Push notifications set up: `docs/deployment/PUSH_NOTIFICATIONS_SETUP.md` in the backend repo (Firebase + APNs key).

## 2. Google Play: setup and compliance

- [ ] **Create app** in Play Console:
  - [ ] Name: `Zuri`
  - [ ] Package: `com.zurilearn.app`
  - [ ] Type: App
  - [ ] Price: Free
  - [ ] Default language: English (United Kingdom) or English (US)
  - [ ] Accept the 3 declarations
- [ ] **App content:**
  - [ ] Privacy policy URL
  - [ ] App access → "All or some functionality is restricted" → the demo login and how to use it
  - [ ] Ads → No (unless ads are added)
  - [ ] Target audience → 16–17 and 18+. University students; not for children, so the Families rules don't apply.
  - [ ] Content rating (IARC questionnaire) → education app, no violence or gambling; user-to-AI chat = yes
  - [ ] **Data safety form**, matching the privacy policy:
    - [ ] Collected: personal info (name, email), audio (recordings), photos (timetable), files (study material), app activity, crash logs, device IDs (push token)
    - [ ] Encrypted in transit: yes
    - [ ] Users can request deletion: yes (needs the blocker fixed)
  - [ ] Account deletion URL (from section 0)
  - [ ] **AI-generated content:** the app must let users report an offensive or wrong AI answer from inside the app (a "Report" option on answers)
- [ ] **Main store listing:**
  - [ ] Short description, max 80 characters
  - [ ] Full description, max 4,000 characters
  - [ ] Icon, feature graphic and screenshots
- [ ] **Countries:** Nigeria first. Adding EU/UK countries means filling in Digital Services Act trader details, so leave them out for now.

## 3. Google Play: build, testing and launch

- [ ] **Release build:** `eas build --platform android --profile production`. This produces an `.aab` and must target Android 16 / API 36 or newer.
  - Check with: `npx expo config --type public | findstr targetSdkVersion` (Windows).
- [ ] **Signing key:** let EAS manage the upload key, or keep a backup of your own keystore offline (losing it is painful).
- [ ] **Closed testing:**
  - [ ] Testing → Closed testing → upload the `.aab` → add testers' Gmail addresses (recruit 16–20; Google needs at least 12 opted in)
  - [ ] Run **14 days** with at least 12 testers actually opening the app; ship at least one small update during the window
  - Personal developer accounts must do this. **Organisation accounts (with a D-U-N-S number) are exempt**, so check which type your account is.
- [ ] **Production access:** answer the 3-part questionnaire (how you tested, the app's value, readiness), then create a Production release with the `.aab` and submit it.
- [ ] Optional: `eas submit --platform android` with a Google service-account key, to upload builds from the terminal.

## 4. Apple App Store: account and setup

- [ ] Apple ID with two-factor authentication on
- [ ] A way to build for iOS: EAS Build in the cloud is enough, no Mac needed
- [ ] **Apple Developer Program, $99/year** (paid; approval takes 24–48 h)
  - Organisation enrolment needs a free D-U-N-S number for the company
- [ ] App Store Connect → Business: accept the Free Apps agreement. Tax and banking are only needed for paid apps or in-app purchases. Add Digital Services Act trader status only if distributing in the EU.
- [ ] **Register the App ID** (Certificates, Identifiers & Profiles → Identifiers):
  - [ ] the bundle ID from section 0
  - [ ] capability **Push Notifications**
  - [ ] Sign in with Apple is **not** needed: the app has no Google/Facebook login
- [ ] **Create the app record** (My Apps → + → New App):
  - [ ] name `Zuri`
  - [ ] the bundle ID
  - [ ] primary language
  - [ ] SKU, e.g. `zuri-ios-001`

## 5. Apple App Store: build, details and launch

- [ ] **Build:** `eas build --platform ios --profile production`. EAS signs it automatically after you log in with your Apple account; it builds with the current Xcode / iOS SDK.
- [ ] **Upload:** `eas submit --platform ios` (or Transporter on a Mac). Export compliance is already answered in `app.json`.
- [ ] **TestFlight:** install on a real iPhone and test sign-up, onboarding, timetable import, recording, push notifications and account deletion.
- [ ] **App Store details:**
  - [ ] Screenshots (6.9")
  - [ ] Description and keywords
  - [ ] Support URL and privacy policy URL
  - [ ] **App Privacy "nutrition label"**, matching the Google data-safety answers
  - [ ] Age rating questionnaire
- [ ] **Pricing and availability:** Free; countries (Nigeria first)
- [ ] **App Review information:**
  - [ ] the demo login
  - [ ] contact name, phone and email
  - [ ] a short note: "Zuri is a study app for university students. Use the demo account; it is already set up with courses and a timetable. Lecture recording needs microphone permission."
- [ ] Choose the build → **Submit for Review**

## 6. After approval

- [ ] Smoke-test the store version on one Android and one iPhone
- [ ] Turn on push notifications in production (Firebase key on the server; see the backend push guide)
- [ ] Watch crash reports (Sentry) and the server dashboards (Grafana) for the first week
