// The agent loop. The AI agent picks a tool, this file runs it with guardrails,
// and the result goes back to the agent. It repeats until the agent calls finish.

import fs from "node:fs";
import path from "node:path";
import { systemPrompt, TOOLS } from "./prompt.mjs";
import { describePanel, panelBrief, makeRedactor, hasEmail } from "./panel.mjs";

export const PRICE = { tool_survey: 0.5 };
const FINISH_MARGIN_MIN = 3; // stop waiting this many minutes before the deadline
const MAX_WAIT_MIN = 20;
const REPLY_LIMIT = 12000;

export const realClock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  fake: false,
};

export function fakeClock(start = Date.now()) {
  let t = start;
  return { now: () => t, sleep: async (ms) => void (t += ms), fake: true };
}

const hhmm = (ms) => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

// Find a field like conversation_id anywhere in a Flashpoint reply.
function findField(obj, names, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 5) return undefined;
  for (const n of names) if (typeof obj[n] === "string" && obj[n]) return obj[n];
  for (const v of Object.values(obj)) {
    const found = findField(v, names, depth + 1);
    if (found) return found;
  }
  return undefined;
}

// Turn a Flashpoint reply into readable text: the message first, then ids.
export function replyText(result) {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return String(result);
  const textKey = ["reply", "message", "response", "text", "output", "answer", "content"].find((k) => typeof result[k] === "string");
  if (!textKey) return JSON.stringify(result, null, 2);
  const rest = Object.entries(result).filter(([k]) => k !== textKey);
  const extras = rest.map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
  return [result[textKey], extras.length ? `\n(${extras.join("; ")})` : ""].join("");
}

// Pick the argument name Flashpoint's tool_survey uses for the message.
export function briefKey(tool) {
  const props = tool?.inputSchema?.properties ?? tool?.input_schema?.properties ?? {};
  for (const k of ["brief", "message", "prompt", "query", "request", "text"]) if (k in props) return k;
  const required = tool?.inputSchema?.required ?? [];
  return required.find((k) => props[k]?.type === "string") ?? "brief";
}

export async function runAgent(opts) {
  const {
    objective,
    brain,
    flashpoint,
    panel,
    context = "",
    clock = realClock,
    runDir,
    budget = 10,
    maxRounds = 2,
    deadline,
    maxTurns = 80,
    mock = false,
    askBeforeSend = null, // async (summary) => boolean, or null to run on its own
    surveyArgKey = "brief",
    log = (line) => console.log(line),
    resumeState = null,
  } = opts;

  fs.mkdirSync(runDir, { recursive: true });
  const redact = makeRedactor(panel);
  const panelFacts = describePanel(panel);
  const files = {
    state: path.join(runDir, "state.json"),
    transcript: path.join(runDir, "transcript.md"),
    report: path.join(runDir, "report.md"),
    replies: path.join(runDir, "flashpoint-replies.md"),
  };

  const state = resumeState ?? {
    objective,
    startedAt: clock.now(),
    deadline,
    budget,
    maxRounds,
    mock,
    spent: 0,
    calls: 0,
    payments: [],
    round: 0,
    rounds: [],
    conversationId: null,
    surveyId: null,
    panelName: null,
    lastReply: "",
    finished: false,
    answer: null,
    confidence: null,
    messages: [{ role: "user", content: `Objective: ${objective}\n\nStart now. Nobody will reply to you until you call finish.` }],
  };

  const save = () => fs.writeFileSync(files.state, JSON.stringify(state, null, 2));
  const write = (text) => {
    fs.appendFileSync(files.transcript, redact(text) + "\n");
  };
  const say = (text) => {
    const clean = redact(text);
    log(clean);
    write(clean);
  };

  if (!resumeState) {
    fs.writeFileSync(
      files.transcript,
      [
        `# Litmus run${mock ? " (practice run, fake Flashpoint)" : ""}`,
        "",
        `**Objective:** ${objective}`,
        "",
        `- Started: ${new Date(state.startedAt).toString()}`,
        `- Must finish by: ${hhmm(deadline)}`,
        `- Budget: $${budget.toFixed(2)}, up to ${maxRounds} rounds`,
        `- Email list: ${panelFacts.people} people (names and emails stay on the laptop and are hidden here)`,
        `- Brain: ${brain.name}`,
        "",
        "Everything below was decided by the agent. No person chose a step.",
        "",
      ].join("\n"),
    );
    fs.writeFileSync(files.replies, `# Flashpoint replies\n\nEvery reply from Flashpoint's survey agent, in order. Emails and names are hidden.\n\n`);
  } else {
    say(`\n_Resumed at ${hhmm(clock.now())}._\n`);
  }

  const minutesLeft = () => (deadline - clock.now()) / 60000;
  const status = () =>
    `[now ${hhmm(clock.now())} | ${Math.max(0, Math.floor(minutesLeft()))} min left before you must finish | spent $${state.spent.toFixed(2)} of $${budget.toFixed(2)} | round ${state.round} of ${maxRounds}]`;

  async function askFlashpoint(message, { surveyId, newConversation, label } = {}) {
    if (state.spent + PRICE.tool_survey > budget + 1e-9) {
      return `Refused: this would go over the $${budget.toFixed(2)} budget. Work with what you have and call finish.`;
    }
    if (minutesLeft() < 1) return "Refused: no time left. Call finish now.";

    // Optional human check before anything that emails people.
    const confirming = /^\s*(confirm|yes|go ahead|send it|approved?)\b/i.test(message) && message.length < 200;
    const aboutSending = /\b(send|sending|email|invit|deliver)/i.test(state.lastReply);
    if (askBeforeSend && confirming && aboutSending) {
      const ok = await askBeforeSend(redact(state.lastReply).slice(0, 1500));
      if (!ok) {
        say(`- ${hhmm(clock.now())} The person running Litmus said no to this send.`);
        return "The person running Litmus said no to sending this. Do not send it. Revise the survey or finish.";
      }
    }

    const args = { [surveyArgKey]: message };
    if (state.conversationId && !newConversation) args.conversation_id = state.conversationId;
    if (surveyId) args.survey_id = surveyId;

    const paidBefore = state.payments.length;
    let result;
    try {
      result = await flashpoint.callTool("tool_survey", args, {
        onPaid: (url) => state.payments.push(url),
      });
    } catch (err) {
      if (state.payments.length > paidBefore) state.spent += PRICE.tool_survey;
      const why = redact(String(err?.message ?? err)).slice(0, 800);
      say(`- ${hhmm(clock.now())} Flashpoint error: ${why}`);
      save();
      return `Flashpoint error: ${why}`;
    }
    state.spent += PRICE.tool_survey;
    state.calls += 1;
    state.conversationId = findField(result, ["conversation_id", "conversationId"]) ?? state.conversationId;
    state.surveyId = findField(result, ["survey_id", "surveyId"]) ?? state.surveyId;
    const text = redact(replyText(result));
    state.lastReply = text;
    fs.appendFileSync(files.replies, `## ${hhmm(clock.now())}, round ${state.round}: ${label ?? "message"}\n\n${text}\n\n`);
    const short = text.length > 1500 ? `${text.slice(0, 1500)}\n... (full reply in flashpoint-replies.md)` : text;
    write(`  - Flashpoint replied:\n\n${indent(short)}\n`);
    log(`  Flashpoint replied (${text.length} chars).`);
    return text.length > REPLY_LIMIT ? `${text.slice(0, REPLY_LIMIT)}\n... (cut for length)` : text;
  }

  const handlers = {
    async note({ decision, reason }) {
      say(`- ${hhmm(clock.now())} **Decision:** ${decision}\n  **Why:** ${reason}`);
      return "Noted.";
    },

    async read_context() {
      say(`- ${hhmm(clock.now())} Read the background notes.`);
      return context || "No background was attached. Work from the objective alone.";
    },

    async start_round({ goal, builds_on }) {
      if (state.round >= maxRounds) return `Refused: you already ran ${maxRounds} rounds. Call finish.`;
      state.round += 1;
      state.rounds.push({ n: state.round, goal, builds_on: builds_on ?? null, startedAt: clock.now() });
      say(`\n## Round ${state.round}: ${goal}\n${builds_on ? `\n_Builds on:_ ${builds_on}\n` : ""}`);
      return state.round === 1
        ? "Round 1 started. Create the panel if you have not, then have Flashpoint draft, publish and send the survey."
        : "Round 2 started. The panel already exists. Draft the follow-up survey, publish it and send it to the same panel.";
    },

    async create_panel_from_list({ panel_name }) {
      if (!state.round) return "Call start_round first.";
      if (state.panelName) return `The panel "${state.panelName}" already exists. Use it.`;
      const name = String(panel_name || "Litmus panel").slice(0, 80);
      say(`- ${hhmm(clock.now())} Sent the email list to Flashpoint as panel "${name}" (${panelFacts.people} people; names and emails hidden). Cost $0.50.`);
      const reply = await askFlashpoint(panelBrief(panel, name), { label: `create panel "${name}"` });
      if (!/^(Refused|Flashpoint error)/.test(reply)) state.panelName = name;
      return reply;
    },

    async flashpoint_survey({ message, survey_id, new_conversation }) {
      if (!state.round) return "Call start_round first.";
      if (hasEmail(message)) return "Refused: your message has an email address in it. Never send emails yourself. Refer to the panel by name.";
      say(`- ${hhmm(clock.now())} Asked Flashpoint ($0.50):\n\n${indent(String(message))}\n`);
      return askFlashpoint(String(message), {
        surveyId: survey_id,
        newConversation: Boolean(new_conversation),
        label: String(message).split("\n")[0].slice(0, 80),
      });
    },

    async wait({ minutes, reason }) {
      const room = minutesLeft() - FINISH_MARGIN_MIN;
      if (room < 1) return "No time left to wait. Call finish now with what you have.";
      const m = Math.max(1, Math.min(Number(minutes) || 5, MAX_WAIT_MIN, Math.floor(room)));
      say(`- ${hhmm(clock.now())} Waiting ${m} min. ${reason ?? ""}`);
      save();
      if (clock.fake) await clock.sleep(m * 60000);
      else {
        for (let i = m; i > 0; i--) {
          process.stdout.write(`\r  waiting... ${i} min left `);
          await clock.sleep(60000);
        }
        process.stdout.write("\r                              \r");
      }
      return `Waited ${m} min.`;
    },

    async finish({ answer, confidence, report_markdown }) {
      state.finished = true;
      state.answer = answer;
      state.confidence = confidence;
      const header = [
        `# Litmus report${mock ? " (practice run, fake Flashpoint)" : ""}`,
        "",
        `**Objective:** ${objective}`,
        "",
        `**Answer (${confidence} confidence):** ${answer}`,
        "",
        `_Rounds run: ${state.round}. Flashpoint calls: ${state.calls}. Spent: $${state.spent.toFixed(2)}. Finished ${hhmm(clock.now())}._`,
        "",
        "---",
        "",
      ].join("\n");
      const payments = state.payments.length ? `\n\n## Payment receipts\n\n${state.payments.map((u) => `- ${u}`).join("\n")}\n` : "";
      fs.writeFileSync(files.report, redact(header + String(report_markdown) + payments));
      say(`\n## Answer\n\n**${confidence} confidence.** ${answer}\n\nFull report: report.md`);
      return "Done.";
    },
  };

  let turns = 0;
  let idle = 0;
  while (!state.finished && turns < maxTurns) {
    turns += 1;
    const timeUp = minutesLeft() <= FINISH_MARGIN_MIN;
    const forceFinish = timeUp || turns === maxTurns || idle >= 3;
    const system = systemPrompt({
      objective,
      panelFacts,
      budget,
      maxRounds,
      deadlineText: `by ${hhmm(deadline)}`,
      mock,
      hasContext: Boolean(context),
    });
    let reply;
    try {
      reply = await brain.next({ system, tools: TOOLS, messages: state.messages, forceFinish });
    } catch (err) {
      say(`- ${hhmm(clock.now())} The AI model call failed: ${String(err?.message ?? err).slice(0, 300)}`);
      save();
      throw err;
    }
    state.messages.push({ role: "assistant", content: reply.content });
    for (const b of reply.content) if (b.type === "text" && b.text.trim()) write(`  > ${b.text.trim().replace(/\n/g, "\n  > ")}`);

    const uses = reply.content.filter((b) => b.type === "tool_use");
    if (!uses.length) {
      idle += 1;
      state.messages.push({ role: "user", content: `Keep going with a tool. If you are done, call finish. ${status()}` });
      save();
      continue;
    }
    idle = 0;
    const results = [];
    for (const use of uses) {
      const run = handlers[use.name];
      let out;
      if (!run) out = `Unknown tool ${use.name}.`;
      else if (state.finished) out = "Already finished.";
      else {
        try {
          out = await run(use.input ?? {});
        } catch (err) {
          out = `Tool error: ${redact(String(err?.message ?? err)).slice(0, 500)}`;
        }
      }
      const warn = minutesLeft() <= FINISH_MARGIN_MIN && !state.finished ? "\nTIME IS UP: call finish now." : "";
      results.push({ type: "tool_result", tool_use_id: use.id, content: `${out}\n${status()}${warn}` });
    }
    state.messages.push({ role: "user", content: results });
    save();
  }

  if (!state.finished) {
    say("\n_The agent ran out of turns without finishing. No report was written._");
  }
  save();
  return { state, files };
}

function indent(text) {
  return String(text)
    .split("\n")
    .map((l) => `    ${l}`)
    .join("\n");
}
