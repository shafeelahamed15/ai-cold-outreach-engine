# Cold Email Automation — Safe Ramp + AI + Follow-ups (n8n Template)

Send personalized cold emails from Gmail / Google Workspace that **ramp up slowly** so your
account doesn't get burned, are **written individually by Claude**, run a **3-step follow-up
sequence**, and **auto-detect replies** so you never follow up with someone who already answered.

> Import file: **`n8n-cold-email-template.json`**

---

## What it does (3 flows in one workflow)

1. **New Outreach** — every 35 min on weekdays 9am–4pm, sends one fresh email to the next new
   lead, within a daily cap that ramps up week by week.
2. **Follow-ups** — chases leads who haven't replied: email #2 after 3 days, email #3 after a
   further 4 days, each sent as a reply **in the same thread**.
3. **Reply Detection** — a few times a day it scans your inbox; anyone who replied is marked
   `replied` and drops out of the sequence.

A shared daily cap across all flows protects deliverability:

| Week | Max total emails/day |
|---|---|
| 1 | 5 |
| 2 | 8 |
| 3 | 12 |
| 4+ | 15 (raise slowly toward 18–20 later) |

---

## Setup (about 15 minutes)

### 1. Google Sheet — make a tab named `Leads`
Add these headers in **row 1** (exact, lowercase):

```
email  first_name  company  title  industry  company_description  status  stage  last_sent_at  thread_id  message_id  subject_sent
```

- Fill in `email`, `first_name`, `company`, `title`, `industry`, `company_description` for each lead.
- **Leave the last 6 columns empty** (`status` → `subject_sent`). The workflow fills them.
- Copy the **Sheet ID** from the URL (the long code between `/d/` and `/edit`).

| Column | Meaning |
|---|---|
| `status` | empty/`pending` = new · `active` = in sequence · `replied` = answered (skipped) · `done` = finished all 3 · `bounced` = bad |
| `stage` | 0/empty = new · 1 = first sent · 2 = second sent · 3 = third sent |
| `last_sent_at` | timestamp of the most recent email (drives the daily cap + follow-up timing) |
| `thread_id` / `message_id` | Gmail IDs, used to thread follow-ups as replies |

### 2. Connect 3 credentials
- **Gmail OAuth2** → on `Send New Email`, `Send Reply`, `Get Recent Inbox`.
- **Google Sheets OAuth2** → on all `Get Leads...`, `Update Sheet...`, `Mark as Replied`.
- **Anthropic** → on `Claude - Initial` and `Claude - Follow-up`: create a **Header Auth**
  credential with **Name** `x-api-key` and **Value** = your Anthropic API key.

### 3. Paste your Sheet ID
Replace `PASTE_YOUR_GOOGLE_SHEET_ID` in every Google Sheets node (5 of them).

### 4. Edit your pitch (only a few lines)
- In **`Build Initial Email`** → edit the 4 CONFIG lines at the top: `SENDER_NAME`, `OFFER`,
  `PROOF`, `GUARANTEE`. The AI may use **only** these facts (it's told never to invent claims).
- In **`Build Follow-up Email`** → set `SENDER_NAME`.

### 5. Protect deliverability (do BEFORE sending)
Set up **SPF, DKIM, and DMARC** on your sending domain, then test a real email at
https://www.mail-tester.com (aim for 9–10/10). This is the #1 factor for landing in inboxes.

### 6. Test, then go live
1. Add one test row with your own email, `status` blank.
2. Run the **New Outreach** flow once; confirm the email arrives and the row flips to
   `status = active`, `stage = 1`.
3. Toggle the workflow **Active**. It now runs on its own, 24/7, on n8n's servers.

---

## Keep it running unattended
- **Publish your Google OAuth app** (Google Cloud Console → OAuth consent screen → Publish) so
  the Gmail login doesn't expire every 7 days.
- **Enable Anthropic billing auto-reload** so the AI never runs out of credit.
- Add more leads (blank `status`) whenever the list runs low.

## Tuning
- **Volume ramp:** edit the `cap` values in `Decide Initial` / `Decide Follow-up`.
- **Follow-up timing:** edit the `DELAY` object in `Decide Follow-up` (days between emails).
- **Send window:** edit the cron in the three Schedule nodes (default weekdays 9am–4pm).
- **Tone/length:** edit the prompt text in the two Build nodes.
