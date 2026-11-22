// Shared by the command line (run.mjs) and the MCP server (mcp-server.mjs):
// checks everything a run needs and returns the arguments for runAgent.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Flashpoint, wallet, balance } from "../flashpoint.mjs";
import { loadPanel, describePanel } from "./panel.mjs";
import { realClock, fakeClock, briefKey, surveyKeys } from "./agent.mjs";
import { claudeBrain, openaiBrain, scriptedBrain } from "./brain.mjs";
import { MockFlashpoint } from "./mock-flashpoint.mjs";
import { demoSteps } from "./scripted-demo.mjs";

export const HOME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const RUNS = path.join(HOME, "runs");
const at = (p) => (path.isAbsolute(p) ? p : path.resolve(HOME, p));

export const EXAMPLE = {
  objective: "Find out what LionMatch should build next so that Columbia first-years actually use it every week, and whether they would use it at all.",
  context: "context/lionmatch.md",
};

export function parseDeadline(text, now) {
  if (text === undefined || text === null || text === "") return now + 90 * 60000;
  const s = String(text).trim();
  if (/^\+?\d+$/.test(s)) return now + Number(s.replace("+", "")) * 60000;
  const hm = s.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    const d = new Date(now);
    d.setHours(Number(hm[1]), Number(hm[2]), 0, 0);
    if (d.getTime() < now) throw new Error(`The deadline ${s} is already past.`);
    return d.getTime();
  }
  const t = Date.parse(s);
  if (Number.isNaN(t)) throw new Error(`Cannot read the deadline "${s}". Use 13:45, +90 (minutes from now), or an ISO time.`);
  return t;
}

function stamp(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// Claude by default. OpenAI only if there is no Anthropic key.
export function pickBrain(o = {}) {
  if (o.scripted) return scriptedBrain(demoSteps());
  if (process.env.ANTHROPIC_API_KEY) return claudeBrain({ model: o.model ?? process.env.LITMUS_MODEL ?? "claude-opus-5-5" });
  if (process.env.OPENAI_API_KEY) return openaiBrain({ model: o.model ?? process.env.LITMUS_OPENAI_MODEL ?? "gpt-5" });
  throw new Error("No AI key. Add ANTHROPIC_API_KEY=sk-ant-... to .env (or OPENAI_API_KEY=sk-... as a backup).");
}

export function loadState(runId) {
  const file = path.join(RUNS, runId, "state.json");
  if (!fs.existsSync(file)) throw new Error(`No saved run called ${runId}.`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export async function prepare(o) {
  const mock = Boolean(o.mock || o.scripted);
  let resumeState = null;
  if (o.resume) {
    resumeState = loadState(o.resume);
    if (resumeState.finished) throw new Error("That run already finished.");
  }

  const objective = String(resumeState?.objective ?? o.objective ?? "").trim();
  if (!objective) throw new Error("Give Litmus an objective, for example: \"Should our club move meetings to Sundays?\"");

  const contextFile = o.context ?? (objective === EXAMPLE.objective ? EXAMPLE.context : null);
  const context = contextFile ? fs.readFileSync(at(contextFile), "utf8") : "";

  const panelFile = at(o.panel ?? (mock && !fs.existsSync(at("panel.csv")) ? "panel.example.csv" : "panel.csv"));
  const panel = loadPanel(panelFile);
  const facts = describePanel(panel);

  const clock = mock ? fakeClock() : realClock;
  const deadline = o.deadline || !resumeState ? parseDeadline(o.deadline, clock.now()) : resumeState.deadline;
  if (resumeState) resumeState.deadline = deadline;
  const budget = resumeState?.budget ?? Number(o.budget ?? 10);
  const maxRounds = resumeState?.maxRounds ?? Number(o.rounds ?? 2);
  if (!(budget > 0)) throw new Error("The budget must be more than $0.");
  if (!(maxRounds >= 1 && maxRounds <= 3)) throw new Error("Rounds must be 1, 2 or 3.");

  const notes = [];
  let flashpoint;
  let surveyArgKey = "brief";
  let surveyKeyNames = { conversation: "conversation_id", survey: "survey_id" };
  if (mock) {
    flashpoint = new MockFlashpoint({ clock });
  } else {
    const account = wallet();
    const usdc = await balance().catch(() => null);
    if (usdc !== null) {
      notes.push(`Wallet ${account.address} has $${usdc.toFixed(2)} USDC on Base.`);
      if (usdc < 1) throw new Error(`The wallet ${account.address} has less than $1. Get Flashpoint credit first.`);
      if (usdc < budget) notes.push(`The budget is $${budget}, but the wallet has $${usdc.toFixed(2)}.`);
    }
    flashpoint = new Flashpoint();
    const tools = await flashpoint.listTools();
    const survey = tools.find((t) => t.name === "tool_survey");
    if (!survey) throw new Error(`Flashpoint has no tool_survey. It has: ${tools.map((t) => t.name).join(", ")}`);
    surveyArgKey = briefKey(survey);
    surveyKeyNames = surveyKeys(survey);
  }

  const brain = pickBrain(o);
  const runId = o.resume ?? `${stamp(Date.now())}${mock ? "-practice" : ""}`;
  const runDir = path.join(RUNS, runId);

  return {
    runId,
    facts,
    skipped: panel.skipped.length,
    notes,
    args: { objective, brain, flashpoint, panel, context, clock, runDir, budget, maxRounds, deadline, mock, surveyArgKey, surveyKeyNames, resumeState },
  };
}
