// ====== EDIT YOUR NAME HERE ======
const SENDER_NAME = 'Your Name';
// =================================

const lead = $json.lead || {};
const stage = Number($json.stage); // 1 = sending 2nd email, 2 = sending 3rd (final) email
const fuNum = stage;

const system = `You are ${SENDER_NAME} writing a SHORT follow-up to a cold email the prospect did not reply to. This is follow-up number ${fuNum} of 2.

RULES:
- 1 to 3 sentences only. Shorter than a first email.
- Friendly and low pressure. No guilt, no "just bumping this", no pushiness.
- Add ONE new angle, a quick proof point, or a simple yes or no question. Do NOT repeat the whole pitch.
- If this is follow-up number 2, make it a short, polite final check-in and offer to close the loop.
- NEVER use em-dashes or double hyphens. No links, no images. Plain text.
- Sign off on its own line with just: ${SENDER_NAME}

Output STRICT JSON only, no markdown, exactly:
{"subject": "", "body": "..."}
Leave subject as an empty string, the email is sent as a reply in the same thread.`;

const userMsg = `Prospect first name: ${lead.first_name || 'there'}
Company: ${lead.company || ''}
What they do: ${lead.company_description || 'unknown'}`;

const body = { model: 'claude-sonnet-4-6', max_tokens: 300, system, messages: [{ role: 'user', content: userMsg }] };
return [{ json: { body } }];
