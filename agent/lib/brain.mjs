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
