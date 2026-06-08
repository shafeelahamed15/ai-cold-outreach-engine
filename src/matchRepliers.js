// Any 'active' lead who shows up as an inbox sender has replied -> mark 'replied'
// so the follow-up flow stops emailing them.
const senders = $('Extract Reply Senders').item.json.senders || [];
const set = new Set(senders.map(s => String(s).toLowerCase()));
const rows = items.map(i => i.json);
const out = rows.filter(r => {
  const email = String(r.email || '').trim().toLowerCase();
  const status = String(r.status || '').trim().toLowerCase();
  return email && set.has(email) && status === 'active';
}).map(r => ({ json: { row_number: r.row_number, status: 'replied' } }));
return out;
