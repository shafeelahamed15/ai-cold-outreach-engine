// Assembles the full n8n cold-email template (3 flows) into one valid JSON file.
// Layout follows n8n template guidelines: one yellow overview sticky (top-left) +
// white section stickies behind each flow. Nodes are evenly spaced on clean rows.
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

// Sticky factory. Omit `color` for the default YELLOW overview sticky; pass a color
// integer (7 = grey/white) for the section panels behind node groups.
const sticky = (name, content, pos, w, h, color) => {
  const parameters = { content, height: h, width: w };
  if (color !== undefined) parameters.color = color;
  return { parameters, id: idify(name), name, type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position: pos };
};

const a = (name, type, value) => ({ id: idify(name), name, type, value });

// ---- nodes ----
const ROW1 = 0, ROW2 = 440, ROW3 = 880;   // one clean row per flow
const X = i => i * 220;                    // even horizontal spacing

const nodes = [
  // ===== FLOW 1 — initial outreach (row 1) =====
  schedule('Schedule - New Outreach', '*/35 9-16 * * 1-5', [X(0), ROW1]),
  sheetsRead('Get Leads (New)', [X(1), ROW1]),
  codeNode('Decide Initial', 'decideInitial.js', [X(2), ROW1]),
  ifProceed('Allowed to send?', [X(3), ROW1]),
  codeNode('Build Initial Email', 'buildInitial.js', [X(4), ROW1]),
  claude('Claude - Initial', [X(5), ROW1]),
  codeNode('Parse Initial', 'parseInitial.js', [X(6), ROW1]),
  gmailSend('Send New Email', [X(7), ROW1]),
  setNode('Prep Update (Initial)', [
    a('row_number', 'number', "={{ $('Parse Initial').item.json.row_number }}"),
    a('status', 'string', 'active'),
    a('stage', 'number', '1'),
    a('last_sent_at', 'string', '={{ $now.toISO() }}'),
    a('thread_id', 'string', '={{ $json.threadId }}'),
    a('message_id', 'string', '={{ $json.id }}'),
    a('subject_sent', 'string', "={{ $('Parse Initial').item.json.subject }}"),
  ], [X(8), ROW1]),
  sheetsUpdate('Update Sheet (Initial)', [X(9), ROW1]),
  wait('Wait (New)', [X(10), ROW1]),
  noop('Stop (New)', [X(4), ROW1 + 150]),

  // ===== FLOW 2 — follow-ups (row 2) =====
  schedule('Schedule - Follow-ups', '*/40 9-16 * * 1-5', [X(0), ROW2]),
  sheetsRead('Get Leads (Follow-up)', [X(1), ROW2]),
  codeNode('Decide Follow-up', 'decideFollowup.js', [X(2), ROW2]),
  ifProceed('Follow-up due?', [X(3), ROW2]),
  codeNode('Build Follow-up Email', 'buildFollowup.js', [X(4), ROW2]),
  claude('Claude - Follow-up', [X(5), ROW2]),
  codeNode('Parse Follow-up', 'parseFollowup.js', [X(6), ROW2]),
  gmailReply('Send Reply', [X(7), ROW2]),
  setNode('Prep Update (Follow-up)', [
    a('row_number', 'number', "={{ $('Parse Follow-up').item.json.row_number }}"),
    a('stage', 'number', "={{ $('Parse Follow-up').item.json.next_stage }}"),
    a('status', 'string', "={{ $('Parse Follow-up').item.json.next_stage >= 3 ? 'done' : 'active' }}"),
    a('last_sent_at', 'string', '={{ $now.toISO() }}'),
  ], [X(8), ROW2]),
  sheetsUpdate('Update Sheet (Follow-up)', [X(9), ROW2]),
  wait('Wait (Follow-up)', [X(10), ROW2]),
  noop('Stop (Follow-up)', [X(4), ROW2 + 150]),

  // ===== FLOW 3 — reply detection (row 3) =====
  schedule('Schedule - Reply Check', '0 10,13,16 * * 1-5', [X(0), ROW3]),
  gmailGetRecent('Get Recent Inbox', [X(1), ROW3]),
  codeNode('Extract Reply Senders', 'extractSenders.js', [X(2), ROW3]),
  sheetsRead('Get Leads (Replies)', [X(3), ROW3]),
  codeNode('Match Repliers', 'matchRepliers.js', [X(4), ROW3]),
  sheetsUpdate('Mark as Replied', [X(5), ROW3]),

  // ===== Sticky notes =====
  // (1) Main overview — YELLOW (color omitted = default yellow), top-left.
  sticky('Overview',
`## 📧 Self-Warming AI Cold Email Engine

Sends personalized cold emails from Gmail / Google Workspace and **ramps volume up slowly** so your domain is not flagged as spam. Claude writes every email, follow-ups are sequenced automatically, and replies are detected so people who respond stop receiving messages.

### How it works
- **Row 1 – New outreach:** every 35 min on weekdays, picks the next un-contacted lead within a daily cap that ramps from 5 to 15 per day over four weeks, writes a short personalized email, sends it, and marks the row.
- **Row 2 – Follow-ups:** chases non-repliers. Email 2 goes out 3 days later, email 3 after 4 more, each as a reply in the same thread.
- **Row 3 – Reply detection:** scans the inbox a few times a day and marks anyone who replied so they exit the sequence. A shared daily cap across all rows protects your sender reputation.

### Setup
1. Connect **Gmail**, **Google Sheets**, and an **Anthropic** credential (HTTP Header Auth, name \`x-api-key\`).
2. Copy the Google Sheet template from the workflow description and paste its ID into the three Google Sheets nodes.
3. Edit the four config lines at the top of the **Build Initial Email** node (name, offer, proof, guarantee).
4. Add SPF, DKIM and DMARC to your domain, then send one test email to yourself.
5. Activate the workflow.

### Customization
Change the ramp caps in the **Decide** nodes, the follow-up delays in **Decide Follow-up**, and the sending window in the **Schedule** nodes.`,
    [-560, -180], 480, 760),

  // (2) Section panels — grey/white (color 7), sized to sit behind each flow's nodes.
  sticky('Section - New Outreach',
`## 1. New outreach  ·  every 35 min, weekdays
Picks the next new lead within today's ramp cap, writes a personalized email with AI, sends it, and records it on the row.`,
    [X(0) - 40, ROW1 - 160], 2460, 380, 7),

  sticky('Section - Follow-ups',
`## 2. Follow-ups
Chases leads who have not replied: email 2 after 3 days, email 3 after 4 more, each sent as a reply in the same thread.`,
    [X(0) - 40, ROW2 - 160], 2460, 380, 7),

  sticky('Section - Reply Detection',
`## 3. Reply detection
Scans the inbox and marks anyone who replied as \`replied\` so they drop out of the follow-up sequence.`,
    [X(0) - 40, ROW3 - 160], 1340, 340, 7),
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
  meta: { templateCredsSetupCompleted: false },
};

const out = path.join(__dirname, '..', 'workflow', 'cold-email-engine.n8n.json');
fs.writeFileSync(out, JSON.stringify(workflow, null, 2), 'utf8');
console.log('Wrote', out);
console.log('Nodes:', nodes.length, '| Code nodes embedded from src/.');
