// Fixed steps for the test brain. Used by the tests and by `--mock --scripted`.
// Even this script reads round 1 results and builds round 2 from the top answer,
// so the tests check the learn-and-follow-up path end to end.

// The top answer to the first question in a results reply.
function topOption(text) {
  const q1 = String(text).split(/\nQ2\./)[0];
  const rows = [...q1.matchAll(/^\s*- (.+?): (\d+) \((\d+)%\)/gm)].map((m) => ({ option: m[1], n: Number(m[2]), pct: Number(m[3]) }));
  rows.sort((a, b) => b.n - a.n);
  return rows[0] ?? { option: "the first option", n: 0, pct: 0 };
}

export function demoSteps() {
  let round1 = "";
  let round2 = "";
  return [
    () => [
      { name: "read_context", input: {} },
      { name: "note", input: { decision: "Test which feature first-years want most, then dig into the winner.", reason: "Two rounds fit the time. Round 1 ranks options, round 2 explains the top one." } },
    ],
    () => [{ name: "start_round", input: { goal: "Find which feature first-years want most" } }],
    () => [{ name: "create_panel_from_list", input: { panel_name: "Columbia student testers" } }],
    () => [
      {
        name: "flashpoint_survey",
        input: {
          message: [
            'Please draft a survey titled "What should LionMatch build next?" with these questions:',
            "1. Which would you use most? Options: Deadline reminders / Club fair mode / Alumni coffee chats / Resume tips",
            "2. How often would you open LionMatch? Options: Daily / Weekly / Only near deadlines / Never",
            "3. What would stop you from using it?",
          ].join("\n"),
        },
      },
    ],
    () => [{ name: "flashpoint_survey", input: { message: "confirm" } }],
    () => [{ name: "flashpoint_survey", input: { message: 'Send it to the panel "Columbia student testers".' } }],
    () => [{ name: "flashpoint_survey", input: { message: "confirm" } }],
    () => [{ name: "wait", input: { minutes: 15, reason: "Give people time to open the email." } }],
    () => [{ name: "flashpoint_survey", input: { message: "How many responses so far, and what are the results?" } }],
    (results) => {
      round1 = results[0];
      const top = topOption(round1);
      return [
        { name: "note", input: { decision: `Round 2 digs into "${top.option}".`, reason: `It led round 1 with ${top.n} votes (${top.pct}%).` } },
        { name: "start_round", input: { goal: `Find what makes "${top.option}" worth using`, builds_on: `"${top.option}" led round 1 with ${top.pct}%.` } },
      ];
    },
    () => {
      const top = topOption(round1);
      return [
        {
          name: "flashpoint_survey",
          input: {
            message: [
              `Please draft a follow-up survey titled "More on ${top.option}" with these questions:`,
              `1. What matters most for ${top.option}? Options: Speed / Accuracy / Privacy / Works on my phone`,
              "2. Would you use it this week? Options: Yes / Maybe / No",
            ].join("\n"),
            new_conversation: false,
          },
        },
      ];
    },
    () => [{ name: "flashpoint_survey", input: { message: "confirm" } }],
    () => [{ name: "flashpoint_survey", input: { message: "Send it to the same panel." } }],
    () => [{ name: "flashpoint_survey", input: { message: "confirm" } }],
    () => [{ name: "wait", input: { minutes: 15, reason: "Same wait as round 1." } }],
    () => [{ name: "flashpoint_survey", input: { message: "Show me the results so far." } }],
    (results) => {
      round2 = results[0];
      const a = topOption(round1);
      const b = topOption(round2);
      return [
        {
          name: "finish",
          input: {
            answer: `Build ${a.option} first. It led round 1 with ${a.pct}%, and in round 2 people said ${b.option} matters most for it.`,
            confidence: "low",
            report_markdown: `## Round 1\n\n${round1}\n\n## Round 2\n\n${round2}\n`,
          },
        },
      ];
    },
  ];
}
