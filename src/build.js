// Assembles the full n8n cold-email template (3 flows) into one valid JSON file.
const fs = require('fs');
const path = require('path');
const S = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

const idify = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---- node factory helpers ----
const codeNode = (name, file, pos) => ({
  parameters: { jsCode: S(file) },
  id: idify(name), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos,
});

const schedule = (name, cron, pos) => ({
  parameters: { rule: { interval: [{ field: 'cronExpression', expression: cron }] } },
  id: idify(name), name, type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: pos,
});

const sheetsRead = (name, pos) => ({
  parameters: {
    documentId: { __rl: true, value: 'PASTE_YOUR_GOOGLE_SHEET_ID', mode: 'id' },
    sheetName: { __rl: true, value: 'Leads', mode: 'name' },
    options: {},
  },
  id: idify(name), name, type: 'n8n-nodes-base.googleSheets', typeVersion: 4.5, position: pos,
});

const sheetsUpdate = (name, pos) => ({
  parameters: {
    operation: 'update',
    documentId: { __rl: true, value: 'PASTE_YOUR_GOOGLE_SHEET_ID', mode: 'id' },
    sheetName: { __rl: true, value: 'Leads', mode: 'name' },
    columns: { mappingMode: 'autoMapInputData', matchingColumns: ['row_number'], value: {} },
    options: {},
  },
  id: idify(name), name, type: 'n8n-nodes-base.googleSheets', typeVersion: 4.5, position: pos,
});

const ifProceed = (name, pos) => ({
  parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
      conditions: [{
        id: 'c1', leftValue: '={{ $json.proceed }}', rightValue: true,
        operator: { type: 'boolean', operation: 'true', singleValue: true },
      }],
      combinator: 'and',
    },
    options: {},
  },
  id: idify(name), name, type: 'n8n-nodes-base.if', typeVersion: 2, position: pos,
});

const claude = (name, pos) => ({
  parameters: {
    method: 'POST',
    url: 'https://api.anthropic.com/v1/messages',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendHeaders: true,
    headerParameters: { parameters: [
      { name: 'anthropic-version', value: '2023-06-01' },
      { name: 'content-type', value: 'application/json' },
    ] },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: '={{ JSON.stringify($json.body) }}',
    options: {},
  },
  id: idify(name), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos,
});

const gmailSend = (name, pos) => ({
  parameters: {
    resource: 'message', operation: 'send',
    sendTo: '={{ $json.to }}', subject: '={{ $json.subject }}',
    emailType: 'text', message: '={{ $json.body }}',
    options: { appendAttribution: false },
  },
  id: idify(name), name, type: 'n8n-nodes-base.gmail', typeVersion: 2.1, position: pos,
});

const gmailReply = (name, pos) => ({
  parameters: {
    resource: 'message', operation: 'reply',
    messageId: '={{ $json.message_id }}',
    emailType: 'text', message: '={{ $json.body }}',
    options: { appendAttribution: false },
  },
  id: idify(name), name, type: 'n8n-nodes-base.gmail', typeVersion: 2.1, position: pos,
});

const gmailGetRecent = (name, pos) => ({
  parameters: {
    resource: 'message', operation: 'getAll',
    returnAll: false, limit: 100, simple: true,
    filters: { q: 'in:inbox newer_than:3d' },
  },
  id: idify(name), name, type: 'n8n-nodes-base.gmail', typeVersion: 2.1, position: pos,
});

const setNode = (name, assignments, pos) => ({
  parameters: {
    assignments: { assignments },
    includeOtherFields: false,
    options: {},
  },
  id: idify(name), name, type: 'n8n-nodes-base.set', typeVersion: 3.4, position: pos,
});

const wait = (name, pos) => ({
  parameters: { amount: '={{ Math.floor(Math.random() * 90) + 30 }}', unit: 'seconds' },
  id: idify(name), name, type: 'n8n-nodes-base.wait', typeVersion: 1.1, position: pos,
  webhookId: idify(name) + '-wh',
});

const noop = (name, pos) => ({
  parameters: {}, id: idify(name), name, type: 'n8n-nodes-base.noOp', typeVersion: 1, position: pos,
});

const sticky = (name, content, pos, w, h, color) => ({
  parameters: { content, height: h, width: w, color: color || 4 },
  id: idify(name), name: name, type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position: pos,
});

const a = (name, type, value) => ({ id: idify(name), name, type, value });

// ---- nodes ----
const nodes = [
  // FLOW 1 — initial outreach
  schedule('Schedule - New Outreach', '*/35 9-16 * * 1-5', [0, 300]),
  sheetsRead('Get Leads (New)', [220, 300]),
  codeNode('Decide Initial', 'decideInitial.js', [440, 300]),
  ifProceed('Allowed to send?', [660, 300]),
  codeNode('Build Initial Email', 'buildInitial.js', [880, 200]),
  claude('Claude - Initial', [1100, 200]),
  codeNode('Parse Initial', 'parseInitial.js', [1320, 200]),
  gmailSend('Send New Email', [1540, 200]),
  setNode('Prep Update (Initial)', [
    a('row_number', 'number', "={{ $('Parse Initial').item.json.row_number }}"),
    a('status', 'string', 'active'),
    a('stage', 'number', '1'),
    a('last_sent_at', 'string', '={{ $now.toISO() }}'),
    a('thread_id', 'string', '={{ $json.threadId }}'),
    a('message_id', 'string', '={{ $json.id }}'),
    a('subject_sent', 'string', "={{ $('Parse Initial').item.json.subject }}"),
  ], [1760, 200]),
  sheetsUpdate('Update Sheet (Initial)', [1980, 200]),
  wait('Wait (New)', [2200, 200]),
  noop('Stop (New)', [880, 380]),

  // FLOW 2 — follow-ups
  schedule('Schedule - Follow-ups', '*/40 9-16 * * 1-5', [0, 720]),
  sheetsRead('Get Leads (Follow-up)', [220, 720]),
  codeNode('Decide Follow-up', 'decideFollowup.js', [440, 720]),
  ifProceed('Follow-up due?', [660, 720]),
  codeNode('Build Follow-up Email', 'buildFollowup.js', [880, 620]),
  claude('Claude - Follow-up', [1100, 620]),
  codeNode('Parse Follow-up', 'parseFollowup.js', [1320, 620]),
  gmailReply('Send Reply', [1540, 620]),
  setNode('Prep Update (Follow-up)', [
    a('row_number', 'number', "={{ $('Parse Follow-up').item.json.row_number }}"),
    a('stage', 'number', "={{ $('Parse Follow-up').item.json.next_stage }}"),
    a('status', 'string', "={{ $('Parse Follow-up').item.json.next_stage >= 3 ? 'done' : 'active' }}"),
    a('last_sent_at', 'string', '={{ $now.toISO() }}'),
  ], [1760, 620]),
  sheetsUpdate('Update Sheet (Follow-up)', [1980, 620]),
  wait('Wait (Follow-up)', [2200, 620]),
  noop('Stop (Follow-up)', [880, 800]),

  // FLOW 3 — reply detection sweep
  schedule('Schedule - Reply Check', '0 10,13,16 * * 1-5', [0, 1120]),
  gmailGetRecent('Get Recent Inbox', [220, 1120]),
  codeNode('Extract Reply Senders', 'extractSenders.js', [440, 1120]),
  sheetsRead('Get Leads (Replies)', [660, 1120]),
  codeNode('Match Repliers', 'matchRepliers.js', [880, 1120]),
  sheetsUpdate('Mark as Replied', [1100, 1120]),

  // Sticky notes
  sticky('Note - Intro',
    '## Cold Email Automation (Safe Ramp + AI + Follow-ups)\n\n' +
    'Sends personalized cold emails from Gmail/Google Workspace, ramping volume up safely so the account is not burned. Writes each email with Claude, runs a 3-step sequence, and auto-detects replies.\n\n' +
    '### Setup (read SETUP-GUIDE)\n' +
    '1. Connect credentials: **Gmail OAuth2**, **Google Sheets OAuth2**, and a **Header Auth** for Anthropic (name `x-api-key`, value = your API key).\n' +
    '2. Paste your **Google Sheet ID** into every Google Sheets node (replace `PASTE_YOUR_GOOGLE_SHEET_ID`).\n' +
    '3. Edit the 4 CONFIG lines at the top of **Build Initial Email** (and the name in **Build Follow-up Email**).\n' +
    '4. Set up SPF + DKIM + DMARC on your domain before sending.\n' +
    '5. Test once to yourself, then toggle the workflow **Active**.',
    [-360, 180], 320, 520, 6),
  sticky('Note - Flow1', '### 1) NEW OUTREACH\nEvery 35 min on weekdays 9am-4pm: picks the next new lead (within the daily ramp cap), writes a 3-4 sentence email, sends it, and marks the row stage 1 / active.', [880, 60], 320, 120, 4),
  sticky('Note - Flow2', '### 2) FOLLOW-UPS\nPicks leads that have not replied and are due (3 days after email 1, then 4 days after email 2). Sends a short follow-up as a reply in the SAME thread. After email 3, the lead is marked done.', [880, 470], 340, 130, 4),
  sticky('Note - Flow3', '### 3) REPLY DETECTION\nA few times a day, scans the inbox for replies. Any lead who replied is marked `replied` so the follow-up flow stops emailing them.', [220, 980], 320, 110, 5),
];

// ---- connections ----
const chain = (...names) => {
  const c = {};
  for (let i = 0; i < names.length - 1; i++) {
    c[names[i]] = { main: [[{ node: names[i + 1], type: 'main', index: 0 }]] };
  }
  return c;
};

const connections = {
  ...chain('Schedule - New Outreach', 'Get Leads (New)', 'Decide Initial', 'Allowed to send?'),
  'Allowed to send?': { main: [
    [{ node: 'Build Initial Email', type: 'main', index: 0 }],
    [{ node: 'Stop (New)', type: 'main', index: 0 }],
  ] },
  ...chain('Build Initial Email', 'Claude - Initial', 'Parse Initial', 'Send New Email', 'Prep Update (Initial)', 'Update Sheet (Initial)', 'Wait (New)'),

  ...chain('Schedule - Follow-ups', 'Get Leads (Follow-up)', 'Decide Follow-up', 'Follow-up due?'),
  'Follow-up due?': { main: [
    [{ node: 'Build Follow-up Email', type: 'main', index: 0 }],
    [{ node: 'Stop (Follow-up)', type: 'main', index: 0 }],
  ] },
  ...chain('Build Follow-up Email', 'Claude - Follow-up', 'Parse Follow-up', 'Send Reply', 'Prep Update (Follow-up)', 'Update Sheet (Follow-up)', 'Wait (Follow-up)'),

  ...chain('Schedule - Reply Check', 'Get Recent Inbox', 'Extract Reply Senders', 'Get Leads (Replies)', 'Match Repliers', 'Mark as Replied'),
};

const workflow = {
  name: 'Cold Email Automation - Safe Ramp + AI Personalization + Follow-ups',
  nodes,
  connections,
  settings: { executionOrder: 'v1', timezone: 'America/New_York' },
  active: false,
  pinData: {},
  meta: { templatecredstorerrorsignal: false },
};

const out = path.join(__dirname, '..', 'workflow', 'cold-email-engine.n8n.json');
fs.writeFileSync(out, JSON.stringify(workflow, null, 2), 'utf8');
console.log('Wrote', out);
console.log('Nodes:', nodes.length, '| Code nodes embedded from src/.');
