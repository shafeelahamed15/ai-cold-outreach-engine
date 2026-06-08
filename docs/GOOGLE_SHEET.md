# Google Sheet Setup — "Leads" tab

Create ONE Google Sheet. Name the first tab exactly **`Leads`** (capital L). Add these
column headers in **row 1**, spelled exactly like this (lowercase, with underscores):

| Column | Required? | What goes in it | Example |
|---|---|---|---|
| `email` | YES | The prospect's email address | jane@acme.com |
| `first_name` | YES | Their first name (used in the email) | Jane |
| `company` | YES | Their company name | Acme Tools |
| `title` | optional | Their job title/role | Operations Manager |
| `notes` | optional | Any specific detail Claude can use to personalize | "expanding to 2 new plants" |
| `offer` | optional | What you're pitching this lead (overrides the default) | "industrial valve supply" |
| `status` | leave blank | The workflow fills this: blank/`pending` = not sent, `sent` = done | (blank) |
| `sent_at` | leave blank | The workflow fills this with the date/time sent | (blank) |
| `subject_sent` | leave blank | The workflow records the subject line it used | (blank) |

## Rules
- **Leave `status`, `sent_at`, and `subject_sent` EMPTY.** The automation writes to them.
  That's how it knows who it already emailed and never double-emails anyone.
- Paste all 500 leads in. The workflow walks down the list, one per send, oldest-first.
- To **pause** a lead, type anything other than blank/`pending` in its `status` cell.
- To **re-send** to someone, clear their `status` and `sent_at` cells back to blank.

## Getting the Sheet ID
Open the sheet. The URL looks like:
`https://docs.google.com/spreadsheets/d/`**`1A2b3C4d5E6f7G8h...`**`/edit`
The bold part is your **Sheet ID**. Paste it into the workflow everywhere it says
`PASTE_YOUR_GOOGLE_SHEET_ID_HERE` (two places: "Get All Leads" and "Mark Lead as Sent").
