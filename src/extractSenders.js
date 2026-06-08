// Collect unique sender email addresses from recent inbox messages.
const emails = items.map(i => {
  const f = i.json.from || i.json.From || '';
  const m = String(f).match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  return m ? m[0].toLowerCase() : null;
}).filter(Boolean);
return [{ json: { senders: Array.from(new Set(emails)) } }];
