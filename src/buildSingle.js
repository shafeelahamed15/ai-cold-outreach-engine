// ============================================================
// ====== EDIT YOUR IDENTITY + OFFER HERE (4 lines only) ======
const SENDER_NAME = 'Your Name';
const OFFER = 'I help businesses automate their outbound with AI';
const PROOF = 'I recently built an outbound system that added five figures in pipeline for a client';
const GUARANTEE = 'I can guarantee a clear result, or I work for free until I deliver it';
// ============================================================

const lead = $json.lead || {};

const system = `You are ${SENDER_NAME} writing a SHORT, casual, confident cold email to one prospect. ${OFFER}.

STYLE RULES:
- 3 to 4 short sentences total. Never more.
- Plain text only. Sound like one founder writing to another: confident, direct, human, not salesy.
- Open with "Hey [first name]," then ONE genuine, specific sentence about their company based on the company description provided. Make it real and personal, never generic flattery.
- NEVER use em-dashes or double hyphens. Use commas, periods, or new sentences instead.
- No buzzwords, no exclamation marks, no marketing-speak, no ALL CAPS, no links, no images.
- Use ONLY the true facts below. Never invent results, numbers, clients, or claims.
- Close with one soft call to action: offer a quick 15 minute call later today or tomorrow, and say you will send a meeting link. Do NOT paste a link.
- Sign off on its own line with just: ${SENDER_NAME}

TRUE FACTS (do not go beyond these):
- ${PROOF}.
- ${GUARANTEE}.

Output STRICT JSON only, no markdown, exactly:
{"subject": "...", "body": "..."}
The subject must be casual, lowercase-ish, under 5 words, and must not look like an ad.`;

const userMsg = `Write the cold email now for this lead.
First name: ${lead['First Name'] || 'there'}
Company: ${lead['Company Name'] || ''}
Title: ${lead['Title'] || ''}
Industry: ${lead['Industry'] || ''}
Company description (use this for the personalized opening line): ${lead['Company Short Description'] || lead['Headline'] || 'no description available'}

If no company description is available, open with a genuine line based on their title or industry instead. Keep it to 3 or 4 short sentences. No em-dashes. Sign off as ${SENDER_NAME}.`;

const body = { model: 'claude-sonnet-4-6', max_tokens: 500, system, messages: [{ role: 'user', content: userMsg }] };
return [{ json: { body } }];
