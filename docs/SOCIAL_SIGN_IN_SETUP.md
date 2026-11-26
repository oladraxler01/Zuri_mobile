# Setting up Continue with Google / Apple

The app talks to Google and Apple directly. There's no Clerk or other auth service. The server side is in the backend repo (`docs/api/SOCIAL_SIGN_IN.md`). This page is what you click in each console. Expect about 30–45 minutes.

Until these are done, the buttons simply don't show (Google), or the server answers "not available yet". Email sign-in keeps working.

## 1. Google (Google Cloud Console)

Use the Google Cloud project that has Firebase, or any project you own.

1. **APIs & Services → OAuth consent screen**
   - User type **External**, app name **Zuri**, support email `support@zurilearn.com`.
   - App domain `zurilearn.com`, privacy policy `https://zurilearn.com/app-privacy`.
   - Scopes: `email`, `profile`, `openid`. These don't need Google verification.
   - **Publish the app** (move it from Testing to In production), or only test users can sign in.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID.** Make three:
   - **Web application**, named "Zuri web". You don't need redirect URIs. Its client ID is the **web client ID**.
   - **iOS**, bundle ID `com.zurilearn.app`. This is the **iOS client ID**.
   - **Android**, package `com.zurilearn.app`, with **SHA-1** fingerprints:
     - For EAS builds, run `eas credentials -p android` and copy the SHA-1 of the upload keystore.
     - After the first Play upload, add the **app signing key** SHA-1 from Play Console → Test and release → App integrity. Play re-signs the app, so you need both; make one Android client per SHA-1.
3. **Put the IDs in the app build** (EAS → your project → Environment variables, for preview and production):
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` = the web client ID
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` = the iOS client ID
4. **Put the IDs on the server**: in `infra/.env` on the VM, add `GOOGLE_CLIENT_IDS=<web id>,<ios id>,<android id>`, then restart the user service.

## 2. Apple (developer.apple.com)

1. **Certificates, Identifiers & Profiles → Identifiers → `com.zurilearn.app`**
   - Create it if it doesn't exist; `eas build` can also create it.
   - Tick **Sign in with Apple** and save.
2. **Keys → +**
   - Name it "Zuri Sign in with Apple", tick **Sign in with Apple**, configure it with the primary App ID `com.zurilearn.app`, and register.
   - **Download the `.p8` file.** Apple lets you download it only once.
   - Note the **Key ID**, and your **Team ID** (top right, or Membership).
3. **On the VM**, in `infra/.env`:
   ```
   APPLE_CLIENT_IDS=com.zurilearn.app
   APPLE_TEAM_ID=XXXXXXXXXX
   APPLE_KEY_ID=XXXXXXXXXX
   APPLE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\nMIGT...\n-----END PRIVATE KEY-----'
   ```
   - To get the key onto one line: `awk 'NF {printf "%s\\n", $0}' AuthKey_XXXX.p8`.
   - Then restart the user service.
   - Apple sign-in works without the key. The key is what lets the server revoke the Apple sign-in when a student deletes their account, which App Store review checks.

## 3. Build

Both need native code, so make a new build; an over-the-air update won't add them:

```
eas build -p ios --profile production
eas build -p android --profile production
```

The Apple button appears on iPhone only. The Google button appears once the client IDs are in the build.

## 4. Test before submitting

- **Android:** Continue with Google with a new Google account. It should go to setup, with no email code.
- **iPhone:** Continue with Apple, choosing "Hide my email". Sign out, then sign in again: same account.
- **Linking:** sign in with Google using the email of an existing email-and-password account. It should open the same account, with the same courses.
- **Deletion:** Settings → Account → Delete account on a Google-only account. It should ask you to confirm with Google, then delete. Check the server log for "account deletion requested".
