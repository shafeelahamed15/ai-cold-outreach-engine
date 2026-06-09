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
        row_number: "={{ $('Get subject & body').item.json.row_number }}",
        status: 'sent',
        sent_at: "={{ $now.toFormat('yyyy-LL-dd HH:mm') }}",
        subject_sent: "={{ $('Get subject & body').item.json.subject }}",
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
  schedule('Every 35 min (weekdays 9-4)', '*/35 9-16 * * 1-5', [X(0), ROW]),
  sheetsRead('Get leads', [X(1), ROW]),
  codeNode('Pick next lead', 'decideSingle.js', [X(2), ROW]),
  ifProceed('Within daily limit?', [X(3), ROW]),
  codeNode('Build prompt', 'buildSingle.js', [X(4), ROW]),
  claude('Write email (Claude)', [X(5), ROW]),
  codeNode('Get subject & body', 'parseSingle.js', [X(6), ROW]),
  gmailSend('Send email', [X(7), ROW]),
  markSent('Mark row as sent', [X(8), ROW]),
  wait('Wait (random)', [X(9), ROW]),
  noop('Nothing to send', [X(4), ROW + 150]),

  // Overview sticky. Color omitted so it renders in the default yellow.
  sticky('Overview',
`## Cold email sender with AI personalization and a safe warm-up

Sends one personalized cold email at a time from Gmail, lifting the daily volume gradually so a fresh domain does not get flagged. Each email is written by Claude from the lead's own company details, and every send is logged back to the sheet so no one is contacted twice.

### How it works
- Triggers every 35 minutes, weekdays 9am to 4pm.
- The daily limit grows from 5 emails in week 1 to 15 by week 4, which keeps a new inbox safe.
- Each run takes the next un-emailed lead, asks Claude for a 3 to 4 sentence plain-text email, sends it, and writes the time and subject back to the row.
- A short random wait after each send keeps the rhythm human.

### Setup
1. Connect Gmail, Google Sheets, and an Anthropic credential (Header Auth, header name \`x-api-key\`).
2. Use a Google Sheet of leads. An Apollo export works as-is (\`Email\`, \`First Name\`, \`Company Name\`, \`Title\`, \`Company Short Description\`). Add three empty columns: \`status\`, \`sent_at\`, \`subject_sent\`. Paste the Sheet ID into both Sheets nodes.
3. Set your name and offer in the four lines at the top of the **Build prompt** node.
4. Add SPF, DKIM and DMARC to your domain and send yourself a test before going live.

### Customization
The daily limits live in the **Pick next lead** node. The schedule and send window are in the trigger.`,
    [-560, -180], 480, 700),

  // Section label behind the row of nodes.
  sticky('Section - Outreach',
`## One lead per run
Reads the sheet, picks the next person who has not been emailed yet while under today's limit, writes their email, sends it, and marks the row.`,
    [X(0) - 40, ROW - 160], 2240, 380, 7),
];

const chain = (...names) => {
  const c = {};
  for (let i = 0; i < names.length - 1; i++) c[names[i]] = { main: [[{ node: names[i + 1], type: 'main', index: 0 }]] };
  return c;
};
const connections = {
  ...chain('Every 35 min (weekdays 9-4)', 'Get leads', 'Pick next lead', 'Within daily limit?'),
  'Within daily limit?': { main: [
    [{ node: 'Build prompt', type: 'main', index: 0 }],
    [{ node: 'Nothing to send', type: 'main', index: 0 }],
  ] },
  ...chain('Build prompt', 'Write email (Claude)', 'Get subject & body', 'Send email', 'Mark row as sent', 'Wait (random)'),
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
