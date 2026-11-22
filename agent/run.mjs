#!/usr/bin/env node
// Litmus: give it one objective. It designs a survey, sends it through
// Flashpoint, reads the results, runs a follow-up round, and writes the answer.
//
//   npm start -- "Your objective" --deadline 13:45
//   npm run mock                      practice run, fake Flashpoint, no emails
//
// See README.md for every option.

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { loadEnv, Flashpoint, wallet, balance } from "./flashpoint.mjs";
import { loadPanel, describePanel } from "./lib/panel.mjs";
import { runAgent, realClock, fakeClock, briefKey } from "./lib/agent.mjs";
import { claudeBrain, scriptedBrain } from "./lib/brain.mjs";
import { MockFlashpoint } from "./lib/mock-flashpoint.mjs";
import { demoSteps } from "./lib/scripted-demo.mjs";

loadEnv();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const at = (p) => path.resolve(HERE, p);

const DEFAULT_OBJECTIVE =
  "Find out what LionMatch should build next so that Columbia first-years actually use it every week, and whether they would use it at all.";

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    objective: { type: "string" },
    panel: { type: "string" },
    context: { type: "string" },
    budget: { type: "string", default: "10" },
    rounds: { type: "string", default: "2" },
    deadline: { type: "string" },
    model: { type: "string", default: process.env.LITMUS_MODEL ?? "claude-opus-5-5" },
    mock: { type: "boolean", default: false },
    scripted: { type: "boolean", default: false },
    resume: { type: "string" },
    yes: { type: "boolean", short: "y", default: false },
    "ask-before-send": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (opt.help) {
  console.log(`Litmus research agent

  node run.mjs "objective" [options]

  --panel FILE         email list CSV (default panel.csv; practice runs use panel.example.csv)
  --context FILE       background notes for the agent (default context/lionmatch.md for the default objective)
  --deadline TIME      when it must finish: 13:45, +90 (minutes from now), or an ISO time. Default +90
  --budget DOLLARS     most it may spend on Flashpoint (default 10)
  --rounds N           survey rounds (default 2)
  --model NAME         Claude model (default claude-opus-5-5)
  --mock               practice run against a fake Flashpoint. No emails, no money
  --scripted           with --mock, use fixed test steps instead of Claude (no keys needed)
  --ask-before-send    ask you in the terminal before each email send
  --resume RUN_ID      continue a run in runs/RUN_ID
  -y, --yes            skip the start prompt`);
  process.exit(0);
}

function parseDeadline(text, now) {
  if (!text) return now + 90 * 60000;
  if (/^\+\d+$/.test(text)) return now + Number(text.slice(1)) * 60000;
  const hm = text.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    const d = new Date(now);
    d.setHours(Number(hm[1]), Number(hm[2]), 0, 0);
    if (d.getTime() < now) throw new Error(`--deadline ${text} is already past.`);
    return d.getTime();
  }
  const t = Date.parse(text);
  if (Number.isNaN(t)) throw new Error(`Cannot read --deadline ${text}. Use 13:45 or +90.`);
  return t;
}

function stamp(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

async function ask(question) {
  if (!process.stdin.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const a = await rl.question(question);
  rl.close();
  return /^y(es)?$/i.test(a.trim());
}

async function main() {
  const mock = opt.mock || opt.scripted;
  let resumeState = null;
  let runDir;
  if (opt.resume) {
    runDir = at(path.join("runs", opt.resume));
    const file = path.join(runDir, "state.json");
    if (!fs.existsSync(file)) throw new Error(`No saved run at ${file}.`);
    resumeState = JSON.parse(fs.readFileSync(file, "utf8"));
    if (resumeState.finished) throw new Error("That run already finished.");
  }

  const objective = resumeState?.objective ?? opt.objective ?? positionals.join(" ").trim() ?? "";
  const finalObjective = objective || DEFAULT_OBJECTIVE;
  const contextFile = opt.context ?? (finalObjective === DEFAULT_OBJECTIVE ? "context/lionmatch.md" : null);
  const context = contextFile ? fs.readFileSync(at(contextFile), "utf8") : "";

  const panelFile = at(opt.panel ?? (mock && !fs.existsSync(at("panel.csv")) ? "panel.example.csv" : "panel.csv"));
  const panel = loadPanel(panelFile);
  const facts = describePanel(panel);

  const clock = mock ? fakeClock() : realClock;
  const deadline = opt.deadline || !resumeState ? parseDeadline(opt.deadline, clock.now()) : resumeState.deadline;
  if (resumeState) resumeState.deadline = deadline;
  const budget = resumeState?.budget ?? Number(opt.budget);
  const maxRounds = resumeState?.maxRounds ?? Number(opt.rounds);

  let flashpoint;
  let surveyArgKey = "brief";
  if (mock) {
    flashpoint = new MockFlashpoint({ clock });
  } else {
    const account = wallet();
    const usdc = await balance().catch(() => null);
    if (usdc !== null) {
      console.log(`Wallet ${account.address}: $${usdc.toFixed(2)} USDC on Base.`);
      if (usdc < 1) throw new Error("The wallet has less than $1. Get Flashpoint credit first (see README).");
      if (usdc < budget) console.log(`Note: the budget is $${budget}, but the wallet has $${usdc.toFixed(2)}.`);
    }
    flashpoint = new Flashpoint();
    const tools = await flashpoint.listTools();
    const survey = tools.find((t) => t.name === "tool_survey");
    if (!survey) throw new Error(`Flashpoint has no tool_survey. Tools: ${tools.map((t) => t.name).join(", ")}`);
    surveyArgKey = briefKey(survey);
  }

  const brain = opt.scripted ? scriptedBrain(demoSteps()) : claudeBrain({ model: opt.model });
  runDir ??= at(path.join("runs", `${stamp(Date.now())}${mock ? "-practice" : ""}`));

  console.log(`
Litmus${mock ? " (practice run: fake Flashpoint, no emails, no money)" : ""}
  Objective: ${finalObjective}
  People:    ${facts.people} on the list${panel.skipped.length ? ` (${panel.skipped.length} rows skipped)` : ""}
  Budget:    $${budget.toFixed(2)}, up to ${maxRounds} rounds
  Finish by: ${new Date(deadline).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
  Brain:     ${brain.name}
  Saving to: ${path.relative(process.cwd(), runDir) || runDir}
`);
  if (!mock && !opt.yes && !resumeState) {
    const ok = await ask(`This will email ${facts.people} real people through Flashpoint, on its own. Start? (yes/no) `);
    if (!ok) {
      console.log("Stopped. Nothing was sent.");
      return;
    }
  }

  const { state, files } = await runAgent({
    objective: finalObjective,
    brain,
    flashpoint,
    panel,
    context,
    clock,
    runDir,
    budget,
    maxRounds,
    deadline,
    mock,
    surveyArgKey,
    resumeState,
    askBeforeSend: opt["ask-before-send"] ? (summary) => ask(`\nFlashpoint is about to send:\n${summary}\n\nSend it? (yes/no) `) : null,
  });

  console.log(`
${state.finished ? "Finished." : "Stopped before finishing."} Spent $${state.spent.toFixed(2)} over ${state.calls} Flashpoint calls and ${state.round} rounds.
  Report:     ${path.relative(process.cwd(), files.report)}
  Transcript: ${path.relative(process.cwd(), files.transcript)}
${state.finished ? `\nAnswer (${state.confidence} confidence): ${state.answer}` : `\nResume with: node run.mjs --resume ${path.basename(runDir)}`}`);
}

main().catch((err) => {
  console.error(`\nError: ${err?.message ?? err}`);
  process.exit(1);
});
