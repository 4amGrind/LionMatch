import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAgent, fakeClock } from "../lib/agent.mjs";
import { openaiBrain } from "../lib/brain.mjs";
import { MockFlashpoint } from "../lib/mock-flashpoint.mjs";
import { loadPanel } from "../lib/panel.mjs";
import { demoSteps } from "../lib/scripted-demo.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

test("the OpenAI backup brain runs a full two-round run", async () => {
  const steps = demoSteps();
  let i = 0;
  let n = 0;
  const bodies = [];
  const fakeFetch = async (url, init) => {
    const body = JSON.parse(init.body);
    bodies.push(body);
    const tail = [];
    for (let j = body.messages.length - 1; j >= 0 && body.messages[j].role === "tool"; j--) tail.unshift(body.messages[j].content);
    const calls = body.tool_choice?.function?.name === "finish" ? [{ name: "finish", input: { answer: "x", confidence: "low", report_markdown: "x" } }] : i < steps.length ? steps[i++](tail) : [];
    const message = { role: "assistant", content: null, tool_calls: calls.map((c) => ({ id: `call_${++n}`, type: "function", function: { name: c.name, arguments: JSON.stringify(c.input) } })) };
    return new Response(JSON.stringify({ choices: [{ message, finish_reason: "tool_calls" }] }), { status: 200 });
  };
  const clock = fakeClock(Date.parse("2026-11-22T12:00:00-05:00"));
  const flashpoint = new MockFlashpoint({ clock });
  const { state } = await runAgent({
    objective: "What should we build next?",
    brain: openaiBrain({ apiKey: "sk-test", fetchImpl: fakeFetch }),
    flashpoint,
    panel: loadPanel(path.join(HERE, "..", "panel.example.csv")),
    clock,
    runDir: fs.mkdtempSync(path.join(os.tmpdir(), "litmus-oa-")),
    deadline: clock.now() + 90 * 60000,
    mock: true,
    log: () => {},
  });
  assert.equal(state.finished, true);
  assert.equal(state.round, 2);
  assert.equal(flashpoint.sent.length, 2);
  const last = bodies.at(-1);
  assert.equal(last.messages[0].role, "system");
  assert.ok(last.messages.some((m) => m.role === "tool"));
  assert.ok(last.tools.some((t) => t.function.name === "flashpoint_survey"));
});
