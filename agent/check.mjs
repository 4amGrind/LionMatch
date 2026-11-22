#!/usr/bin/env node
// `npm run check`: tells you in a few seconds whether a live run will work.
// Free. It sends nothing and spends nothing.

import fs from "node:fs";
import path from "node:path";
import { loadEnv, wallet, balance, Flashpoint, ENV_FILE } from "./flashpoint.mjs";
import { loadPanel, describePanel } from "./lib/panel.mjs";
import { HOME } from "./lib/setup.mjs";

loadEnv();
let bad = 0;
const ok = (m) => console.log(`  ok    ${m}`);
const no = (m, fix) => {
  bad += 1;
  console.log(`  FIX   ${m}\n        ${fix}`);
};

console.log("Litmus check (free, sends nothing)\n");

const [major] = process.versions.node.split(".").map(Number);
major >= 20 ? ok(`Node ${process.versions.node}`) : no(`Node ${process.versions.node} is too old`, "Install Node 20 or newer.");

fs.existsSync(ENV_FILE) ? ok(".env found") : no("No .env file", "Run `npm run wallet`, or create .env with FLASHPOINT_WALLET_KEY=0x... and ANTHROPIC_API_KEY=sk-ant-...");

if (process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant-")) ok("Anthropic key found");
else if (process.env.OPENAI_API_KEY) ok("OpenAI key found (Litmus will use OpenAI as the brain)");
else no("No AI key", "Add ANTHROPIC_API_KEY=sk-ant-... to .env (or OPENAI_API_KEY=sk-...).");

let account = null;
try {
  account = wallet();
  ok(`Wallet ${account.address}`);
} catch {
  no("No Flashpoint wallet key", "Put FLASHPOINT_WALLET_KEY=0x... in .env (from the funded wallet), or run `npm run wallet` and fund it.");
}

if (account) {
  try {
    const usdc = await balance();
    usdc >= 3 ? ok(`$${usdc.toFixed(2)} USDC on Base`) : no(`Only $${usdc.toFixed(2)} USDC on Base`, "Two rounds cost about $6. Get more Flashpoint credit.");
  } catch (err) {
    no("Could not read the wallet balance", String(err?.message ?? err).slice(0, 200));
  }
  try {
    const tools = await new Flashpoint().listTools();
    const names = tools.map((t) => t.name);
    names.includes("tool_survey")
      ? ok(`Signed in to Flashpoint MCP (${names.length} tools, tool_survey is there)`)
      : no("Flashpoint has no tool_survey", `It has: ${names.join(", ")}`);
    if (process.argv.includes("--details")) {
      console.log("\n  Flashpoint tools:");
      for (const t of tools) {
        const props = Object.entries(t.inputSchema?.properties ?? {}).map(([k, v]) => `${k}${(t.inputSchema?.required ?? []).includes(k) ? "*" : ""}:${v.type ?? "?"}`);
        console.log(`  - ${t.name}(${props.join(", ")})`);
        if (t.name === "tool_survey") console.log(`    ${String(t.description ?? "").replace(/\s+/g, " ").slice(0, 1200)}`);
      }
      console.log("");
    }
  } catch (err) {
    no("Could not sign in to Flashpoint", String(err?.message ?? err).slice(0, 300));
  }
}

const panelFile = path.join(HOME, "panel.csv");
try {
  const panel = loadPanel(panelFile);
  const facts = describePanel(panel);
  facts.people >= 5
    ? ok(`panel.csv has ${facts.people} people${panel.skipped.length ? ` (${panel.skipped.length} rows skipped: ${panel.skipped.join("; ")})` : ""}`)
    : no(`panel.csv has only ${facts.people} people`, "Add more people who agreed. 10 to 20 is a good size.");
} catch (err) {
  no("No usable panel.csv", `${err.message} Columns: name,email,year,school.`);
}

console.log(bad ? `\n${bad} thing${bad > 1 ? "s" : ""} to fix before a live run.` : "\nReady. Start with: npm start -- \"your objective\" --deadline 13:45");
process.exit(bad ? 1 : 0);
