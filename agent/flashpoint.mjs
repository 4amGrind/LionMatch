// Small Flashpoint MCP client.
// Signs in with a Base wallet, opens an MCP session, and pays for each tool
// call in USDC over x402. Based on the starter in the Flashpoint agent manual.
//
// CLI:
//   node flashpoint.mjs wallet              make (or show) the wallet address
//   node flashpoint.mjs balance             USDC balance on Base
//   node flashpoint.mjs tools               list Flashpoint tools (free)
//   node flashpoint.mjs call <tool> '<json>'  call one tool (may cost money)
//
// The private key lives in agent/.env as FLASHPOINT_WALLET_KEY.
// Never commit, print or share that file.

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { createPublicClient, http, erc20Abi, formatUnits } from "viem";
import { base } from "viem/chains";
import { Agent, setGlobalDispatcher } from "undici";

const BASE = process.env.FLASHPOINT_MCP_BASE ?? "https://api.flashpoint.ai";
const PV = "2025-06-18";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const ENV_FILE = fileURLToPath(new URL("./.env", import.meta.url));

// Survey and panel calls can take many minutes. Turn off undici's timeouts.
setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 }));

// Read agent/.env into process.env without overwriting what is already set.
export function loadEnv() {
  if (!fs.existsSync(ENV_FILE)) return;
  for (const line of fs.readFileSync(ENV_FILE, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, "");
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
loadEnv();

function loadKey() {
  const key = process.env.FLASHPOINT_WALLET_KEY;
  if (key && /^0x[0-9a-fA-F]{64}$/.test(key.trim())) return key.trim();
  return null;
}

// Returns the wallet account. Only creates a new key when create is true.
export function wallet({ create = false } = {}) {
  let key = loadKey();
  if (!key) {
    if (!create) {
      throw new Error("No wallet yet. Run `npm run wallet` first, then fund the address it prints.");
    }
    key = generatePrivateKey();
    const prefix = fs.existsSync(ENV_FILE) && !fs.readFileSync(ENV_FILE, "utf8").endsWith("\n") ? "\n" : "";
    fs.appendFileSync(ENV_FILE, `${prefix}FLASHPOINT_WALLET_KEY=${key}\n`, { mode: 0o600 });
    process.env.FLASHPOINT_WALLET_KEY = key;
  }
  return privateKeyToAccount(key);
}

export async function balance() {
  const client = createPublicClient({ chain: base, transport: http() });
  const raw = await client.readContract({
    address: USDC,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet().address],
  });
  return Number(formatUnits(raw, 6));
}

const post = (url, body, headers = {}, f = fetch) =>
  f(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

// Sign in and open an MCP session. Returns the headers to send with each call.
export async function connect() {
  const account = wallet();
  const ch = await (await post(`${BASE}/auth/wallet/challenge`)).json();
  const signature = await account.signMessage({ message: ch.message_to_sign });
  const res = await post(`${BASE}/auth/wallet/token`, {
    address: account.address,
    nonce: ch.nonce,
    signature,
  });
  if (res.status !== 200) throw new Error(`sign-in failed: HTTP ${res.status} ${await res.text()}`);
  const { token } = await res.json();
  const h = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": PV,
  };
  const init = await post(
    `${BASE}/mcp`,
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: PV, capabilities: {}, clientInfo: { name: "lionmatch-research-agent", version: "1" } },
    },
    h,
  );
  await init.text();
  h["Mcp-Session-Id"] = init.headers.get("mcp-session-id");
  await (await post(`${BASE}/mcp`, { jsonrpc: "2.0", method: "notifications/initialized" }, h)).text();
  h.paidFetch = wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [{ network: "eip155:*", client: new ExactEvmScheme(account) }],
  });
  return h;
}

class AuthExpired extends Error {}

async function rpc(h, method, params, f = fetch, onPaid) {
  const { paidFetch, ...headers } = h;
  const res = await post(`${BASE}/mcp`, { jsonrpc: "2.0", id: Date.now(), method, params }, headers, f);
  const receipt = res.headers.get("payment-response");
  if (receipt) {
    try {
      const { transaction, network } = JSON.parse(Buffer.from(receipt, "base64").toString());
      const scan = network === "eip155:84532" ? "https://sepolia.basescan.org" : "https://basescan.org";
      const url = `${scan}/tx/${transaction}`;
      console.error(`paid: ${url}`);
      onPaid?.(url);
    } catch {
      // A receipt we cannot read is not worth failing the call over.
    }
  }
  const text = await res.text();
  if (res.status === 401) throw new AuthExpired("session expired");
  if (res.status === 402) {
    let why = text;
    try {
      why = JSON.parse(text).error ?? text;
    } catch {}
    throw new Error(`payment failed: ${why}`);
  }
  const line = text
    .split("\n")
    .filter((l) => l.startsWith("data:"))
    .pop();
  let msg;
  try {
    msg = JSON.parse(line ? line.slice(5) : text);
  } catch {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  if (msg.error) throw new Error(msg.error.message ?? JSON.stringify(msg.error));
  return msg.result ?? msg;
}

function parseResult(result) {
  const text = result?.content?.[0]?.text;
  if (text === undefined) return result;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// A client that signs in once and signs in again when the 1 hour session ends.
export class Flashpoint {
  constructor({ onPaid } = {}) {
    this.h = null;
    this.onPaid = onPaid;
  }
  async ensure() {
    if (!this.h) this.h = await connect();
    return this.h;
  }
  async #withRetry(fn) {
    await this.ensure();
    try {
      return await fn(this.h);
    } catch (err) {
      if (!(err instanceof AuthExpired)) throw err;
      this.h = await connect();
      return await fn(this.h);
    }
  }
  callTool(name, args = {}, { onPaid } = {}) {
    const paid = onPaid ?? this.onPaid;
    return this.#withRetry(async (h) => parseResult(await rpc(h, "tools/call", { name, arguments: args }, h.paidFetch, paid)));
  }
  listTools() {
    return this.#withRetry(async (h) => (await rpc(h, "tools/list", {})).tools);
  }
}

// ---- CLI ----
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1]);
if (isMain) {
  const [cmd, ...rest] = process.argv.slice(2);
  try {
    if (cmd === "wallet") {
      const had = Boolean(loadKey());
      const account = wallet({ create: true });
      console.log(had ? "Your wallet (already set up):" : "Made a new wallet. The key is saved in agent/.env. Do not share that file.");
      console.log(`  address: ${account.address}`);
      console.log("Post this address (not the key) to get Flashpoint credit, then run `npm run balance`.");
    } else if (cmd === "balance") {
      console.log(`USDC on Base: $${(await balance()).toFixed(2)}  (${wallet().address})`);
    } else if (cmd === "tools") {
      const tools = await new Flashpoint().listTools();
      for (const t of tools) console.log(`- ${t.name}: ${(t.description ?? "").split("\n")[0]}`);
    } else if (cmd === "call") {
      const [name, json] = rest;
      const out = await new Flashpoint().callTool(name, json ? JSON.parse(json) : {});
      console.log(typeof out === "string" ? out : JSON.stringify(out, null, 2));
    } else {
      console.log("usage: node flashpoint.mjs wallet | balance | tools | call <tool> '<json>'");
    }
  } catch (err) {
    console.error(String(err?.message ?? err));
    process.exit(1);
  }
}
