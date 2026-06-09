// Builds the SINGLE-FLOW (email-only) template — the simple, proven version.
// One clean row of nodes + one yellow overview sticky + one white section panel.
const fs = require('fs');
const path = require('path');
const S = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const idify = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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
const ifProceed = (name, pos) => ({
  parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
      conditions: [{ id: 'c1', leftValue: '={{ $json.proceed }}', rightValue: true,
        operator: { type: 'boolean', operation: 'true', singleValue: true } }],
      combinator: 'and',
    }, options: {},
  },
  id: idify(name), name, type: 'n8n-nodes-base.if', typeVersion: 2, position: pos,
});
const claude = (name, pos) => ({
  parameters: {
    method: 'POST', url: 'https://api.anthropic.com/v1/messages',
    authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
    sendHeaders: true,
    headerParameters: { parameters: [
      { name: 'anthropic-version', value: '2023-06-01' },
      { name: 'content-type', value: 'application/json' } ] },
    sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body) }}', options: {},
  },
  id: idify(name), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos,
});
const gmailSend = (name, pos) => ({
  parameters: {
    resource: 'message', operation: 'send',
    sendTo: '={{ $json.to }}', subject: '={{ $json.subject }}',
    emailType: 'text', message: '={{ $json.body }}', options: { appendAttribution: false },
  },
  id: idify(name), name, type: 'n8n-nodes-base.gmail', typeVersion: 2.1, position: pos,
});
const markSent = (name, pos) => ({
  parameters: {
    operation: 'update',
    documentId: { __rl: true, value: 'PASTE_YOUR_GOOGLE_SHEET_ID', mode: 'id' },
    sheetName: { __rl: true, value: 'Leads', mode: 'name' },
    columns: {
      mappingMode: 'defineBelow',
      value: {
        row_number: "={{ $('Parse').item.json.row_number }}",
        status: 'sent',
        sent_at: "={{ $now.toFormat('yyyy-LL-dd HH:mm') }}",
        subject_sent: "={{ $('Parse').item.json.subject }}",
      },
      matchingColumns: ['row_number'],
    },
    options: {},
  },
  id: idify(name), name, type: 'n8n-nodes-base.googleSheets', typeVersion: 4.5, position: pos,
});
const wait = (name, pos) => ({
  parameters: { amount: '={{ Math.floor(Math.random() * 90) + 30 }}', unit: 'seconds' },
  id: idify(name), name, type: 'n8n-nodes-base.wait', typeVersion: 1.1, position: pos, webhookId: idify(name) + '-wh',
});
const noop = (name, pos) => ({ parameters: {}, id: idify(name), name, type: 'n8n-nodes-base.noOp', typeVersion: 1, position: pos });
const sticky = (name, content, pos, w, h, color) => {
  const parameters = { content, height: h, width: w };
  if (color !== undefined) parameters.color = color;
  return { parameters, id: idify(name), name, type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position: pos };
};

const ROW = 0, X = i => i * 220;

const nodes = [
  schedule('Schedule - Send Window', '*/35 9-16 * * 1-5', [X(0), ROW]),
  sheetsRead('Get Leads', [X(1), ROW]),
  codeNode('Decide', 'decideSingle.js', [X(2), ROW]),
  ifProceed('Allowed to send?', [X(3), ROW]),
  codeNode('Build Email', 'buildSingle.js', [X(4), ROW]),
  claude('Write Email (Claude)', [X(5), ROW]),
  codeNode('Parse', 'parseSingle.js', [X(6), ROW]),
  gmailSend('Send via Gmail', [X(7), ROW]),
  markSent('Mark Lead as Sent', [X(8), ROW]),
  wait('Human Jitter', [X(9), ROW]),
  noop('Stop for now', [X(4), ROW + 150]),

  // Yellow overview (color omitted = default yellow), top-left.
  sticky('Overview',
`## 📧 Cold Email Sender with AI Personalization + Safe Warm-Up

Sends personalized cold emails from Gmail / Google Workspace and **ramps volume up slowly** so a new domain is not flagged as spam. Claude writes a unique short email for every lead, and the workflow tracks who has been contacted so nobody is emailed twice.

### How it works
- Runs every 35 minutes on weekdays, 9am to 4pm.
- A daily cap ramps from 5 emails on week 1 up to 15 by week 4, protecting your sender reputation.
- For each run it picks the next un-contacted lead, has Claude write a 3 to 4 sentence plain-text email, sends it, and marks the row \`sent\` with a timestamp.
- A short random pause between sends keeps the pattern human.

### Setup
1. Connect **Gmail**, **Google Sheets**, and an **Anthropic** credential (HTTP Header Auth, name \`x-api-key\`).
2. Create a Google Sheet with a \`Leads\` tab and these columns: \`email\`, \`first_name\`, \`company\`, \`title\`, \`industry\`, \`company_description\`, \`status\`, \`sent_at\`, \`subject_sent\`. Paste its ID into both Google Sheets nodes.
3. Edit the four config lines at the top of the **Build Email** node (your name, offer, proof, guarantee).
4. Add SPF, DKIM and DMARC to your domain, then send one test email to yourself before going live.

### Customization
Adjust the ramp caps in the **Decide** node and the sending window in the **Schedule** node.`,
    [-560, -180], 480, 700),

  // White section panel behind the flow.
  sticky('Section - Outreach',
`## Personalized outreach, one lead at a time
Picks the next un-contacted lead within today's ramp cap, writes a tailored email with AI, sends it, and marks the row so it is never emailed twice.`,
    [X(0) - 40, ROW - 160], 2240, 380, 7),
];

const chain = (...names) => {
  const c = {};
  for (let i = 0; i < names.length - 1; i++) c[names[i]] = { main: [[{ node: names[i + 1], type: 'main', index: 0 }]] };
  return c;
};
const connections = {
  ...chain('Schedule - Send Window', 'Get Leads', 'Decide', 'Allowed to send?'),
  'Allowed to send?': { main: [
    [{ node: 'Build Email', type: 'main', index: 0 }],
    [{ node: 'Stop for now', type: 'main', index: 0 }],
  ] },
  ...chain('Build Email', 'Write Email (Claude)', 'Parse', 'Send via Gmail', 'Mark Lead as Sent', 'Human Jitter'),
};

const workflow = {
  name: 'Cold Email Sender - AI Personalization + Safe Warm-Up',
  nodes, connections,
  settings: { executionOrder: 'v1', timezone: 'America/New_York' },
  active: false, pinData: {}, meta: { templateCredsSetupCompleted: false },
};

const out = path.join(__dirname, '..', 'workflow', 'cold-email-sender.n8n.json');
fs.writeFileSync(out, JSON.stringify(workflow, null, 2), 'utf8');
console.log('Wrote', out, '|', nodes.length, 'nodes');
