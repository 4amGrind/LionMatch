// Composes and mixes the film's soundtrack from scratch: an original score plus sound effects,
// all synthesized here, so there is nothing to license. Deterministic: same input, same file.
//
//   npm run audio   ->  public/audio/score.wav (music + effects, loudness-normalized)
//
// 100 BPM, so one beat is 0.6 s (36 frames at 60 fps). Cue frames below match the scenes in src/scenes.

import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import ffmpeg from "ffmpeg-static";

const SR = 48000;
const DUR = 86.4 + 0.6;
const N = Math.ceil(SR * DUR);
const BEAT = 0.6;
const BAR = BEAT * 4;
const f2s = (frame) => frame / 60;

// Buses.
const music = [new Float32Array(N), new Float32Array(N)];
const sfx = [new Float32Array(N), new Float32Array(N)];
const verbSend = [new Float32Array(N), new Float32Array(N)];
const delaySend = [new Float32Array(N), new Float32Array(N)];
const kickEnv = new Float32Array(N); // for sidechain ducking

let seed = 20261121;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const NOTE = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
const n = (name) => {
  const m = name.match(/^([A-G]#?)(-?\d)$/);
  return midi(NOTE[m[1]] + (Number(m[2]) + 1) * 12);
};

function add(bus, i, l, r) {
  if (i < 0 || i >= N) return;
  bus[0][i] += l;
  bus[1][i] += r;
}
const panLR = (p) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)];

// --- Instruments --------------------------------------------------------------------------

/** Warm pad: detuned saws through a gentle low-pass, slow attack and release. */
function pad(freqs, t0, dur, amp, cutoff = 1400, opts = {}) {
  const att = opts.attack ?? 1.2;
  const rel = opts.release ?? 2.2;
  const start = Math.floor(t0 * SR);
  const len = Math.floor((dur + rel) * SR);
  const voices = [];
  for (const f of freqs) for (const det of [-0.11, 0, 0.12]) voices.push({ f: f * Math.pow(2, det / 12), ph: Math.abs(rand()), pan: rand() * 0.7 });
  let lpL = 0;
  let lpR = 0;
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const env = Math.min(1, t / att) * (t > dur ? Math.max(0, 1 - (t - dur) / rel) : 1);
    if (env <= 0 && t > dur) break;
    let l = 0;
    let r = 0;
    for (const v of voices) {
      v.ph += v.f / SR;
      if (v.ph >= 1) v.ph -= 1;
      const s = 2 * v.ph - 1;
      const [pl, pr] = panLR(v.pan);
      l += s * pl;
      r += s * pr;
    }
    const cut = (opts.cutoffAt ? opts.cutoffAt(t0 + t) : cutoff) / SR;
    const a = 1 - Math.exp(-2 * Math.PI * cut);
    lpL += a * (l - lpL);
    lpR += a * (r - lpR);
    const g = (amp * env) / voices.length;
    add(music, start + k, lpL * g, lpR * g);
    add(verbSend, start + k, lpL * g * 0.5, lpR * g * 0.5);
  }
}

/** Electric-piano pluck: two-operator FM, soft. */
function pluck(f, t0, amp, pan = 0, opts = {}) {
  const start = Math.floor(t0 * SR);
  const dec = opts.decay ?? 0.55;
  const len = Math.floor(dec * 5 * SR);
  const [pl, pr] = panLR(pan);
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const env = Math.exp(-t / dec) * Math.min(1, t / 0.003);
    const idx = 1.8 * Math.exp(-t / 0.12);
    const s = Math.sin(2 * Math.PI * f * t + idx * Math.sin(2 * Math.PI * f * 2 * t)) * 0.8 + Math.sin(2 * Math.PI * f * 2 * t) * 0.08 * Math.exp(-t / 0.08);
    const v = s * env * amp;
    add(music, start + k, v * pl, v * pr);
    add(delaySend, start + k, v * pl * 0.35, v * pr * 0.35);
    add(verbSend, start + k, v * pl * 0.25, v * pr * 0.25);
  }
}

/** Bell: inharmonic FM with a long tail. */
function bell(f, t0, amp, pan = 0, dec = 2.4, bus = music) {
  const start = Math.floor(t0 * SR);
  const len = Math.floor(dec * 4 * SR);
  const [pl, pr] = panLR(pan);
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const env = Math.exp(-t / dec) * Math.min(1, t / 0.002);
    const idx = 2.2 * Math.exp(-t / 0.5);
    const s = Math.sin(2 * Math.PI * f * t + idx * Math.sin(2 * Math.PI * f * 3.5 * t));
    const v = s * env * amp;
    add(bus, start + k, v * pl, v * pr);
    add(verbSend, start + k, v * pl * 0.6, v * pr * 0.6);
  }
}

function kick(t0, amp = 0.8) {
  const start = Math.floor(t0 * SR);
  const len = Math.floor(0.5 * SR);
  let ph = 0;
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const f = 50 + 90 * Math.exp(-t / 0.03);
    ph += f / SR;
    const env = Math.exp(-t / 0.15);
    const click = rand() * Math.exp(-t / 0.002) * 0.15;
    const v = (Math.sin(2 * Math.PI * ph) * env + click) * amp;
    add(music, start + k, v, v);
    kickEnv[start + k] = Math.max(kickEnv[start + k] ?? 0, Math.exp(-t / 0.18));
  }
}

function hat(t0, amp = 0.12, open = false) {
  const start = Math.floor(t0 * SR);
  const dec = open ? 0.12 : 0.035;
  const len = Math.floor(dec * 6 * SR);
  let prev = 0;
  let hp2 = 0;
  const pan = 0.25;
  const [pl, pr] = panLR(pan);
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const w = rand();
    const hp = w - prev;
    prev = w;
    hp2 = hp - hp2 * 0.2;
    const v = hp2 * Math.exp(-t / dec) * amp;
    add(music, start + k, v * pl, v * pr);
  }
}

function snap(t0, amp = 0.18) {
  const start = Math.floor(t0 * SR);
  const len = Math.floor(0.4 * SR);
  let bp1 = 0;
  let bp2 = 0;
  const f = 1800 / SR;
  const q = 0.35;
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const x = rand();
    // State-variable band-pass.
    const hp = x - bp2 - q * bp1;
    bp1 += 2 * Math.sin(Math.PI * f) * hp;
    bp2 += 2 * Math.sin(Math.PI * f) * bp1;
    const env = Math.exp(-t / 0.07) + 0.4 * Math.exp(-Math.max(0, t - 0.012) / 0.05) * (t > 0.012 ? 1 : 0);
    const v = bp1 * env * amp;
    add(music, start + k, v, v);
    add(verbSend, start + k, v * 0.5, v * 0.5);
  }
}

function bass(f, t0, dur, amp = 0.32) {
  const start = Math.floor(t0 * SR);
  const len = Math.floor((dur + 0.08) * SR);
  let lp = 0;
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.008) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.08) : 1) * (0.75 + 0.25 * Math.exp(-t / 0.15));
    const s = Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2 * t) + 0.12 * Math.sin(2 * Math.PI * f * 3 * t);
    lp += 0.2 * (s - lp);
    const v = lp * env * amp;
    add(music, start + k, v, v);
  }
}

/** Filtered noise sweep. from/to are band-pass centre frequencies in Hz. */
function whoosh(t0, dur, from, to, amp = 0.2, pan = 0, bus = sfx, shape = "swell") {
  const start = Math.floor(t0 * SR);
  const len = Math.floor(dur * SR);
  let bp1 = 0;
  let bp2 = 0;
  const [pl, pr] = panLR(pan);
  for (let k = 0; k < len; k++) {
    const t = k / len;
    const fc = from * Math.pow(to / from, t);
    const f = Math.min(0.45, fc / SR);
    const x = rand();
    const hp = x - bp2 - 0.6 * bp1;
    bp1 += 2 * Math.sin(Math.PI * f) * hp;
    bp2 += 2 * Math.sin(Math.PI * f) * bp1;
    const env = shape === "riser" ? Math.pow(t, 2.2) * (t > 0.97 ? (1 - t) / 0.03 : 1) : Math.sin(Math.PI * Math.pow(t, 0.7)) ** 2;
    const v = bp1 * env * amp;
    add(bus, start + k, v * pl, v * pr);
    add(verbSend, start + k, v * pl * 0.4, v * pr * 0.4);
  }
}

/** A soft UI click: short pitched blip with a breath of noise. */
function click(t0, amp = 0.16, f = 2400, pan = 0) {
  const start = Math.floor(t0 * SR);
  const len = Math.floor(0.08 * SR);
  const [pl, pr] = panLR(pan);
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const s = Math.sin(2 * Math.PI * f * t * (1 - t * 2)) * Math.exp(-t / 0.012) + rand() * 0.25 * Math.exp(-t / 0.004);
    const v = s * amp;
    add(sfx, start + k, v * pl, v * pr);
    add(verbSend, start + k, v * pl * 0.15, v * pr * 0.15);
  }
}

/** Sine "ping" for the match links. */
function ping(f, t0, amp = 0.14, pan = 0) {
  bell(f, t0, amp, pan, 0.7, sfx);
}

function boom(t0, amp = 0.7) {
  const start = Math.floor(t0 * SR);
  const len = Math.floor(2.6 * SR);
  let ph = 0;
  let lp = 0;
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const f = 46 + 34 * Math.exp(-t / 0.15);
    ph += f / SR;
    const noise = rand();
    lp += 0.02 * (noise - lp);
    const v = (Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.55) * 0.8 + lp * 3 * Math.exp(-t / 0.3)) * amp;
    add(sfx, start + k, v, v);
    add(verbSend, start + k, v * 0.25, v * 0.25);
  }
}

// --- Harmony -----------------------------------------------------------------------------

const CH = {
  D: { bass: "D2", pad: ["D3", "A3", "C#4", "E4", "F#4"], arp: ["A4", "C#5", "E5", "F#5", "A5", "E5", "C#5", "F#5"] },
  Bm: { bass: "B1", pad: ["B2", "F#3", "A3", "D4", "E4"], arp: ["F#4", "A4", "D5", "E5", "F#5", "D5", "A4", "E5"] },
  G: { bass: "G1", pad: ["G2", "D3", "F#3", "B3", "C#4"], arp: ["D4", "F#4", "B4", "C#5", "D5", "B4", "F#4", "C#5"] },
  A: { bass: "A1", pad: ["A2", "E3", "F#3", "B3", "E4"], arp: ["E4", "A4", "B4", "E5", "F#5", "E5", "B4", "A4"] },
};
const PROG = ["D", "Bm", "G", "A"];
const chordAt = (bar) => CH[PROG[((bar % 4) + 4) % 4]];

// Sections, in bars (2.4 s each). Scenes: 0-3 problem, 4-6 reveal, 7-10 product, 11-15.5 swipe,
// 15.5-21 match, 21-25 profile, 25-30 connect, 30-33 montage, 33-36 end.
const TOTAL_BARS = 36;
function section(bar) {
  if (bar < 4) return "intro";
  if (bar < 7) return "reveal";
  if (bar < 11) return "grooveA";
  if (bar < 16) return "grooveB";
  if (bar < 18) return "breakdown";
  if (bar < 21) return "grooveA";
  if (bar < 25) return "grooveA";
  if (bar < 30) return "grooveB";
  if (bar < 32) return "peak";
  if (bar < 33) return "fall";
  return "outro";
}

// Pads: one long pad per bar, bar by bar, so the filter can follow the story.
for (let bar = 0; bar < TOTAL_BARS; bar++) {
  const sec = section(bar);
  const t0 = bar * BAR;
  let chord = chordAt(bar);
  if (sec === "intro") chord = bar < 2 ? CH.D : bar === 2 ? CH.Bm : CH.G;
  if (sec === "reveal") chord = bar === 4 ? CH.A : bar === 5 ? CH.D : CH.G;
  if (sec === "outro") chord = CH.D;
  const amp = { intro: 0.16 + bar * 0.03, reveal: 0.24, grooveA: 0.2, grooveB: 0.22, breakdown: 0.26, peak: 0.26, fall: 0.22, outro: 0.26 }[sec];
  const cutoff = { intro: 500 + bar * 180, reveal: 1300, grooveA: 1500, grooveB: 1900, breakdown: 1100, peak: 2600, fall: 1500, outro: 1600 }[sec];
  if (sec === "outro" && bar > 33) continue; // one long outro chord instead
  const dur = sec === "outro" ? 6.2 : BAR;
  pad(chord.pad.map(n), t0, dur, amp, cutoff, { attack: bar === 0 ? 3 : 0.5, release: sec === "outro" ? 4.5 : 1.4 });
}

// Bass, drums, arpeggio.
for (let bar = 0; bar < TOTAL_BARS; bar++) {
  const sec = section(bar);
  const t0 = bar * BAR;
  const chord = chordAt(bar);
  const drums = ["grooveA", "grooveB", "peak"].includes(sec);
  const full = ["grooveB", "peak"].includes(sec);
  if (drums) {
    for (let b = 0; b < 4; b++) {
      const tb = t0 + b * BEAT;
      if (b === 0 || b === 2 || (full && b === 3 && bar % 2 === 1)) kick(tb + (b === 3 ? BEAT / 2 : 0), 0.62);
      if (full && (b === 1 || b === 3)) snap(tb, 0.11);
      hat(tb + BEAT / 2, 0.085);
      if (full) {
        hat(tb + BEAT / 4, 0.035);
        hat(tb + (3 * BEAT) / 4, 0.04);
      }
    }
    // Bass: root on 1, a push on the and of 2, octave on 4.
    const r = n(chord.bass);
    bass(r, t0, BEAT * 1.2, 0.22);
    bass(r, t0 + BEAT * 1.5, BEAT * 0.8, 0.19);
    bass(r * 2, t0 + BEAT * 3, BEAT * 0.45, 0.15);
    bass(r, t0 + BEAT * 3.5, BEAT * 0.4, 0.17);
  }
  if (sec === "breakdown" || sec === "reveal" || sec === "fall") {
    bass(n(chord.bass) * 2, t0, BAR * 0.95, 0.08);
  }
  // Arpeggio: eighths in grooves, sixteenths at the peak, sparse in breakdown.
  if (["grooveA", "grooveB", "peak", "breakdown"].includes(sec)) {
    const steps = sec === "peak" ? 16 : 8;
    for (let s = 0; s < steps; s++) {
      if (sec === "breakdown" && s % 2 === 1) continue;
      const note = chord.arp[s % chord.arp.length];
      const f = n(note) * (sec === "peak" && s % 4 === 3 ? 2 : 1);
      const amp = (sec === "peak" ? 0.06 : 0.075) * (s % 4 === 0 ? 1.2 : 1);
      pluck(f, t0 + (s * BAR) / steps, amp, Math.sin(s * 1.3) * 0.5);
    }
  }
}

// Intro shimmer: high bell notes falling like the fragments.
[0.9, 2.1, 3.3, 4.2, 5.4, 6.3, 7.5].forEach((t, i) => bell(n(["F#5", "A5", "E5", "C#6", "A5", "F#5", "E6"][i]), t, 0.035, Math.sin(i * 2) * 0.6, 2.6));

// --- Effects, on cue -----------------------------------------------------------------------

// 1. Problem: fragments appear, text, then everything collapses into the point.
whoosh(f2s(60), 2.2, 300, 1800, 0.05, -0.2);
whoosh(f2s(170), 4.0, 900, 300, 0.04, 0.3);
whoosh(f2s(440), f2s(576 - 440) + 0.05, 200, 4200, 0.16, 0, sfx, "riser");

// 2. Reveal: the ring breathes, the crown lands on the downbeat, the logo flies into the phone.
ping(n("A5"), f2s(578), 0.06);
whoosh(f2s(600), 2.0, 2400, 800, 0.035, 0.2);
boom(f2s(720), 0.55);
CH.D.pad.forEach((note, i) => bell(n(note) * 2, f2s(720) + i * 0.018, 0.05, (i - 2) * 0.25, 3.2));
whoosh(f2s(872), 2.0, 2000, 500, 0.08, 0);
click(f2s(998), 0.1, 1800);

// 3. Product: each filter chip tap, on the beat.
[1296, 1332, 1368, 1404, 1440, 1476].forEach((f, i) => {
  click(f2s(f), 0.09, 2200 + i * 120, 0.2);
  pluck(n(["D5", "E5", "F#5", "A5", "B5", "D6"][i]), f2s(f), 0.05, 0.3, { decay: 0.4 });
});

// 4. Swipes: finger down, the throw, and the strong-match sparkle.
const SWIPES = [
  { start: 1670, release: 1692, pan: 0 },
  { start: 1738, release: 1764, pan: 0.5 },
  { start: 1816, release: 1836, pan: -0.5 },
];
for (const s of SWIPES) {
  click(f2s(s.start), 0.07, 1500, s.pan * 0.3);
  whoosh(f2s(s.release) - 0.06, 0.42, 600, 3800, 0.2, s.pan);
}
[n("D6"), n("F#6"), n("A6"), n("D7")].forEach((f, i) => bell(f, f2s(1764) + 0.05 + i * 0.06, 0.035, 0.3 - i * 0.2, 1.2, sfx));
for (let i = 0; i < 14; i++) click(f2s(1764) + 0.08 + Math.abs(rand()) * 0.9, 0.025, 3500 + Math.abs(rand()) * 2500, rand());
// The breakout: the card lifts into the room.
whoosh(f2s(1944), 1.4, 250, 2200, 0.1, 0.4);
pad([n("A4"), n("E5")], f2s(1944), 1.2, 0.05, 2200, { attack: 0.4, release: 1.5 });

// 5. Match: the score lifts off, each link lands, it adds up, the deck re-ranks.
whoosh(f2s(2238), 1.0, 1800, 600, 0.06, 0);
click(f2s(2304), 0.06, 1600);
[2376, 2394, 2448, 2466, 2520].forEach((f, i) => ping(n(["D5", "F#5", "A5", "B5", "D6"][i]), f2s(f), 0.08, i % 2 ? 0.3 : -0.3));
CH.D.pad.forEach((note, i) => bell(n(note) * 2, f2s(2538) + i * 0.02, 0.04, (i - 2) * 0.2, 2.4, sfx));
whoosh(f2s(2556), 1.2, 400, 1600, 0.05, 0.3);
boom(f2s(2690), 0.3);
whoosh(f2s(2770), 1.0, 500, 1600, 0.05);
for (let i = 0; i < 7; i++) click(f2s(2880) + i * 0.05, 0.05, 1900 + i * 90, (i - 3) / 4);

// 6. Profile: the page arrives, the scan, finds lift off and land, "Add 8", the score moves.
whoosh(f2s(3026), 1.0, 300, 1400, 0.06, -0.3);
whoosh(f2s(3092), f2s(100), 1400, 4200, 0.035, -0.3);
[3112, 3130, 3150, 3158, 3176, 3186].forEach((f) => click(f2s(f), 0.035, 3000, -0.3));
for (let i = 0; i < 8; i++) {
  whoosh(f2s(3204 + i * 4), 0.85, 900, 2400, 0.022, 0.2);
  click(f2s(3204 + i * 4 + 52), 0.04, 2600 + i * 60, 0.4);
}
click(f2s(3348), 0.11, 2000, 0.4);
whoosh(f2s(3420), 1.0, 400, 1800, 0.06, 0.3);
for (let i = 0; i < 2; i++) click(f2s(3488) + i * 0.33, 0.06, 2300 + i * 200, 0.3);
[n("A5"), n("D6")].forEach((f, i) => bell(f, f2s(3528) + i * 0.07, 0.05, 0.3, 1.3, sfx));

// 7. Connect: taps, page pushes, the read-through, send, the reply.
whoosh(f2s(3594), 1.0, 500, 1800, 0.05, 0.4);
click(f2s(3672), 0.1, 2000, 0.3);
whoosh(f2s(3682), 0.7, 700, 2400, 0.07, 0.3);
click(f2s(3852), 0.1, 2000, 0.3);
whoosh(f2s(3864), 0.45, 1500, 600, 0.08, 0.4);
whoosh(f2s(3990), 1.0, 2000, 3600, 0.025, 0.3);
click(f2s(4068), 0.11, 2100, 0.3);
whoosh(f2s(4078), 0.45, 1500, 600, 0.08, 0.4);
pluck(n("A5"), f2s(4084), 0.06, 0.3, { decay: 0.3 });
pluck(n("D6"), f2s(4176), 0.06, 0.3, { decay: 0.35 });
pluck(n("F#6"), f2s(4176) + 0.09, 0.05, 0.3, { decay: 0.4 });

// 8. Montage and collapse; 9. the end hit on the downbeat and the final chord.
whoosh(f2s(4290), 1.4, 300, 1500, 0.06);
[4362, 4350, 4354, 4366].forEach((f, i) => whoosh(f2s(f), 1.2, 400, 1600, 0.035, [-0.8, -0.4, 0.4, 0.8][i]));
whoosh(f2s(4640), f2s(4744 - 4640), 200, 5000, 0.16, 0, sfx, "riser");
boom(f2s(4788), 0.6);
CH.D.pad.forEach((note, i) => bell(n(note) * 2, f2s(4788) + i * 0.022, 0.055, (i - 2) * 0.25, 3.6));
[["F#5", 4.4], ["A5", 5.0], ["E6", 5.6]].forEach(([note, t], i) => bell(n(note), f2s(4788) + Number(t) - 2.6, 0.03, (i - 1) * 0.4, 2.8));

// --- Effects processing -------------------------------------------------------------------

// Stereo ping-pong delay, dotted eighth, low-passed feedback.
{
  const d = Math.floor(BEAT * 0.75 * SR);
  const bufL = new Float32Array(N);
  const bufR = new Float32Array(N);
  let lp = 0;
  for (let i = 0; i < N; i++) {
    const inL = delaySend[0][i] + (i >= d ? bufR[i - d] * 0.32 : 0);
    const inR = delaySend[1][i] + (i >= d ? bufL[i - d] * 0.32 : 0);
    lp += 0.25 * (inL - lp);
    bufL[i] = lp;
    bufR[i] = inR;
    if (i >= d) {
      music[0][i] += bufL[i - d] * 0.5;
      music[1][i] += bufR[i - d] * 0.5;
      verbSend[0][i] += bufL[i - d] * 0.2;
      verbSend[1][i] += bufR[i - d] * 0.2;
    }
  }
}

// Freeverb-style reverb.
function freeverb(input, out, room = 0.86, damp = 0.35, wet = 0.32, spread = 0) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((x) => Math.round(((x + spread) * SR) / 44100));
  const aps = [556, 441, 341, 225].map((x) => Math.round(((x + spread) * SR) / 44100));
  const cb = combs.map((l) => ({ buf: new Float32Array(l), i: 0, store: 0 }));
  const ab = aps.map((l) => ({ buf: new Float32Array(l), i: 0 }));
  for (let s = 0; s < N; s++) {
    const x = input[s] * 0.015;
    let y = 0;
    for (const c of cb) {
      const o = c.buf[c.i];
      c.store = o * (1 - damp) + c.store * damp;
      c.buf[c.i] = x + c.store * room;
      c.i = (c.i + 1) % c.buf.length;
      y += o;
    }
    for (const a of ab) {
      const o = a.buf[a.i];
      a.buf[a.i] = y + o * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      y = o - y;
    }
    out[s] += y * wet * 10;
  }
}
const verbOut = [new Float32Array(N), new Float32Array(N)];
freeverb(verbSend[0], verbOut[0], 0.86, 0.35, 0.32, 0);
freeverb(verbSend[1], verbOut[1], 0.86, 0.35, 0.32, 23);

// Sidechain: the pads and arp dip gently under each kick.
let duck = 0;
const mixL = new Float32Array(N);
const mixR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  duck = Math.max(kickEnv[i], duck * 0.9995);
  const g = 1 - 0.28 * duck;
  mixL[i] = music[0][i] * g + verbOut[0][i] * (0.85 + 0.15 * g) + sfx[0][i] * 0.9;
  mixR[i] = music[1][i] * g + verbOut[1][i] * (0.85 + 0.15 * g) + sfx[1][i] * 0.9;
}

// Master: clear the sub-bass a room cannot use (two-pole high-pass at 32 Hz), then saturate gently.
function highpass(x, fc) {
  const w = (2 * Math.PI * fc) / SR;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * 0.707);
  const b0 = (1 + cos) / 2 / (1 + alpha);
  const b1 = -(1 + cos) / (1 + alpha);
  const b2 = b0;
  const a1 = (-2 * cos) / (1 + alpha);
  const a2 = (1 - alpha) / (1 + alpha);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y;
    x[i] = y;
  }
}
highpass(mixL, 32);
highpass(mixR, 32);
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.4) * Math.min(1, Math.max(0, (86.4 - t) / 1.2));
  mixL[i] = Math.tanh(mixL[i] * 1.1) * fade;
  mixR[i] = Math.tanh(mixR[i] * 1.1) * fade;
  peak = Math.max(peak, Math.abs(mixL[i]), Math.abs(mixR[i]));
}

function writeWav(path, L, R) {
  const buf = Buffer.alloc(44 + N * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + N * 4, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(N * 4, 40);
  const norm = 0.89 / peak;
  for (let i = 0; i < N; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm)) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(path, buf);
}

const raw = "renders/score-raw.wav";
fs.mkdirSync("renders", { recursive: true });
writeWav(raw, mixL, mixR);
// Loudness: -16 LUFS integrated, peaks under -1.5 dBTP. Comfortable in a room, clear on laptop speakers.
// Two passes: measure, then apply as one linear gain so the mix keeps its dynamics.
const probe = spawnSync(ffmpeg, ["-hide_banner", "-i", raw, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const m = JSON.parse(probe.slice(probe.lastIndexOf("{")));
const filter = `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-i", raw, "-af", filter, "-ar", "48000", "-c:a", "pcm_s16le", "public/audio/score.wav"]);
console.log("wrote public/audio/score.wav", DUR.toFixed(1), "s");
