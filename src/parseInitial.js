// Parse Claude's JSON reply, re-attach the lead's row + email.
const resp = $json;
let text = '';
try { text = resp.content && resp.content[0] && resp.content[0].text ? resp.content[0].text : ''; } catch (e) { text = ''; }
text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
let p;
try { p = JSON.parse(text); } catch (e) { p = { subject: 'quick question', body: text || 'Hi, reaching out.' }; }

const d = $('Decide Initial').item.json;
const lead = d.lead || {};
return [{ json: {
  to: lead.email,
  first_name: lead.first_name || '',
  company: lead.company || '',
  row_number: d.row_number,
  subject: String(p.subject || 'quick question').slice(0, 120),
  body: String(p.body || '').trim()
} }];
