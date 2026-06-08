// ====== SHARED DAILY CAP + PICK NEXT LEAD WHOSE FOLLOW-UP IS DUE ======
const sd = $getWorkflowStaticData('global');
const now = new Date();
if (!sd.startDate) sd.startDate = now.toISOString();
const dayNum = Math.floor((now - new Date(sd.startDate)) / 864e5) + 1;

let cap;
if (dayNum <= 7) cap = 5;
else if (dayNum <= 14) cap = 8;
else if (dayNum <= 21) cap = 12;
else cap = 15;

const today = now.toISOString().slice(0, 10);
const rows = items.map(i => i.json);
const sentToday = rows.filter(r => String(r.last_sent_at || '').slice(0, 10) === today).length;
if (sentToday >= cap) {
  return [{ json: { proceed: false, reason: 'Daily cap reached' } }];
}

// Days to wait before each follow-up. stage 1 -> wait before 2nd email; stage 2 -> before 3rd.
const DELAY = { 1: 3, 2: 4 };
const daysSince = ts => ts ? (now - new Date(ts)) / 864e5 : 999;

const next = rows.find(r => {
  const status = String(r.status || '').trim().toLowerCase();
  const stage = Number(r.stage || 0);
  const email = String(r.email || '').trim();
  return email.includes('@') && status === 'active' && (stage === 1 || stage === 2) && daysSince(r.last_sent_at) >= DELAY[stage];
});
if (!next) {
  return [{ json: { proceed: false, reason: 'No follow-ups due' } }];
}
return [{ json: {
  proceed: true, cap, sentToday,
  lead: next, row_number: next.row_number,
  stage: Number(next.stage || 0),
  message_id: next.message_id,
  thread_id: next.thread_id
} }];
