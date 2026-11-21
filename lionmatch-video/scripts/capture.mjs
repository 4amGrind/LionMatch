// Captures authentic LionMatch screens from a locally running copy of the app.
// It drives real interactions (swipes, resume import, outreach) with Playwright.
//
//   1. In the app folder: npm run dev   (http://localhost:3000)
//   2. Here:              npm run capture
//
// Screens land in public/screens. Every run starts from a clean browser profile,
// so nothing from your own browser (swipes, chats, edits) leaks into the film.

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const OUT = path.resolve("public/screens");
const W = 402;
const H = 874;
const DPR = 3;
fs.mkdirSync(OUT, { recursive: true });

const CHROME =
  process.env.CHROME_PATH ??
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1254/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const browser = await chromium.launch(fs.existsSync(CHROME) ? { executablePath: CHROME } : {});

// Hide the Next.js dev badge and the team's dashed "Owner" notes. Neither is part of the product.
const CLEAN_CSS = `nextjs-portal{display:none!important} *{caret-color:transparent!important}`;
async function clean(page) {
  await page.addStyleTag({ content: CLEAN_CSS });
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("div,p")) {
      if (el.textContent?.trim().startsWith("Owner:") && el.className.includes("border-dashed")) el.remove();
    }
  });
}

async function newPage(theme, height = H) {
  const ctx = await browser.newContext({ viewport: { width: W, height }, deviceScaleFactor: DPR, colorScheme: theme });
  await ctx.addInitScript((t) => localStorage.setItem("ct.theme", t), theme);
  const page = await ctx.newPage();
  // A fixed afternoon clock, so timestamps in History and Chats look normal. Timers still run.
  await page.clock.setFixedTime(new Date("2026-11-20T15:42:00"));
  return { ctx, page };
}

async function go(page, route) {
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await clean(page);
  await page.waitForTimeout(700);
}

async function shot(page, name) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log("captured", name);
}

/** Scroll the app's inner scroll area (the page itself never scrolls). */
async function scrollTo(page, y) {
  await page.evaluate((top) => {
    const areas = [...document.querySelectorAll("*")].filter((el) => {
      const s = getComputedStyle(el);
      return (s.overflowY === "auto" || s.overflowY === "scroll") && el.scrollHeight > el.clientHeight;
    });
    for (const a of areas) a.scrollTo({ top, behavior: "instant" });
  }, y);
  await page.waitForTimeout(400);
}

async function scrollToText(page, text, offset = 120) {
  await page.evaluate(
    ({ text, offset }) => {
      const el = [...document.querySelectorAll("h1,h2,h3,span,p,button")].find((e) => e.textContent?.trim() === text);
      if (!el) return;
      const area = [...document.querySelectorAll("*")].find((a) => {
        const s = getComputedStyle(a);
        return (s.overflowY === "auto" || s.overflowY === "scroll") && a.contains(el) && a.scrollHeight > a.clientHeight;
      });
      if (!area) return;
      const top = el.getBoundingClientRect().top - area.getBoundingClientRect().top + area.scrollTop - offset;
      area.scrollTo({ top, behavior: "instant" });
    },
    { text, offset },
  );
  await page.waitForTimeout(400);
}

/** Where an element sits inside the scroll area, as a scrollTop that puts it `offset` px below the top. */
async function scrollTopFor(page, text, offset) {
  return page.evaluate(
    ({ text, offset }) => {
      const el = [...document.querySelectorAll("h1,h2,h3,span,p,button,dt,div")].find((e) => e.childElementCount === 0 && e.textContent?.trim() === text);
      const area = [...document.querySelectorAll("div")].find((a) => getComputedStyle(a).overflowY === "auto" && a.scrollHeight > a.clientHeight);
      if (!el || !area) return 0;
      const top = el.getBoundingClientRect().top - area.getBoundingClientRect().top + area.scrollTop - offset;
      return Math.max(0, Math.min(top, area.scrollHeight - area.clientHeight));
    },
    { text, offset },
  );
}

/**
 * A real scroll, one screenshot per film frame (60 fps), eased in and out.
 * The film plays these back frame for frame, so the wallpaper stays fixed and the header stays sticky, as in the app.
 */
async function captureScroll(page, name, toY, frames) {
  await page.waitForTimeout(900); // Let the nav highlight finish moving.
  const dir = path.join(OUT, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  for (let i = 0; i < frames; i++) {
    const y = Math.round(toY * ease(i / (frames - 1)) * 3) / 3;
    await page.evaluate((top) => {
      const area = [...document.querySelectorAll("div")].find((a) => getComputedStyle(a).overflowY === "auto" && a.scrollHeight > a.clientHeight);
      area?.scrollTo({ top, behavior: "instant" });
    }, y);
    await page.screenshot({ path: path.join(dir, `${String(i).padStart(3, "0")}.jpg`), type: "jpeg", quality: 90 });
  }
  console.log("captured scroll", name, frames, "frames to", toY);
}

const deckLog = [];
async function topCardTitle(page) {
  return page.evaluate(() => {
    const titles = [...document.querySelectorAll("h2.deck-title")];
    return titles.at(-1)?.textContent ?? null;
  });
}

for (const theme of ["light", "dark"]) {
  let { ctx, page } = await newPage(theme);

  // --- Swipe deck, fresh profile.
  await go(page, "/");
  await shot(page, `${theme}-deck-0`);

  if (theme === "light") {
    // Measurements of the deck layout, so the film can draw live cards exactly where the app does.
    const layout = await page.evaluate(() => {
      const r = (el) => {
        const b = el.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height };
      };
      const articles = [...document.querySelectorAll("article")];
      const top = articles.at(-1);
      const chips = document.querySelector("button[aria-pressed]")?.parentElement;
      const toGo = [...document.querySelectorAll("p")].find((p) => p.textContent?.includes("to go"));
      return {
        article: top ? r(top) : null,
        deckArea: top ? r(top.parentElement) : null,
        chips: chips ? r(chips) : null,
        chipButtons: chips ? [...chips.querySelectorAll("button")].map((b) => ({ text: b.textContent, ...r(b) })) : [],
        toGo: toGo ? r(toGo) : null,
        header: r(document.querySelector("header")),
      };
    });
    fs.writeFileSync(path.join(OUT, "deck-layout.json"), JSON.stringify(layout, null, 2));
    // The deck page with the counter, chips and cards hidden: the frame the film draws live cards into.
    await page.addStyleTag({ content: `article, .deck-chrome-hide { visibility: hidden !important; }` });
    await page.evaluate(() => {
      const chips = document.querySelector("button[aria-pressed]")?.parentElement;
      chips?.classList.add("deck-chrome-hide");
      const toGo = [...document.querySelectorAll("p")].find((p) => p.textContent?.includes("to go"));
      toGo?.parentElement?.classList.add("deck-chrome-hide");
    });
    await shot(page, "light-deck-chrome");
    // The same frame with the header's crown and name hidden: the film flies the logo into that spot.
    await page.addStyleTag({ content: `header > a { visibility: hidden !important; }` });
    await shot(page, "light-deck-chrome-noheader");
    const brand = await page.evaluate(() => {
      const a = document.querySelector("header > a");
      const crown = a.querySelector("span");
      const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
      return { link: r(a), crown: r(crown), fontSize: parseFloat(getComputedStyle(a).fontSize) };
    });
    fs.writeFileSync(path.join(OUT, "header-brand.json"), JSON.stringify(brand, null, 2));
    await page.reload({ waitUntil: "networkidle" });
    await clean(page);
    await page.waitForTimeout(600);
  }

  if (theme === "light") {
    // Real swipes with the keyboard shortcuts: right = Interested, left = Pass, up = Save.
    const moves = ["ArrowRight", "ArrowRight", "ArrowLeft", "ArrowUp", "ArrowRight", "ArrowLeft", "ArrowRight"];
    for (const [i, key] of moves.entries()) {
      deckLog.push({ before: await topCardTitle(page), key });
      await page.keyboard.press(key);
      await page.waitForTimeout(key === "ArrowRight" ? 3200 : 1400);
      await clean(page);
      await shot(page, `light-deck-${i + 1}`);
    }
    fs.writeFileSync(path.join(OUT, "deck-log.json"), JSON.stringify(deckLog, null, 2));
    fs.writeFileSync(
      path.join(OUT, "deck-after-swipes.txt"),
      await page.evaluate(() => document.body.innerText),
    );

    // --- History: what the deck learned from those swipes.
    await go(page, "/history");
    await shot(page, "light-history");
    await scrollTo(page, 520);
    await shot(page, "light-history-2");

    await ctx.close();

    // A second clean session, so details and outreach show the same scores as the fresh deck.
    ({ ctx, page } = await newPage(theme));
    // --- Explore, default and with a search.
    await go(page, "/explore");
    await shot(page, "light-explore");
    await page.getByPlaceholder(/Search/).fill("robotics");
    await page.waitForTimeout(600);
    await shot(page, "light-explore-robotics");
    await page.getByPlaceholder(/Search/).fill("");
    await page.getByRole("tab", { name: /^People/ }).click();
    await page.waitForTimeout(600);
    await shot(page, "light-explore-people");

    // --- An opportunity's details and prerequisites.
    await go(page, "/opportunities/research-nlp");
    await shot(page, "light-detail-nlp");
    await captureScroll(page, "scroll-detail-nlp", await scrollTopFor(page, "Someone to talk to", 470), 96);
    await shot(page, "light-detail-nlp-2");
    await go(page, "/opportunities/internship-google-swe");
    await shot(page, "light-detail-google");

    // --- A person, then the outreach box, then send the coffee chat into the chat.
    await go(page, "/people/sample-hana-kim");
    await shot(page, "light-person-hana");
    await captureScroll(page, "scroll-person-hana", await scrollTopFor(page, "Reach out", 40), 84);
    await scrollToText(page, "Reach out", 40);
    await shot(page, "light-person-hana-outreach");
    // Where things are, for the film's typing reveal and button press.
    const rects = await page.evaluate(() => {
      const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
      const ta = document.querySelector("textarea");
      const cs = getComputedStyle(ta);
      const send = [...document.querySelectorAll("button")].find((b) => b.textContent === "Send in chat");
      return { textarea: r(ta), padding: parseFloat(cs.paddingTop), paddingLeft: parseFloat(cs.paddingLeft), lineHeight: parseFloat(cs.lineHeight), send: r(send), message: ta.value };
    });
    fs.writeFileSync(path.join(OUT, "outreach-layout.json"), JSON.stringify(rects, null, 2));
    // The same view with the message box empty, so the film can type the real message over it.
    const message = rects.message;
    await page.locator("textarea").fill("");
    await page.locator("textarea").blur();
    await shot(page, "light-person-hana-outreach-empty");
    await page.locator("textarea").fill(message);
    await page.locator("textarea").blur();
    await page.getByRole("button", { name: "Send in chat" }).click();
    await page.waitForURL(/\/chats\//);
    await clean(page);
    await page.waitForTimeout(500);
    await shot(page, "light-chat-hana-sent");
    await page.waitForTimeout(5000); // The sample person's scripted reply arrives after a pause.
    await clean(page);
    await shot(page, "light-chat-hana");
    fs.writeFileSync(path.join(OUT, "chat-hana.txt"), await page.evaluate(() => document.body.innerText));

    await ctx.close();

    // A third clean session for profile, preferences and the resume import.
    ({ ctx, page } = await newPage(theme));
    // --- Profile.
    await go(page, "/profile");
    await shot(page, "light-profile");

    // --- Preferences, and a resume import using a made-up resume (see scripts/sample-resume.html).
    await go(page, "/preferences");
    await shot(page, "light-preferences");
    const pdfPage = await ctx.newPage();
    await pdfPage.goto("file://" + path.resolve("scripts/sample-resume.html"));
    const pdfPath = path.resolve("screenshots/sample-resume.pdf");
    await pdfPage.pdf({ path: pdfPath, format: "Letter", printBackground: true });
    await pdfPage.setViewportSize({ width: 816, height: 1056 });
    await pdfPage.screenshot({ path: path.join(OUT, "sample-resume.png") });
    await pdfPage.close();
    await page.getByRole("button", { name: /Import from your resume/ }).click();
    await page.waitForTimeout(400);
    await page.locator("input[type=file]").setInputFiles(pdfPath);
    await page.getByText(/Add \d+ to the form/).waitFor({ timeout: 15000 });
    await clean(page);
    await shot(page, "light-resume-found");
    const foundTags = await page.evaluate(() => {
      const card = [...document.querySelectorAll("h2")].find((h) => h.textContent === "Import from your resume")?.closest("div.glass-surface, div");
      const box = card?.parentElement?.parentElement ?? document.body;
      return [...box.querySelectorAll("button")]
        .filter((b) => b.closest("ul, div") && b.getAttribute("aria-pressed") !== null)
        .map((b) => { const r = b.getBoundingClientRect(); return { text: b.textContent.trim(), x: r.x, y: r.y, w: r.width, h: r.height }; });
    });
    fs.writeFileSync(path.join(OUT, "resume-tags.json"), JSON.stringify(foundTags, null, 2));
    fs.writeFileSync(path.join(OUT, "resume-found.txt"), await page.evaluate(() => document.body.innerText));
    await page.getByText(/Add \d+ to the form/).click();
    await page.waitForTimeout(600);
    await scrollToText(page, "Skills", 40);
    await shot(page, "light-preferences-after");
  } else {
    await go(page, "/explore");
    await shot(page, "dark-explore");
    await go(page, "/opportunities/research-nlp");
    await shot(page, "dark-detail-nlp");
    await go(page, "/people/sample-hana-kim");
    await scrollToText(page, "Reach out", 40);
    await shot(page, "dark-person-hana-outreach");
    await go(page, "/history");
    await shot(page, "dark-history");
  }
  await ctx.close();
}

await browser.close();
