# Notes for app reviewers

Paste the block below into:
- **Play Console:** App content → App access → Instructions.
- **App Store Connect:** the version → App Review Information → Notes.

Create the account first, on the VM, from the backend repo's `infra/` folder:

```bash
bash scripts/create_review_account.sh
```

It prints the email and password. Put them in the sign-in fields of both forms, and don't use that account yourself in a way that deletes it before review ends.

---

```
Zuri is a study app for university students. Sign in with the account above
(no verification code is needed for it).

The account starts empty, like a new student's. To see the main features:

1. Timetable: finish the short setup after signing in (or tap "Set up your
   timetable" on the Home screen), tap "Paste text instead" and paste:

   CSC 201 Data Structures, Monday, 08:00-10:00, LT1
   CSC 201 Data Structures, Wednesday, 10:00-11:00, LT1
   MTH 202 Linear Algebra, Tuesday, 12:00-14:00, Hall B
   GST 211 Communication Skills, Thursday, 09:00-11:00, Hall C

   Tap "Find my classes", check what it found, then tap "Save classes".
   ("Choose photo or file" works with a photo or screenshot of a timetable too.)

2. Lecture recording: open a class and tap Record. Speak for 30 seconds or so,
   then stop. Zuri transcribes it and makes notes. The microphone is only used
   while recording.

3. Ask: tap Ask and ask a question about the course. Each AI answer has a
   "Report" link for wrong or offensive answers.

4. Materials: upload any PDF to get a summary, a quiz and flashcards.

5. Account deletion: Settings > Account > Delete account (asks for the
   password, then deletes the account and all data on the server).

Notifications are optional and only remind students about their classes and
study sessions. There are no ads, purchases or tracking.

Support: support@zurilearn.com
```
