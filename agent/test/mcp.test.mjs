import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const HOME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("the MCP server runs a practice research run from one tool call", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(HOME, "mcp-server.mjs")],
    env: { ...process.env, LITMUS_SCRIPTED: "1" },
    stderr: "ignore",
  });
  const client = new Client({ name: "test", version: "1" });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ["get_report", "list_research_runs", "research_status", "start_research"]);

    const refused = await client.callTool({ name: "start_research", arguments: { objective: "Should our club meet on Sundays?", people_agreed: false } });
    assert.equal(refused.isError, true);

    const started = await client.callTool({
      name: "start_research",
      arguments: { objective: "What should LionMatch build next for first-years?", people_agreed: true, practice: true },
    });
    const runId = started.content[0].text.match(/run (\S+?)\s/)[1];
    assert.ok(runId.endsWith("-practice"));

    let status = "";
    for (let i = 0; i < 50 && !/Finished/.test(status); i++) {
      await new Promise((r) => setTimeout(r, 100));
      status = (await client.callTool({ name: "research_status", arguments: { run_id: runId } })).content[0].text;
    }
    assert.match(status, /Finished/);
    assert.match(status, /Round 2 of 2/);

    const report = (await client.callTool({ name: "get_report", arguments: { run_id: runId } })).content[0].text;
    assert.match(report, /## Round 2/);
    assert.ok(!report.includes("@example.com"));
    fs.rmSync(path.join(HOME, "runs", runId), { recursive: true, force: true });
  } finally {
    await client.close();
  }
});
