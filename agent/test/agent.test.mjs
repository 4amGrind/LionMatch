import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAgent, fakeClock, briefKey, replyText } from "../lib/agent.mjs";
import { scriptedBrain } from "../lib/brain.mjs";
import { MockFlashpoint } from "../lib/mock-flashpoint.mjs";
import { loadPanel, parseCsv, makeRedactor, describePanel } from "../lib/panel.mjs";
import { demoSteps } from "../lib/scripted-demo.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const panel = loadPanel(path.join(HERE, "..", "panel.example.csv"));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "litmus-"));
const allText = (dir) => fs.readdirSync(dir).map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");

function setup(extra = {}) {
  const clock = fakeClock(Date.parse("2026-11-22T12:00:00-05:00"));
  const flashpoint = new MockFlashpoint({ clock });
  return { clock, flashpoint, runDir: tmp(), deadline: clock.now() + 90 * 60000, panel, objective: "What should we build next?", ...extra };
}

test("a full two-round run finishes with a report built from both rounds", async () => {
  const s = setup();
  const { state, files } = await runAgent({ ...s, brain: scriptedBrain(demoSteps()), mock: true, log: () => {} });
  assert.equal(state.finished, true);
  assert.equal(state.round, 2);
  assert.equal(s.flashpoint.sent.length, 2, "both rounds were sent");
  assert.equal(state.spent, state.calls * 0.5);
  const report = fs.readFileSync(files.report, "utf8");
  assert.match(report, /## Round 1/);
  assert.match(report, /## Round 2/);
  // Round 2 is about the top answer from round 1.
  const r1 = state.rounds[1].builds_on;
  assert.match(r1, /led round 1/);
  assert.ok(["Deadline reminders", "Club fair mode", "Alumni coffee chats", "Resume tips"].some((o) => r1.includes(o)));
});

test("no email address or name from the list is ever written or shown to the agent", async () => {
  const s = setup();
  const { state } = await runAgent({ ...s, brain: scriptedBrain(demoSteps()), mock: true, log: () => {} });
  const seen = allText(s.runDir) + JSON.stringify(state.messages);
  for (const p of panel.people) {
    assert.ok(!seen.includes(p.email), `email leaked: ${p.email}`);
    assert.ok(!seen.includes(p.name), `name leaked: ${p.name}`);
  }
  assert.ok(!/@example\.com/.test(seen));
});

test("the agent cannot type an email address to Flashpoint", async () => {
  const s = setup();
  const brain = scriptedBrain([
    () => [{ name: "start_round", input: { goal: "x" } }],
    () => [{ name: "flashpoint_survey", input: { message: "Send this to someone@columbia.edu" } }],
  ]);
  const { state } = await runAgent({ ...s, brain, mock: true, log: () => {}, maxTurns: 3 });
  const results = state.messages.filter((m) => Array.isArray(m.content)).flatMap((m) => m.content).filter((b) => b.type === "tool_result");
  assert.match(results[1].content, /Refused: your message has an email address/);
  assert.equal(state.spent, 0);
});

test("the budget is a hard stop", async () => {
  const s = setup({ budget: 1 });
  const ask = (m) => () => [{ name: "flashpoint_survey", input: { message: m } }];
  const brain = scriptedBrain([() => [{ name: "start_round", input: { goal: "x" } }], ask("hi"), ask("hi again"), ask("third")]);
  const { state } = await runAgent({ ...s, brain, mock: true, log: () => {}, maxTurns: 5 });
  assert.equal(state.calls, 2);
  assert.equal(state.spent, 1);
  const last = JSON.stringify(state.messages);
  assert.match(last, /go over the \$1.00 budget/);
});

test("rounds are capped and Flashpoint needs a round first", async () => {
  const s = setup({ maxRounds: 2 });
  const brain = scriptedBrain([
    () => [{ name: "flashpoint_survey", input: { message: "hi" } }],
    () => [{ name: "start_round", input: { goal: "a" } }],
    () => [{ name: "start_round", input: { goal: "b" } }],
    () => [{ name: "start_round", input: { goal: "c" } }],
  ]);
  const { state } = await runAgent({ ...s, brain, mock: true, log: () => {}, maxTurns: 5 });
  const text = JSON.stringify(state.messages);
  assert.match(text, /Call start_round first/);
  assert.match(text, /already ran 2 rounds/);
  assert.equal(state.round, 2);
});

test("near the deadline, waiting is refused and the agent is made to finish", async () => {
  const s = setup();
  s.deadline = s.clock.now() + 10 * 60000;
  const brain = scriptedBrain([
    () => [{ name: "wait", input: { minutes: 20, reason: "long wait" } }],
    () => [{ name: "wait", input: { minutes: 20, reason: "again" } }],
    () => [{ name: "note", input: { decision: "keep going", reason: "test" } }],
  ]);
  const { state } = await runAgent({ ...s, brain, mock: true, log: () => {} });
  assert.equal(state.finished, true, "forced to finish");
  assert.match(JSON.stringify(state.messages), /Waited 7 min/);
});

test("the human check can stop a send", async () => {
  const s = setup();
  let asked = 0;
  const steps = demoSteps().slice(0, 7);
  const { state } = await runAgent({ ...s, brain: scriptedBrain(steps), mock: true, log: () => {}, maxTurns: 8, askBeforeSend: async () => (asked++, false) });
  assert.ok(asked >= 1);
  assert.equal(s.flashpoint.sent.length, 0);
  assert.match(JSON.stringify(state.messages), /said no to sending/);
});

test("CSV, redaction and panel facts", () => {
  assert.deepEqual(parseCsv('a,b\n"x, y","he said ""hi"""\n'), [["a", "b"], ["x, y", 'he said "hi"']]);
  const red = makeRedactor(panel);
  assert.equal(red("Hi Sample Student One at student1@example.com"), "Hi [name hidden] at [email hidden]");
  const facts = describePanel(panel);
  assert.equal(facts.people, 12);
  assert.ok(!("email" in facts) && !("name" in facts));
  assert.equal(facts.year["first-year"], 8);
});

test("reply text and argument name detection", () => {
  assert.equal(briefKey({ inputSchema: { properties: { brief: {}, survey_id: {} } } }), "brief");
  assert.equal(briefKey({ inputSchema: { properties: { message: {} } } }), "message");
  assert.equal(replyText({ reply: "Hello", conversation_id: "c1" }), "Hello\n(conversation_id: c1)");
  assert.equal(replyText("plain"), "plain");
});
