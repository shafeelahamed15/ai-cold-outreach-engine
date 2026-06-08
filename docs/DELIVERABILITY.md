# Keep your email OUT of spam — the survival guide

Your DNS authentication is **not set up yet**, so do THIS FIRST. Sending cold email
without these records is the fastest way to burn your domain. Do not send a single
email until SPF, DKIM, and DMARC are live and verified.

---

## PART 1 — The 3 DNS records (do these before anything else)

You set these in **two places**: your **Google Admin console** (to get the DKIM value)
and your **domain registrar / DNS host** (GoDaddy, Namecheap, Cloudflare, etc.).

### 1. SPF — says "Google is allowed to send for me"
In your DNS host, add a **TXT record**:
- **Host/Name:** `@`
- **Value:** `v=spf1 include:_spf.google.com ~all`
- If you already have an SPF record, do NOT add a second one — merge `include:_spf.google.com`
  into the existing one. Only one SPF record is allowed per domain.

### 2. DKIM — cryptographically signs your mail so it can't be faked
1. Go to **admin.google.com → Apps → Google Workspace → Gmail → Authenticate email**.
2. Click **Generate new record** (choose 2048-bit).
3. Google gives you a **Host** (like `google._domainkey`) and a long **TXT Value**.
4. Add that as a **TXT record** in your DNS host with the exact host + value Google shows.
5. Back in the Google Admin page, click **Start authentication**. (DNS can take up to 48h
   to propagate, usually under an hour.)

### 3. DMARC — tells inboxes what to do and emails you reports
In your DNS host, add a **TXT record**:
- **Host/Name:** `_dmarc`
- **Value (start gentle):**
  `v=DMARC1; p=none; rua=mailto:you@yourdomain.com; fo=1`
- Run it at `p=none` for ~2 weeks while warming up, then tighten to
  `p=quarantine`, and later `p=reject` once you confirm reports look clean.

### Verify all 3 are live (free tools)
- https://mxtoolbox.com/SuperTool.aspx → check `spf:yourdomain.com`, `dmarc:yourdomain.com`
- https://www.mail-tester.com → send yourself one email through the workflow, get a /10 score.
  **Aim for 9/10 or 10/10 before you start real outreach.**

---

## PART 2 — The warm-up ramp (already built into the workflow)

The workflow automatically increases volume based on how many days it's been running:

| Days running | Emails per day |
|---|---|
| Week 1 (day 1–7) | **5** |
| Week 2 (day 8–14) | **8** |
| Week 3 (day 15–21) | **12** |
| Week 4+ (day 22+) | **15** (raise to 18–20 only once replies/bounces look healthy) |

It also:
- Sends **only Mon–Fri, 9am–4pm** (looks human, not a 3am robot).
- Spaces sends out (every ~35 min, plus a random 30–90 second jitter) instead of blasting.
- Never emails the same person twice (tracks `status` in the sheet).

**To raise the cap later:** open the **"Decide (Ramp + Cap + Pick)"** node and edit the
`cap` numbers. Increase slowly — never double overnight.

> Tip: For the first 2–3 weeks, also **manually send and reply to a few normal emails**
> from this account (to colleagues, friends). Real two-way conversation builds reputation
> faster than cold sends alone. Paid tools like Mailwarm / Warmup Inbox / Instantly can
> automate this if you want extra safety.

---

## PART 3 — Rules that protect the account (important habits)

1. **One account, low volume.** You asked to not burn this email — staying at 5→15/day and
   never spiking is exactly right. Resist the urge to crank it up.
2. **Watch your bounce rate.** If more than ~3–5% of emails bounce, STOP and clean your list.
   High bounces destroy reputation fastest. Verify the 500 leads first with a tool like
   NeverBounce, ZeroBounce, or Bouncer before importing.
3. **Always allow opt-out.** Cold email (CAN-SPAM / GDPR) legally needs an easy way to opt out.
   Add a plain-text line to the Claude prompt body if you operate in regulated regions, e.g.
   "Reply 'no thanks' and I won't follow up." (The current prompt keeps it link-free on
   purpose; a polite text opt-out is the safest middle ground.)
4. **Reply to responses fast and personally.** Engagement (replies) is a positive signal to
   Gmail and the prospect.
5. **Don't use spammy words** in subjects (free, guarantee, $$$, !!!, ALL CAPS). The prompt
   already forbids these.
6. **Keep it plain text, no images, no tracking pixels, max one link** — the workflow sends
   plain text with zero links by default. This is intentional.
7. **Stagger, don't blast.** Already handled by the schedule + jitter.
8. **Monitor Google Postmaster Tools** (postmaster.google.com) — add your domain to watch
   your spam rate and reputation over time. Keep spam complaints under 0.1%.

---

## PART 4 — Quick "am I safe to start?" checklist

- [ ] SPF record live and verified on mxtoolbox
- [ ] DKIM generated in Google Admin + record added + "Start authentication" clicked
- [ ] DMARC record live (`p=none` to start)
- [ ] mail-tester.com score is 9/10 or 10/10
- [ ] 500 leads verified for valid emails (low bounce risk)
- [ ] Google Sheet "Leads" tab filled in, `status` column left blank
- [ ] Workflow imported, all 3 credentials connected, Sheet ID pasted in both Sheets nodes
- [ ] Ran one **manual test** to your own inbox and it arrived in Primary (not spam)

Only when every box is checked: turn the workflow **Active**.
