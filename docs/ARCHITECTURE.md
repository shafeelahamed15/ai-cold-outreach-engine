# Architecture & Design Decisions

This document explains *why* the system is built the way it is. The headline constraint
is **deliverability**: every design choice is downstream of "keep landing in the inbox."

## 1. Why a Google Sheet as the database?

A cold-email engine needs durable, queryable state: who's been contacted, when, at what
stage, and whether they replied. A Sheet gives this with **zero infrastructure**, and —
critically — it's **human-editable**. A non-technical operator can pause a lead, fix a typo,
or add 500 rows without touching the automation. The Sheet *is* the CRM.

State columns:

| Column | Role |
|---|---|
| `status` | Lifecycle: blank/`pending` → `active` → `replied` / `done` / `bounced` |
| `stage` | 0 → 3, how many touches have been sent |
| `last_sent_at` | Drives both the shared daily cap and follow-up timing |
| `thread_id` / `message_id` | Persisted Gmail IDs so follow-ups thread as replies |

## 2. The warm-up ramp

New domains/inboxes get filtered hard if they spike volume. The `Decide` nodes compute a
daily cap as a pure function of elapsed days since first run:

```
week 1 → 5/day   week 2 → 8/day   week 3 → 12/day   week 4+ → 15/day
```

`startDate` is persisted in n8n workflow static data on the first execution, so the ramp
survives restarts and never needs manual bumping.

## 3. Idempotency & safety

The single most dangerous failure mode is **emailing the same person repeatedly**. The system
prevents this structurally:

- A lead is only selected if its `status` is open (blank/`pending` for new, `active`+due for
  follow-ups). The moment a send succeeds, the row is stamped — so the next run skips it.
- State is external (the Sheet), not in-memory. Overlapping runs, crashes, and redeploys
  can't cause double-sends, because the source of truth is re-read every run.
- A **shared daily cap** is enforced across all three flows by counting `last_sent_at == today`.
  Follow-ups and new sends draw from the same budget, so total volume can't exceed the ramp.

## 4. One inbox sweep instead of N reply checks

Naive reply detection would query Gmail once per active lead — slow and rate-limit-prone.
Instead, flow ③ pulls recent inbox messages **once**, extracts sender addresses with a single
regex pass, and reconciles them against the lead list in memory. This is `O(inbox)` Gmail
calls regardless of list size, and it fails safe: no inbox messages → no-op, no errors.

## 5. Prompt design

The model is constrained to be *trustworthy*, not clever:

- **Allow-list of true facts.** It may only use the sender-provided proof points and is
  explicitly told never to invent results, numbers, or clients — so it can't embarrass the
  sender to a real prospect.
- **Anti-spam style rules.** No em-dashes, no exclamation marks, no buzzwords, no ALL CAPS,
  no links/images. 3–4 sentences. These map directly to spam-filter heuristics.
- **Structured output.** Claude returns strict JSON (`{subject, body}`), parsed defensively
  with a fallback so a single malformed response never breaks a run.

## 6. Why split the Code-node logic into `src/` files?

Exported n8n JSON buries JavaScript inside escaped string fields — unreadable and unreviewable.
Here the logic lives as plain `.js` files, and `build.js` assembles them into the workflow JSON
via `JSON.stringify` (which also guarantees correct escaping). The result: the interesting code
is diff-able, reviewable, and testable, while the deployable artifact stays a single import.

## Data flow summary

```
Sheet ──read──▶ Decide(ramp/cap/select) ──▶ Build prompt ──▶ Claude ──▶ Parse
   ▲                                                                      │
   │                                                                      ▼
   └────────────── Mark row (status/stage/timestamps) ◀── Send (Gmail) ──┘

Inbox ──sweep──▶ extract senders ──▶ match active leads ──▶ mark `replied`
```
