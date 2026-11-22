// The part that makes decisions. claudeBrain asks Claude. scriptedBrain plays
// back fixed steps so the tests can run with no keys and no network.

import Anthropic from "@anthropic-ai/sdk";

export function claudeBrain({ apiKey = process.env.ANTHROPIC_API_KEY, model = "claude-opus-5-5" } = {}) {
  if (!apiKey) throw new Error("No ANTHROPIC_API_KEY. Put ANTHROPIC_API_KEY=sk-ant-... in agent/.env.");
  const client = new Anthropic({ apiKey, maxRetries: 5 });
  return {
    name: model,
    async next({ system, tools, messages, forceFinish }) {
      const res = await client.messages.create({
        model,
        max_tokens: 16000,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        tools,
        tool_choice: forceFinish ? { type: "tool", name: "finish" } : { type: "auto" },
        messages,
      });
      return { content: res.content, stop: res.stop_reason };
    },
  };
}

// steps: an array of functions (lastResults) => [{ name, input }, ...]
export function scriptedBrain(steps) {
  let i = 0;
  let id = 0;
  return {
    name: "scripted test brain",
    async next({ messages, forceFinish }) {
      const last = messages[messages.length - 1];
      const results = Array.isArray(last.content) ? last.content.map((r) => r.content) : [last.content];
      let calls;
      if (forceFinish) calls = [{ name: "finish", input: { answer: "Forced finish.", confidence: "low", report_markdown: "Forced." } }];
      else calls = i < steps.length ? steps[i++](results) : [];
      return {
        content: calls.map((c) => ({ type: "tool_use", id: `t${++id}`, name: c.name, input: c.input })),
        stop: "tool_use",
      };
    },
  };
}

// Backup brain for teams with only an OpenAI key. Same tools, same loop.
// The loop keeps messages in Claude's format, so this converts both ways.
export function openaiBrain({ apiKey = process.env.OPENAI_API_KEY, model = process.env.LITMUS_OPENAI_MODEL ?? "gpt-5", fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error("No OPENAI_API_KEY.");
  const toOpenAI = (system, messages) => {
    const out = [{ role: "system", content: system }];
    for (const m of messages) {
      if (typeof m.content === "string") {
        out.push({ role: m.role, content: m.content });
      } else if (m.role === "assistant") {
        const text = m.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
        const calls = m.content
          .filter((b) => b.type === "tool_use")
          .map((b) => ({ id: b.id, type: "function", function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) } }));
        out.push({ role: "assistant", content: text || null, ...(calls.length ? { tool_calls: calls } : {}) });
      } else {
        for (const b of m.content) {
          if (b.type === "tool_result") out.push({ role: "tool", tool_call_id: b.tool_use_id, content: String(b.content) });
          else if (b.type === "text") out.push({ role: "user", content: b.text });
        }
      }
    }
    return out;
  };
  return {
    name: `${model} (OpenAI)`,
    async next({ system, tools, messages, forceFinish }) {
      const body = {
        model,
        messages: toOpenAI(system, messages),
        tools: tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } })),
        tool_choice: forceFinish ? { type: "function", function: { name: "finish" } } : "auto",
        max_completion_tokens: 16000,
      };
      let res;
      for (let attempt = 0; attempt < 5; attempt++) {
        res = await fetchImpl("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify(body),
        });
        if (res.status !== 429 && res.status < 500) break;
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
      const data = await res.json();
      if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${data?.error?.message ?? JSON.stringify(data).slice(0, 300)}`);
      const msg = data.choices[0].message;
      const content = [];
      if (msg.content) content.push({ type: "text", text: msg.content });
      for (const c of msg.tool_calls ?? []) {
        let input = {};
        try {
          input = JSON.parse(c.function.arguments || "{}");
        } catch {}
        content.push({ type: "tool_use", id: c.id, name: c.function.name, input });
      }
      return { content, stop: data.choices[0].finish_reason };
    },
  };
}
