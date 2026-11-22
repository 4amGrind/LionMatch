#!/usr/bin/env node
// Litmus as an MCP server. Add it to Claude Desktop, Claude Code, Cursor or any
// MCP client. The client's AI gives one objective to start_research, and the
// Litmus agent does the rest on its own: it plans, surveys through Flashpoint,
// learns, runs a follow-up round, and writes the report.

import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadEnv } from "./flashpoint.mjs";
import { runAgent } from "./lib/agent.mjs";
import { prepare, RUNS, loadState } from "./lib/setup.mjs";

loadEnv();
const live = new Map(); // runId -> { done, error }
const hhmm = (ms) => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const text = (t) => ({ content: [{ type: "text", text: t }] });
const fail = (t) => ({ content: [{ type: "text", text: t }], isError: true });

function latestRunId() {
  if (!fs.existsSync(RUNS)) return null;
  const ids = fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, "state.json")));
  return ids.sort().pop() ?? null;
}

// The decisions and steps from the end of a run's transcript.
function recentSteps(runId, count = 12) {
  const file = path.join(RUNS, runId, "transcript.md");
  if (!fs.existsSync(file)) return "";
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const steps = lines.filter((l) => /^(- \d|## |  \*\*Why)/.test(l));
  return steps.slice(-count).join("\n");
}

const server = new McpServer({ name: "litmus", version: "1.0.0" });

server.registerTool(
  "start_research",
  {
    title: "Start a Litmus research run",
    description: [
      "Give Litmus one objective and it runs the research on its own through Flashpoint:",
      "it decides what to ask, emails a short survey to the people on the list, reads the results,",
      "writes and sends a follow-up survey based on what it learned, and writes a report with an answer.",
      "The run happens in the background. Check it with research_status and read the result with get_report.",
      "A live run emails real people, so only start one when the user has asked for it and the people on the list agreed to answer.",
      "Use practice: true to try it against a fake Flashpoint with no emails and no cost.",
    ].join(" "),
    inputSchema: {
      objective: z.string().min(10).describe("The question to answer, for example 'Should our club move meetings to Sundays?'"),
      people_agreed: z.boolean().describe("True only if everyone on the list agreed to get short surveys."),
      list_file: z.string().optional().describe("CSV of people with name and email columns, plus anything like year or school. Default: panel.csv in the Litmus folder."),
      background_file: z.string().optional().describe("Optional notes about the product, club or group the objective is about."),
      deadline: z.string().optional().describe("When it must finish: '13:45', '+90' (minutes from now), or an ISO time. Default: 90 minutes."),
      budget: z.number().positive().max(50).optional().describe("Most to spend on Flashpoint in US dollars. Default 10. Each Flashpoint step costs $0.50."),
      rounds: z.number().int().min(1).max(3).optional().describe("Survey rounds. Default 2."),
      practice: z.boolean().optional().describe("Run against a fake Flashpoint. No emails, no money."),
    },
    annotations: { destructiveHint: true, openWorldHint: true, idempotentHint: false },
  },
  async (input) => {
    if (!input.practice && !input.people_agreed) {
      return fail("Not started. A live run emails everyone on the list, so they must have agreed to get surveys. Set people_agreed to true only if that is so, or use practice: true.");
    }
    let run;
    try {
      run = await prepare({
        objective: input.objective,
        panel: input.list_file,
        context: input.background_file,
        deadline: input.deadline,
        budget: input.budget,
        rounds: input.rounds,
        mock: input.practice,
        scripted: input.practice && process.env.LITMUS_SCRIPTED === "1",
      });
    } catch (err) {
      return fail(`Not started: ${err.message}`);
    }
    const entry = { done: false, error: null };
    live.set(run.runId, entry);
    runAgent({ ...run.args, log: (l) => console.error(l) })
      .then(() => (entry.done = true))
      .catch((err) => {
        entry.done = true;
        entry.error = String(err?.message ?? err);
      });
    const a = run.args;
    return text(
      [
        `Started Litmus run ${run.runId}${a.mock ? " (practice: fake Flashpoint, no emails, no money)" : ""}.`,
        `Objective: ${a.objective}`,
        `People: ${run.facts.people}. Budget: $${a.budget.toFixed(2)}. Rounds: up to ${a.maxRounds}. Finishes by ${hhmm(a.deadline)}.`,
        ...run.notes,
        "The agent now works on its own. Check progress with research_status. Real people need time to answer, so checking every 10 minutes or so is plenty.",
      ].join("\n"),
    );
  },
);

server.registerTool(
  "research_status",
  {
    title: "Check a Litmus run",
    description: "Where a Litmus run is: the round, money spent, time left, and the agent's latest decisions and reasons.",
    inputSchema: { run_id: z.string().optional().describe("Default: the latest run.") },
    annotations: { readOnlyHint: true },
  },
  async ({ run_id }) => {
    const id = run_id ?? latestRunId();
    if (!id) return fail("No runs yet. Start one with start_research.");
    let s;
    try {
      s = loadState(id);
    } catch (err) {
      return fail(err.message);
    }
    const entry = live.get(id);
    const where = s.finished
      ? `Finished. Answer (${s.confidence} confidence): ${s.answer}\nRead the full report with get_report.`
      : entry?.error
        ? `Stopped with an error: ${entry.error}. It can be resumed from the command line: node run.mjs --resume ${id}`
        : entry
          ? "Running."
          : `Not running in this server. Resume from the command line: node run.mjs --resume ${id}`;
    const left = Math.max(0, Math.round((s.deadline - Date.now()) / 60000));
    return text(
      [
        `Run ${id}${s.mock ? " (practice)" : ""}: ${where}`,
        `Round ${s.round} of ${s.maxRounds}. Spent $${s.spent.toFixed(2)} of $${s.budget.toFixed(2)} over ${s.calls} Flashpoint calls.${s.mock ? "" : ` ${left} minutes until the deadline.`}`,
        "",
        "Latest steps:",
        recentSteps(id),
      ].join("\n"),
    );
  },
);

server.registerTool(
  "get_report",
  {
    title: "Read a Litmus report",
    description: "The final answer and full report of a finished Litmus run, with the real numbers from each round.",
    inputSchema: { run_id: z.string().optional().describe("Default: the latest run.") },
    annotations: { readOnlyHint: true },
  },
  async ({ run_id }) => {
    const id = run_id ?? latestRunId();
    if (!id) return fail("No runs yet.");
    const file = path.join(RUNS, id, "report.md");
    if (!fs.existsSync(file)) return fail(`Run ${id} has no report yet. Check research_status.`);
    return text(fs.readFileSync(file, "utf8"));
  },
);

server.registerTool(
  "list_research_runs",
  {
    title: "List Litmus runs",
    description: "Every saved Litmus run with its objective and whether it finished.",
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  async () => {
    if (!fs.existsSync(RUNS)) return text("No runs yet.");
    const rows = fs
      .readdirSync(RUNS)
      .filter((d) => fs.existsSync(path.join(RUNS, d, "state.json")))
      .sort()
      .map((id) => {
        const s = loadState(id);
        return `- ${id}: ${s.finished ? "finished" : "not finished"}${s.mock ? " (practice)" : ""}. ${s.objective}`;
      });
    return text(rows.length ? rows.join("\n") : "No runs yet.");
  },
);

await server.connect(new StdioServerTransport());
console.error("Litmus MCP server ready.");
