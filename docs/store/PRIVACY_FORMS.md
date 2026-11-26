# Privacy forms: what to answer

These answers match what the app and server actually do (checked against the code on 26 Nov 2026) and the privacy policy at https://zurilearn.com/app-privacy. If you add a feature that collects something new, update this file, the policy and both forms.

## Google Play: App content

### Data safety
**Does your app collect or share any of the required user data types?** Yes.
**Is all of the user data collected by your app encrypted in transit?** Yes.
**Do you provide a way for users to request that their data is deleted?** Yes. Delete-account URL: https://zurilearn.com/delete-account

**Data shared:** none. (Sending data to services that process it for us, like hosting, AI and crash reporting, is not "sharing" under Google's definition.)

**Data collected.** Mark each one "Collected", "Not shared" and "Required" (users can't turn it off), unless the line says otherwise:

| Category → type | Purposes | Notes |
|---|---|---|
| Personal info → Name | App functionality, Account management | |
| Personal info → Email address | App functionality, Account management | |
| Personal info → User IDs | App functionality, Account management | |
| Audio → Voice or sound recordings | App functionality | **Optional.** Only when the user taps record. |
| Photos and videos → Photos | App functionality | **Optional.** Timetable photos. Mark "processed ephemerally": they're read and not kept. |
| Files and docs → Files and docs | App functionality | **Optional.** Uploaded slides, notes and past questions. |
| App activity → Other user-generated content | App functionality, Personalisation | Questions and AI chats, notes, reports. |
| App activity → App interactions | App functionality, Personalisation | Quiz results, progress and streaks for the study plan. |
| App info and performance → Crash logs | App functionality (analytics: no) | Sentry, with no personal info sent. |
| App info and performance → Diagnostics | App functionality | App version, errors. |
| Device or other IDs | App functionality | Push notification token. **Optional** (only if the user allows notifications). |

Not collected: location, contacts, calendar, SMS, call logs, financial info, health, web history, advertising ID.

### Other App content items
- **Privacy policy:** https://zurilearn.com/app-privacy
- **Ads:** No, the app does not contain ads.
- **App access:** All or some functionality is restricted. Add the reviewer email and password from `infra/scripts/create_review_account.sh` (backend repo), and paste the instructions from `REVIEWER_NOTES.md`.
- **Content rating (IARC questionnaire):** Category: Education / Reference. Violence, sexual content, language, drugs, gambling: all **No**. User interaction: users don't communicate with each other in the app → **No**. Shares location: **No**. Digital purchases: **No**. Expect a rating of Everyone / PEGI 3.
- **Target audience:** **18 and over**. University students. Choosing under-18 brings in the Families policy, which you don't need.
- **News app:** No.
- **Government app:** No.
- **Financial features:** none.
- **Health:** No.
- **AI-generated content:** Yes. Users can report offensive or wrong output in the app (the Report link under answers, sent to `POST /academic/ai-reports`).

## Apple: App Store Connect → App Privacy

**Do you or your third-party partners collect data from this app?** Yes.

For every type below: **Used to track you: No.** (Zuri doesn't track people across other companies' apps or sites, so you don't need the App Tracking Transparency prompt.)

| Data type | Purposes | Linked to the user? |
|---|---|---|
| Contact Info → Name | App Functionality | Yes |
| Contact Info → Email Address | App Functionality | Yes |
| User Content → Audio Data | App Functionality | Yes |
| User Content → Photos or Videos | App Functionality | Yes |
| User Content → Other User Content | App Functionality | Yes (chats, notes, uploads, reports) |
| Identifiers → User ID | App Functionality | Yes |
| Identifiers → Device ID | App Functionality | Yes (push token) |
| Usage Data → Product Interaction | App Functionality | Yes (progress, quiz results) |
| Diagnostics → Crash Data | App Functionality | **No** (Sentry runs with `sendDefaultPii: false`) |
| Diagnostics → Other Diagnostic Data | App Functionality | No |

Not collected: location, health, financial info, contacts, browsing or search history, purchases, sensitive info.

### Other Apple answers
- **Privacy Policy URL:** https://zurilearn.com/app-privacy
- **Support URL:** https://zurilearn.com/support
- **Export compliance:** already answered in `app.json` (`ITSAppUsesNonExemptEncryption: false`). The app uses only standard HTTPS.
- **Age rating questionnaire:** everything **None** / **No**. Unrestricted web access: No. User-generated content shared with others: No. Expect 4+. Apple may suggest 12+ because of the AI chat; accept whatever it calculates.
- **Sign in with Apple:** not required, because the app uses only its own email-and-password accounts (no Google or Facebook sign-in).
- **Account deletion (Guideline 5.1.1(v)):** Settings → Account → Delete account.
