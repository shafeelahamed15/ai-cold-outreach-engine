# Step-by-step setup

A complete, beginner-friendly walkthrough. Budget ~30 minutes the first time. Do the steps
in order — each one builds on the last.

> **The golden rule of cold email:** set up SPF/DKIM/DMARC and warm up slowly. Skipping
> [Part 4](#part-4--deliverability-dont-skip-this) is the #1 way to burn your domain.

---

## Part 0 — What you need

- An **n8n** account ([n8n Cloud](https://n8n.io) is easiest, or self-host).
- A **Google Workspace** email on your own domain (e.g. `you@yourcompany.com`). A free
  `@gmail.com` address works for testing but is not ideal for real outreach.
- An **Anthropic API key** ([console.anthropic.com](https://console.anthropic.com)) with a few
  dollars of credit.
- A list of leads (a CSV / Apollo export is perfect).

---

## Part 1 — The Google Sheet

1. Create a new Google Sheet. Rename the first tab to exactly **`Leads`**.
2. In **row 1**, add these column headers. **Spelling and case must match exactly** — a stray
   space or capital letter will silently break things (ask me how I know 🙂):

   **Lead data** (fill these in):
   ```
   email   first_name   company   title   industry   company_description
   ```
   **Tracking columns** (leave the cells empty — the workflow fills them):
   ```
   status   sent_at   subject_sent   stage   thread_id   message_id
   ```

   > Using an **Apollo export**? It already has `Email`, `First Name`, `Company Name`, etc.
   > That works too — just make sure the code-node field names match your headers, and still
   > add the six tracking columns above.

3. Paste your leads in starting row 2. Leave every tracking column blank.
4. Copy the **Sheet ID** from the URL — the long string between `/d/` and `/edit`.

📄 Full schema reference: [GOOGLE_SHEET.md](GOOGLE_SHEET.md)

---

## Part 2 — Import the workflow

1. In n8n: **⋯ menu → Import from File** → choose
   `workflow/cold-email-engine.n8n.json`.
   *(First time? Start with `cold-email-sender.n8n.json` — sender only — then add the full one.)*
2. You'll see three rows of nodes (sender, follow-ups, reply detection) with sticky-note labels.

---

## Part 3 — Connect credentials & paste the Sheet ID

### Gmail
Click any **Gmail** node → **Create New Credential** → **Sign in with Google** → choose your
sending address → allow **all** permissions. Reuse this credential on every Gmail node.

> ⚠️ If your Google OAuth app is in "Testing" mode, the login dies every 7 days. Go to
> Google Cloud Console → OAuth consent screen → **Publish App** so it never expires.

### Google Sheets
Same idea — connect once, reuse on every Google Sheets node.

### Anthropic (Claude)
On each **Claude** node, create a credential of type **Header Auth**:
- **Name:** `x-api-key`
- **Value:** your Anthropic API key (`sk-ant-...`)

### Paste your Sheet ID
In every **Google Sheets** node, replace `PASTE_YOUR_GOOGLE_SHEET_ID` with your real Sheet ID.

### Set your pitch
Open **"Build Initial Email"** and edit the 4 CONFIG lines at the top (your name, offer, proof,
guarantee). The AI may use **only** these facts — it's told never to invent claims.

---

## Part 4 — Deliverability (DON'T skip this)

Set up the three DNS records that prove your mail is really from you. Without them, cold email
goes straight to spam.

Follow **[DELIVERABILITY.md](DELIVERABILITY.md)** for exact records, then send one email through
[mail-tester.com](https://www.mail-tester.com) and aim for **9–10 / 10** before any real sending.

---

## Part 5 — Test each flow (before going live)

Test with **your own email** as a lead. Don't activate the schedules yet — run nodes manually.

### Test 1 — the sender
1. Add a row: your email in `email`, a fake `company` + `company_description`, `status` blank.
2. Run the sender flow top to bottom (click each node → **Execute**).
3. ✅ Confirm: the email **arrives at the correct address**, and the row now shows
   `status = active`, `stage = 1`, and `thread_id` + `message_id` **filled in**.
   - *Blank `thread_id` / `message_id`?* Your update node isn't writing them — check the
     column headers match exactly.

### Test 2 — the follow-up
1. On that same row, set `sent_at` to **4 days ago** (e.g. `2025-01-01 09:00:00`).
2. Run the follow-up flow. ✅ Confirm it sends a short note **as a reply in the same thread**
   and the row advances to `stage = 2`.
   - *"No follow-ups due"?* Re-check `status = active`, `stage = 1`, and that `sent_at` is
     actually a few days old.

### Test 3 — reply detection
1. Reply to the test email **from another account**.
2. Run the reply-detection flow. ✅ Confirm the row flips to `status = replied`.
   - *Finds nothing?* Make sure **"Simplify"** is ON in the "Get Recent Inbox" Gmail node (it
     needs the simplified output to read the sender address).

---

## Part 6 — Go live

1. Delete your test rows (or blank their tracking columns).
2. Make sure your real leads are loaded with blank `status`.
3. Toggle the workflow **Active** (top-right). Done — it now runs on its own, 24/7.

### Keep it running forever
- **Anthropic billing → auto-reload**, so the AI never runs out of credit.
- **Publish the Google OAuth app** (Part 3) so the login doesn't expire.
- Add more leads whenever the list runs low.
- ~2 weeks in, tighten DMARC from `p=none` to `p=quarantine`.

---

## Tuning

| Want to change… | Edit this |
|---|---|
| Daily volume / ramp | the `cap` values in the **Decide** nodes |
| Follow-up timing | the `DELAY` object in **Decide Follow-up** |
| Send window | the cron in the **Schedule** nodes |
| Email tone / length | the prompt text in the **Build** nodes |

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Every email goes to the same person | A `sendTo` pointing at the whole sheet instead of the picked lead — it should be `{{ $json.to }}` |
| Tracking columns stay blank | Header name mismatch (a trailing space or wrong case) |
| "No follow-ups due" | `status` / `stage` / `sent_at` on the row don't meet the rule |
| Reply detection finds nothing | Turn **Simplify** ON in "Get Recent Inbox" |
| Emails land in spam | SPF / DKIM / DMARC not set, or volume ramped too fast |
