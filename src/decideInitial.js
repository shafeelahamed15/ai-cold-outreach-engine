// ====== WARM-UP RAMP + SHARED DAILY CAP + PICK NEXT NEW LEAD ======
// Protects the sending account: starts low and ramps up over 4 weeks.
const sd = $getWorkflowStaticData('global');
const now = new Date();
if (!sd.startDate) sd.startDate = now.toISOString();
const dayNum = Math.floor((now - new Date(sd.startDate)) / 864e5) + 1;

let cap;
if (dayNum <= 7) cap = 5;        // Week 1
else if (dayNum <= 14) cap = 8;  // Week 2
else if (dayNum <= 21) cap = 12; // Week 3
else cap = 15;                   // Week 4+ (raise slowly to 18-20 later)

const today = now.toISOString().slice(0, 10);
const rows = items.map(i => i.json);
// Total emails sent today across BOTH new + follow-up flows (shared cap).
const sentToday = rows.filter(r => String(r.last_sent_at || '').slice(0, 10) === today).length;
if (sentToday >= cap) {
  return [{ json: { proceed: false, reason: 'Daily cap reached', cap, sentToday, dayNum } }];
}

// Pick the next brand-new lead (no status, stage 0) with a valid email.
const next = rows.find(r => {
  const status = String(r.status || '').trim().toLowerCase();
  const stage = Number(r.stage || 0);
  const email = String(r.email || '').trim();
  return email.includes('@') && (status === '' || status === 'pending') && (!stage || stage === 0);
});
if (!next) {
  return [{ json: { proceed: false, reason: 'No new leads', cap, sentToday, dayNum } }];
}
return [{ json: { proceed: true, cap, sentToday, dayNum, lead: next, row_number: next.row_number } }];
