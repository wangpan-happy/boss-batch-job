# BOSS Workflow Reference

Use this reference when running `$boss-batch-apply` for a live or dry-run BOSS Zhipin batch outreach session.

## Preflight

Create a local run directory before browsing:

```text
boss-apply-runs/YYYY-MM-DD-HHMMSS/
```

Expected files:

- `settings.json`: user search settings, greeting, batch limit.
- `visible-jobs.json`: extracted visible jobs from the current page.
- `new-records.json`: records from the latest batch.
- `applications.csv`: merged final log.

Ask the user to confirm:

- They are logged into BOSS manually.
- They approve the search keyword, city, filters, greeting, and batch limit.
- They understand the workflow stops on verification or security prompts.

Open this login entry first:

```text
https://www.zhipin.com/web/user/?ka=header-login
```

## Greeting Presets

Offer these as editable starting points:

- General: "您好，我对这个岗位很感兴趣，我的经历和方向比较匹配，方便的话想进一步沟通一下。"
- Role-specific: "您好，我正在关注{role}方向，看到这个岗位和我的经验比较契合，想和您进一步沟通。"
- Direct: "您好，我对该岗位有意向，也比较匹配岗位要求，方便的话想了解一下机会。"

Never invent user credentials, experience, salary expectations, or availability. If tailoring from resume/profile text, use only facts the user provided.

## Search Process

Prefer visible UI operations:

1. Start from the BOSS login page above, then continue from the home or job search page after the user logs in.
2. Enter the job keyword in the search box.
3. Select city/region if requested.
4. Apply visible filters for salary, experience, education, or company size when available.
5. Wait for search results to render.
6. Scroll gradually to load more cards when needed.

Do not call private BOSS APIs.

### Tested Search DOM

The tested 2026 desktop search bar uses:

- Search container: `.expect-and-search`
- Search form: `.job-search-form`
- Search input: `.job-search-form input.input`
- Map button: `.job-search-form .search-map-btn[ka="map_job_search_btn_click"]`
- Search button: `.job-search-form .search-btn[ka="job_search_btn_click"]`

To automate keyword search, set the input with the native `HTMLInputElement.prototype.value` setter, dispatch `input` and `change` events, then click the visible `.search-btn` using browser/mouse actions. After clicking, verify:

- The URL includes the expected `query=...` parameter or the input value still matches the keyword.
- The page still shows the expected city/region.
- `.card-area .job-card-wrap` result cards are present.
- No login, verification, operation-frequency, or risk prompt is visible.

If search automation clears the keyword, reloads into the wrong city, returns an empty page, or triggers login/security prompts, stop and ask the user to search manually.

## Extract Visible Jobs

If the browser agent can execute page JavaScript, paste or evaluate `scripts/extract-visible-jobs.js` in the page context. Save the returned JSON array to `visible-jobs.json`.

If JavaScript execution is unavailable, use browser observation to read the visible cards and build records manually.

Useful BOSS DOM hints, which may change over time:

- Search result cards in the tested 2026 desktop UI are under `.card-area .job-card-wrap`, with the active card at `.card-area .job-card-wrap.active .job-card-box`.
- Job card containers often include class names like `job-card-wrapper`, `job-card-box`, `job-list-box`, or `search-job-result`.
- Job title often appears near `.job-name`, `.job-title`, or class names containing `job-name`.
- Company often appears near `.boss-name`, `.company-name`, or `.company-info`.
- Salary often appears near `.job-salary`, `.salary`, or class names containing `salary`.
- Location often appears near `.company-location`, `.job-area`, `.job-location`, or class names containing `area`.
- Contact button text usually includes `立即沟通` or `继续沟通`.

Always verify visible text before clicking.

## Tested Contact DOM

Use these anchors when the visible BOSS desktop UI matches the tested structure:

- Active card: `.card-area .job-card-wrap.active .job-card-box`
- Card title: `.job-card-box .job-name`
- Card salary: `.job-card-box .job-salary`
- Card company: `.job-card-box .boss-name`
- Card location: `.job-card-box .company-location`
- Detail panel: `.job-detail-header`
- Detail title: `.job-detail-header .job-name`
- Detail chat button: `.job-detail-header a.op-btn-chat[ka^="cpc_job_list_chat_"]`
- Success modal: `.greet-boss-container`
- Stay-on-page button after success: `.greet-boss-container .cancel-btn`

Prefer the right-side detail chat button over searching the whole page for `立即沟通`. Record `contacted` only after `.greet-boss-container` appears, or after another visible state clearly proves the message was sent. If BOSS refreshes after contact, reconnect to the current page, verify the search result context is still correct, and continue from the next unrecorded card.

## Filtering

Filter by:

- Include keywords in job title or card text.
- Excluded keywords in job title, company, or card text.
- City/region text.
- Salary text if the user gave a salary preference.
- Experience and education tags when visible.

If uncertain, skip the card and record `skipped_filter` with a note.

## Contact Loop

For each selected job:

1. Bring the card into view.
2. Open or focus the card.
3. Confirm the page/card still shows the expected job title and company.
4. Prefer the right-side detail button `.job-detail-header a.op-btn-chat[ka^="cpc_job_list_chat_"]`.
5. If the button says `继续沟通`, record `already_contacted`.
6. If the button says `立即沟通`, click it.
7. If `.greet-boss-container` appears, record `contacted`, then click `.greet-boss-container .cancel-btn` to stay on the result page.
8. If no success modal appears, do not assume success. Re-read visible state; stop or record `failed` if confirmation is uncertain.
9. Wait 6-12 seconds before the next job by default. In user-approved faster mode, wait for modal/refresh settlement plus 3-5 seconds.

Do not continue after unexpected prompts.

## Stop Conditions

Stop and report immediately on:

- Captcha, slider, SMS, login, or security verification.
- Operation-frequency or risk warning.
- Chinese warning text such as `操作频繁`, `账号异常`, `风险提示`, or equivalent prompts.
- Contact button missing on three consecutive selected cards.
- Repeated page navigation failures.
- User interruption.

Record the stop as `stopped_verification` when the reason is verification or risk prompt. Otherwise record `failed` for the active job and stop with an explanation.

## Dry Run

Dry-run mode should:

1. Open BOSS.
2. Let the user log in.
3. Search with the chosen keyword and filters.
4. Extract visible jobs.
5. Filter jobs.
6. Show the first 10 candidates and estimated contact count.
7. Write `visible-jobs.json`.
8. Avoid clicking `立即沟通`.

Use dry-run before the first live session or after BOSS page structure changes.

## CSV Record Notes

Use `source_url` when available. If no URL is visible, use `company + job_title + location` as the de-duplication key.

Recommended notes:

- `matched keyword`
- `excluded keyword`
- `button missing`
- `already contacted`
- `verification prompt`
- `manual review needed`
