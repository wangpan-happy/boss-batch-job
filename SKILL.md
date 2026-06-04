---
name: boss-batch-apply
description: Controlled BOSS Zhipin batch outreach workflow for browser-capable coding agents. Use when a user asks an agent with browser control to open BOSS, guide login, search target jobs, choose greeting copy, batch contact jobs through visible UI controls, stop on verification or risk prompts, and save contacted job records to local CSV.
---

# BOSS Batch Apply

## Core Rule

Operate only through the normal BOSS web UI in the user's real browser session. Do not bypass login, captcha, slider checks, risk prompts, private APIs, cookies, headers, signatures, tokens, fingerprints, WebDriver signals, or rate limits.

If a verification, login, or security prompt appears, stop immediately and ask the user to handle it.

## Workflow

1. Confirm the user wants a batch outreach session, not a dry run.
2. Open the BOSS login page: `https://www.zhipin.com/web/user/?ka=header-login`.
3. Ask the user to log in manually and confirm they are ready.
4. Collect session settings:
   - Job keyword.
   - City or region.
   - Optional filters: salary, experience, education, company size, excluded keywords.
   - Batch limit. Default to 20. Recommend not exceeding 50 in one session.
   - Greeting text or one of the presets in the workflow reference.
5. Show the final search settings, greeting text, and batch limit. Ask for confirmation before contacting any job.
6. Search and filter using the BOSS web UI after login. If the tested search DOM matches, use the search automation guidance in `references/boss-workflow.md`; otherwise ask the user to search manually and continue from the result page.
7. Run a dry extraction first when possible:
   - If page JavaScript execution is available, use `scripts/extract-visible-jobs.js` in page context.
   - Otherwise inspect visible cards with the browser tool.
8. Contact matching jobs one by one using visible browser actions.
9. Record every attempted job in a local CSV.
10. Stop at the batch limit, no more visible matches, user interruption, or any stop condition.
11. Summarize contacted, skipped, failed, and stopped records in chat.

Read `references/boss-workflow.md` before running a live session.

If the user explicitly asks for higher speed by refreshing after each contact, use the refresh-fast mode in `references/boss-workflow.md` only after its no-contact double-refresh dry test succeeds. This mode still must wait for the success modal before recording `contacted`, and it still must stop on explicit verification, login, operation-frequency, account-abnormal, or risk-warning prompts.

## Greeting Copy

Offer the editable presets from `references/boss-workflow.md`.

Never invent user credentials, experience, salary expectations, or availability. If tailoring from resume/profile text, use only facts the user provided.

## Stop Conditions

Stop immediately on:

- Captcha, slider, SMS/login challenge, or security verification.
- Operation-frequency, account-abnormal, risk-warning, or similar limit messages.
- Login expiration or forced re-login.
- Changed page structure that prevents reliable confirmation.
- Three consecutive failed contact attempts.
- User asks to stop or pause.

Do not continue by guessing.

## Helper Scripts

Use `scripts/extract-visible-jobs.js` only for DOM reading. It must not click, type, submit, or mutate the page.

Use `scripts/merge-application-records.mjs` to merge new JSON records into a stable local CSV:

```bash
node scripts/merge-application-records.mjs --csv boss-apply-runs/session/applications.csv --json boss-apply-runs/session/new-records.json
```

## CSV Schema

Write these columns:

- `timestamp`
- `status`
- `job_title`
- `company`
- `salary`
- `location`
- `experience`
- `education`
- `hr_or_recruiter`
- `source_url`
- `greeting`
- `notes`

Statuses:

- `contacted`
- `already_contacted`
- `skipped_filter`
- `skipped_no_button`
- `failed`
- `stopped_verification`

## Pacing

Use pacing for reliability and user control, not for hiding automation:

- Default to a conservative 6-12 seconds between contact attempts.
- If the user asks for faster mode, wait for the success modal or page refresh to settle, then wait 3-5 seconds before the next contact attempt.
- If the user asks for refresh-fast mode, first run the no-contact double-refresh dry test in the workflow reference. If it passes, after each success modal: refresh the current search page, wait 2 seconds, refresh again, wait 2 seconds, then continue from the currently loaded detail panel.
- Do not use sub-3-second rapid clicking. Stop if BOSS shows operation-frequency, risk, login, or verification prompts.
- Pause every 10 contacts and summarize progress.
- Ask again before exceeding 50 contacts.

## Final Report

End with:

- CSV path.
- Total visible jobs inspected.
- Count contacted.
- Count skipped.
- Count failed or stopped.
- Last stop reason, if any.
