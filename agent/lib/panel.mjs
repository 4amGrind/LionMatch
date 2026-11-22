// The email list. It is read here and only here.
// The AI agent never sees names or emails. It only sees counts and the
// columns that are not personal (like year and school).

import fs from "node:fs";

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PERSONAL = new Set(["name", "first_name", "last_name", "email", "phone"]);

// A small CSV parser that handles quoted fields.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

export function loadPanel(file, { max = 100 } = {}) {
  if (!fs.existsSync(file)) {
    throw new Error(`No email list at ${file}. Copy panel.example.csv to panel.csv and fill it in.`);
  }
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  if (rows.length < 2) throw new Error(`${file} has no people in it.`);
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  if (!header.includes("email")) throw new Error(`${file} needs an "email" column.`);
  const seen = new Set();
  const people = [];
  const skipped = [];
  for (const [i, r] of rows.slice(1).entries()) {
    const p = Object.fromEntries(header.map((h, j) => [h, (r[j] ?? "").trim()]));
    p.email = p.email.toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) {
      skipped.push(`row ${i + 2}: not an email`);
      continue;
    }
    if (seen.has(p.email)) {
      skipped.push(`row ${i + 2}: duplicate`);
      continue;
    }
    seen.add(p.email);
    people.push(p);
  }
  if (people.length > max) {
    throw new Error(`${file} has ${people.length} people. Flashpoint allows ${max} invitations a week, so keep it under that.`);
  }
  return { people, skipped, columns: header };
}

// What the AI agent is allowed to know about the list: counts only.
export function describePanel(panel) {
  const facts = { people: panel.people.length };
  for (const col of panel.columns) {
    if (PERSONAL.has(col)) continue;
    const counts = {};
    for (const p of panel.people) {
      const v = p[col] || "unknown";
      counts[v] = (counts[v] ?? 0) + 1;
    }
    facts[col] = counts;
  }
  return facts;
}

// The message that asks Flashpoint's survey agent to make the panel.
// This is the only place emails leave the laptop, and they go only to Flashpoint.
export function panelBrief(panel, panelName) {
  const extra = panel.columns.filter((c) => c !== "email" && c !== "name");
  const lines = panel.people.map((p) => {
    const bits = [p.name || "(no name)", p.email, ...extra.map((c) => `${c}: ${p[c] || "unknown"}`)];
    return `- ${bits.join(", ")}`;
  });
  return [
    `Please create a first-party panel named "${panelName}" and add these ${panel.people.length} members.`,
    `They are Columbia students who agreed to answer short surveys from us.`,
    extra.length ? `Keep these as member attributes: ${extra.join(", ")}.` : "",
    "",
    ...lines,
    "",
    "Do not repeat the email addresses back to me. Just tell me the panel is ready and how many members it has.",
  ]
    .filter((l, i) => l !== "" || i > 2)
    .join("\n");
}

// Hide every email and every name from the list before text reaches the AI
// agent, the terminal, or a file.
export function makeRedactor(panel) {
  const names = (panel?.people ?? [])
    .flatMap((p) => [p.name, p.first_name, p.last_name])
    .filter((n) => n && n.length >= 3)
    .sort((a, b) => b.length - a.length)
    .map((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"));
  return (text) => {
    let out = String(text).replace(EMAIL, "[email hidden]");
    for (const re of names) out = out.replace(re, "[name hidden]");
    return out;
  };
}

export function hasEmail(text) {
  EMAIL.lastIndex = 0;
  return EMAIL.test(String(text));
}
