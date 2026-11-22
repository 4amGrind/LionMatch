#!/usr/bin/env node
// `npm run probe`: one real Flashpoint survey-agent call, to see what its
// replies look like. Costs $0.50. It only asks for a draft. Nothing is
// published or sent, and no email goes out.

import { loadEnv, Flashpoint } from "./flashpoint.mjs";
import { briefKey, replyText } from "./lib/agent.mjs";

loadEnv();
const fp = new Flashpoint({ onPaid: (url) => console.log(`paid $0.50: ${url}`) });
const tools = await fp.listTools();
const survey = tools.find((t) => t.name === "tool_survey");
if (!survey) {
  console.error(`No tool_survey. Tools: ${tools.map((t) => t.name).join(", ")}`);
  process.exit(1);
}
const key = briefKey(survey);
console.log(`tool_survey takes its message as "${key}". Sending one draft request...`);
const result = await fp.callTool("tool_survey", {
  [key]: "This is a test. Draft a 2-question survey titled \"Litmus test\": 1. How often do you check email? Options: Hourly / Daily / Weekly. 2. Anything else? (open text). Do not publish it and do not send it to anyone. Also tell me which panels this team has.",
});
console.log("\nRaw reply shape:", Array.isArray(result) ? "array" : typeof result, typeof result === "object" ? Object.keys(result ?? {}) : "");
console.log("\nWhat Litmus will show the agent:\n");
console.log(replyText(result));
