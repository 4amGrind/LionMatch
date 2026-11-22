// A fake Flashpoint survey agent for practice runs and tests.
// It drafts, publishes, sends and reports results the way the real one does,
// but no email goes out and the "answers" are made up. Free.

function seeded(text) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function parseQuestions(text) {
  const lines = text.split("\n").map((l) => l.trim());
  const qs = [];
  for (const line of lines) {
    const body = line.replace(/^(\d+[.)]|Q\d+[:.)]?|[-*])\s*/i, "");
    if (/\?\s*(\(.*\))?\s*$/.test(body) || /\?\s+(Options?|Choices?)\s*:/i.test(body)) {
      const q = { text: body.replace(/\s*(\(.*\)|(Options?|Choices?)\s*:.*)$/i, "").trim(), options: [] };
      const inline = body.match(/(?:\((.*)\)|(?:Options?|Choices?)\s*:\s*(.*))\s*$/i);
      if (inline) q.options = (inline[1] ?? inline[2]).split(/\s*[,/;|]\s*/).filter(Boolean);
      qs.push(q);
    } else if (qs.length && /^([-*]|[a-z][.)])\s+/i.test(line) && !line.includes("?")) {
      qs[qs.length - 1].options.push(line.replace(/^([-*]|[a-z][.)])\s+/i, ""));
    } else if (qs.length && /^(Options?|Choices?)\s*:/i.test(line)) {
      qs[qs.length - 1].options.push(...line.replace(/^(Options?|Choices?)\s*:\s*/i, "").split(/\s*[,/;|]\s*/).filter(Boolean));
    }
  }
  return qs.slice(0, 8);
}

export class MockFlashpoint {
  constructor({ clock, responseRate = 0.75 } = {}) {
    this.clock = clock;
    this.rate = responseRate;
    this.convs = new Map();
    this.panels = new Map();
    this.sent = []; // what would have been emailed, for tests
    this.n = 0;
  }

  async listTools() {
    return [
      {
        name: "tool_survey",
        description: "Fake survey agent",
        inputSchema: { type: "object", properties: { brief: { type: "string" }, survey_id: { type: "string" }, conversation_id: { type: "string" } }, required: ["brief"] },
      },
    ];
  }

  async callTool(name, args = {}, { onPaid } = {}) {
    if (name !== "tool_survey") throw new Error(`mock has no tool ${name}`);
    const id = args.conversation_id ?? `conv_mock_${++this.n}`;
    if (!this.convs.has(id)) this.convs.set(id, { surveys: [], pending: null });
    const conv = this.convs.get(id);
    onPaid?.(`https://basescan.org/tx/0xmock${this.n}${conv.surveys.length}${Date.now() % 1000}`);
    const reply = this.#handle(conv, String(args.brief ?? args.message ?? ""), args.survey_id);
    const current = conv.surveys[conv.surveys.length - 1];
    return { conversation_id: id, ...(current ? { survey_id: current.id } : {}), reply };
  }

  #handle(conv, msg, surveyId) {
    const low = msg.toLowerCase();
    const survey = (surveyId && conv.surveys.find((s) => s.id === surveyId)) || conv.surveys[conv.surveys.length - 1];

    if (/first-party panel/.test(low) && /add these/.test(low)) {
      const members = msg.split("\n").filter((l) => l.startsWith("- ") && l.includes("@"));
      const name = (msg.match(/named "([^"]+)"/) ?? [])[1] ?? "Panel";
      this.panels.set(name, members.length);
      conv.panel = name;
      return `Created first-party panel "${name}" with ${members.length} members. It is ready to receive surveys.`;
    }

    const qs = parseQuestions(msg);
    const isDraft = qs.length >= 2;

    const isConfirm = /^\s*(confirm|yes|go ahead|send it|approved?)\b/i.test(msg) && msg.length < 200;
    if (isConfirm && conv.pending && survey) {
      const action = conv.pending;
      conv.pending = null;
      if (action === "publish") {
        survey.status = "published";
        return `Published "${survey.title}" (${survey.id}). Do you want me to send it to a panel? Tell me which one.`;
      }
      if (action === "send") {
        survey.status = "sent";
        survey.sentAt = this.clock.now();
        survey.recipients = this.panels.get(conv.panel) ?? 0;
        this.sent.push({ survey: survey.id, recipients: survey.recipients });
        return `Sent "${survey.title}" to ${survey.recipients} members of "${conv.panel}" by email. Responses will show up as people answer. Ask me for results any time.`;
      }
    }

    if (!isDraft && /\b(result|response|breakdown|report|how many|answers|so far)\b/.test(low) && survey?.status === "sent") {
      return this.#results(survey);
    }

    if (!isDraft && /\bsend\b/.test(low) && survey && survey.status === "published") {
      const panel = conv.panel ?? [...this.panels.keys()].pop();
      if (!panel) return "There is no panel yet. Create one first.";
      conv.panel = panel;
      conv.pending = "send";
      return `Ready to send "${survey.title}" to ${this.panels.get(panel)} members of "${panel}". This emails real people and cannot be undone. Reply "confirm" to send.`;
    }

    if (!isDraft && /\bpublish\b/.test(low) && survey && survey.status === "draft") {
      conv.pending = "publish";
      return `I will publish "${survey.title}" with ${survey.questions.length} questions. Reply "confirm" to publish.`;
    }

    if (qs.length) {
      const title = (msg.match(/title[d]?\s*[:"]\s*"?([^"\n]+)"?/i) ?? [])[1]?.trim() ?? `Survey ${conv.surveys.length + 1}`;
      const s = { id: `srv_mock_${conv.surveys.length + 1}${this.n}`, title, questions: qs, status: "draft" };
      conv.surveys.push(s);
      conv.pending = "publish";
      const list = qs
        .map((q, i) => `${i + 1}. ${q.text}${q.options.length ? `\n   Options: ${q.options.join(" / ")}` : "\n   (open text)"}`)
        .join("\n");
      return `Drafted "${title}" (${s.id}) with ${qs.length} questions:\n\n${list}\n\nReply "confirm" to publish it, or tell me what to change.`;
    }

    return "I can draft a survey, publish it, send it to a first-party panel, and report results with breakdowns. What would you like to do?";
  }

  #results(survey) {
    const mins = (this.clock.now() - survey.sentAt) / 60000;
    const n = Math.floor(survey.recipients * this.rate * (1 - Math.exp(-mins / 12)));
    if (n === 0) return `"${survey.title}": 0 of ${survey.recipients} have answered so far. It has been ${Math.round(mins)} minutes.`;
    const out = [`"${survey.title}": ${n} of ${survey.recipients} have answered (${Math.round((100 * n) / survey.recipients)}%).`, ""];
    for (const [i, q] of survey.questions.entries()) {
      const rand = seeded(q.text);
      out.push(`Q${i + 1}. ${q.text}`);
      if (q.options.length) {
        const w = q.options.map((_, j) => rand() * (j === 0 ? 2.2 : 1) + 0.2);
        const total = w.reduce((a, b) => a + b, 0);
        let left = n;
        const counts = w.map((x, j) => {
          const c = j === w.length - 1 ? left : Math.min(left, Math.round((x / total) * n));
          left -= c;
          return c;
        });
        q.options.forEach((o, j) => out.push(`  - ${o}: ${counts[j]} (${Math.round((100 * counts[j]) / n)}%)`));
      } else {
        const themes = ["wants it to be faster", "wants better matches", "does not trust the listings yet", "likes seeing who to talk to"];
        out.push(`  Open text, ${n} answers. Main themes: ${themes.slice(0, 2 + Math.floor(rand() * 2)).join("; ")}.`);
      }
    }
    out.push("", "Breakdown by year and school is available. Ask if you want it.");
    return out.join("\n");
  }
}
