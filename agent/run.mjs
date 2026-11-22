#!/usr/bin/env node
// Litmus from the command line. Give it one objective. It designs a survey,
// sends it through Flashpoint, reads the results, runs a follow-up round, and
// writes the answer.
//
//   node run.mjs "Your objective" --deadline 13:45
//   node run.mjs "Your objective" --mock      practice run: fake Flashpoint, no emails, no money
//
// See README.md for every option.

import path from "node:path";
import readline from "node:readline/promises";
import { parseArgs } from "node:util";
import { loadEnv } from "./flashpoint.mjs";
import { runAgent } from "./lib/agent.mjs";
import { prepare, EXAMPLE } from "./lib/setup.mjs";

loadEnv();

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    objective: { type: "string" },
    example: { type: "boolean", default: false },
    panel: { type: "string" },
    context: { type: "string" },
    budget: { type: "string", default: "10" },
    rounds: { type: "string", default: "2" },
    deadline: { type: "string" },
    model: { type: "string" },
    mock: { type: "boolean", default: false },
    scripted: { type: "boolean", default: false },
    resume: { type: "string" },
    yes: { type: "boolean", short: "y", default: false },
    "ask-before-send": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

const HELP = `Litmus research agent

  node run.mjs "objective" [options]

  --panel FILE         email list CSV (default panel.csv; practice runs fall back to panel.example.csv)
  --context FILE       background notes for the agent, such as what your product or club is
  --deadline TIME      when it must finish: 13:45, +90 (minutes from now), or an ISO time. Default +90
  --budget DOLLARS     most it may spend on Flashpoint (default 10)
  --rounds N           survey rounds, 1 to 3 (default 2)
  --model NAME         Claude model (default claude-opus-5-5)
  --example            use our example objective about LionMatch
  --mock               practice run against a fake Flashpoint. No emails, no money
  --scripted           with --mock, use fixed test steps instead of Claude (no keys needed)
  --ask-before-send    ask you in the terminal before each email send
  --resume RUN_ID      continue a run saved in runs/RUN_ID
  -y, --yes            skip the start prompt`;

async function ask(question) {
  if (!process.stdin.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const a = await rl.question(question);
  rl.close();
  return /^y(es)?$/i.test(a.trim());
}

const hhmm = (ms) => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

async function main() {
  if (opt.help) return console.log(HELP);
  let objective = opt.objective ?? positionals.join(" ").trim();
  if (opt.example || (!objective && (opt.mock || opt.scripted))) objective = EXAMPLE.objective;
  if (!objective && !opt.resume) {
    console.log(HELP);
    process.exitCode = 1;
    return;
  }

  const run = await prepare({ ...opt, objective });
  const { args, facts } = run;
  console.log(`
Litmus${args.mock ? " (practice run: fake Flashpoint, no emails, no money)" : ""}
  Objective: ${args.objective}
  People:    ${facts.people} on the list${run.skipped ? ` (${run.skipped} rows skipped)` : ""}
  Budget:    $${args.budget.toFixed(2)}, up to ${args.maxRounds} rounds
  Finish by: ${hhmm(args.deadline)}
  Brain:     ${args.brain.name}
  Saving to: runs/${run.runId}
${run.notes.map((n) => `  ${n}\n`).join("")}`);

  if (!args.mock && !opt.yes && !args.resumeState) {
    const ok = await ask(`This will email ${facts.people} real people through Flashpoint, on its own. Start? (yes/no) `);
    if (!ok) return console.log("Stopped. Nothing was sent.");
  }

  const { state, files } = await runAgent({
    ...args,
    progress: (text) => process.stdout.write(text ? `\r  ${text} ` : "\r                              \r"),
    askBeforeSend: opt["ask-before-send"] ? (summary) => ask(`\nFlashpoint is about to send:\n${summary}\n\nSend it? (yes/no) `) : null,
  });

  const rel = (f) => path.relative(process.cwd(), f);
  console.log(`
${state.finished ? "Finished." : "Stopped before finishing."} Spent $${state.spent.toFixed(2)} over ${state.calls} Flashpoint calls and ${state.round} rounds.
  Report:     ${rel(files.report)}
  Transcript: ${rel(files.transcript)}
${state.finished ? `\nAnswer (${state.confidence} confidence): ${state.answer}` : `\nResume with: node run.mjs --resume ${run.runId}`}`);
}

main().catch((err) => {
  console.error(`\nError: ${err?.message ?? err}`);
  process.exit(1);
});
