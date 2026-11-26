# Getting 12+ Android testers (personal Play account rule)

A personal Play Console account must run a **closed test with at least 12 testers opted in for 14 days in a row** before it can apply for production. Aim for 16 to 20 so a few dropping out doesn't reset the clock.

## Set-up (Play Console)
1. Testing → Closed testing → Create track.
2. Testers → Create email list. Add testers' Gmail addresses (the ones their phones use for the Play Store).
3. Upload the build: `eas build -p android --profile production`, then `eas submit -p android` to the closed track (or upload the `.aab` by hand).
4. Copy the **opt-in link** from the Testers tab.
5. Day 14 onwards: Dashboard → **Apply for production**. Google asks how testing went, so keep notes of the feedback and fixes.

Testers have to **opt in through the link and keep the app installed**. Opening it a few times a week helps, because Google looks at engagement.

## Message to send (WhatsApp)

> Hey! I'm launching Zuri, a study app I've been building for uni students: you record lectures and it gives you notes, quizzes and a study plan for exams. Google needs a few people to test it for 2 weeks before it can go on the Play Store.
>
> Could you help? It takes 2 minutes:
> 1. Send me the Gmail you use on your phone
> 2. I'll send you a link, tap "Become a tester", then install from the Play Store
> 3. Keep it installed for 2 weeks and open it now and then (try importing your timetable or recording a class)
>
> If anything breaks or feels confusing, just tell me. That's the whole point. Thank you 🙏

## Follow-up (day 7)

> Thanks for testing Zuri! Halfway there. Please keep it installed till [date]. Anything annoying or broken so far?
