const resp = $json;
let text = '';
try { text = resp.content && resp.content[0] && resp.content[0].text ? resp.content[0].text : ''; } catch (e) { text = ''; }
text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
let p;
try { p = JSON.parse(text); } catch (e) { p = { subject: '', body: text || 'Just following up in case this is useful.' }; }

const d = $('Decide Follow-up').item.json;
return [{ json: {
  message_id: d.message_id,
  thread_id: d.thread_id,
  row_number: d.row_number,
  stage: d.stage,
  next_stage: Number(d.stage) + 1,
  body: String(p.body || '').trim()
} }];
