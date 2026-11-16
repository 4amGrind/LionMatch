"use client";

// The swipe deck. OWNER: Max.
// Drag the top card right for Interested, left to Pass, or up to Save.
// The buttons and the arrow keys do the same, and Undo (or the Z key) brings the last card back.
// Animation uses Motion (motion.dev). The burst on a strong match uses canvas-confetti.

import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
  type PanInfo,
} from "motion/react";
import { useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSwipes } from "@/lib/swipes";
import type confetti from "canvas-confetti";
import type { SwipeDirection } from "@/lib/types";
import DeckCard, { deckKey, deckTargetId, type DeckItem } from "./DeckCard";

export type { DeckItem };

/**
 * A drag counts as a swipe past SWIPE_DISTANCE (px), or as a quick flick faster than
 * SWIPE_SPEED (px per second) that still moved at least FLICK_DISTANCE, so a jittery tap does not count.
 */
const SWIPE_DISTANCE = 110;
const SWIPE_SPEED = 600;
const FLICK_DISTANCE = 40;
/** Cards shown in the stack. One more is rendered hidden so the next card can fade in from behind. */
const VISIBLE = 3;
const STEP_Y = 12;
const STEP_SCALE = 0.045;
/** Marking a card Interested at this score or higher sets off confetti. */
const CELEBRATE_SCORE = 8;
/** Same colors as the --ct-* tokens in globals.css. canvas-confetti needs plain hex. */
const CONFETTI_COLORS = ["#b9d9eb", "#0c2340", "#17845a", "#ffffff", "#c98a06"];

/** Cards settling into the stack: critically damped, so they glide into place without wobbling. */
const SETTLE = { type: "spring", stiffness: 300, damping: 33, mass: 0.9 } as const;
/** A card let go before the swipe line: a little bounce, so it feels like it snapped back. */
const SNAP_BACK = { type: "spring", stiffness: 520, damping: 28 } as const;
/** How hard a button press throws the card, in px per second. A real drag keeps its own speed. */
const BUTTON_THROW = 1600;

/** Where a card flies to when it leaves. Rotation follows from x, so it is not listed. */
const OFFSCREEN: Record<SwipeDirection, { x: number; y: number }> = {
  like: { x: 620, y: 40 },
  pass: { x: -620, y: 40 },
  save: { x: 0, y: -900 },
};

const KEY_DIRECTIONS: Record<string, SwipeDirection> = {
  ArrowRight: "like",
  ArrowLeft: "pass",
  ArrowUp: "save",
};

interface Exit {
  direction: SwipeDirection;
  /** True when a drag let go of the card. False for buttons and keys, which need a push. */
  thrown: boolean;
}

/**
 * The exit animation reads how the card left from AnimatePresence, because a leaving card gets no new props.
 * It is a spring, so a dragged card carries on at the speed your finger let go of it.
 */
const cardVariants = {
  exit: (exit: Exit | undefined) => {
    const { direction, thrown } = exit ?? { direction: "pass" as const, thrown: false };
    const fly = { type: "spring" as const, stiffness: 120, damping: 20, restDelta: 4, restSpeed: 60 };
    // Buttons and keys start from rest, so push the card along the axis it leaves on.
    const pushX = direction === "like" ? BUTTON_THROW : direction === "pass" ? -BUTTON_THROW : 0;
    const pushY = direction === "save" ? -BUTTON_THROW : 0;
    return {
      ...OFFSCREEN[direction],
      opacity: 0,
      zIndex: 50,
      transition: {
        x: thrown ? fly : { ...fly, velocity: pushX },
        y: thrown ? fly : { ...fly, velocity: pushY },
        opacity: { duration: 0.22, delay: 0.16, ease: "easeIn" as const },
      },
    };
  },
};

/** 0 to 1. How strongly a card at (x, y) reads as a swipe in `direction`. */
function stampOpacity(x: number, y: number, direction: SwipeDirection): number {
  const upward = -y > Math.abs(x);
  const distance = direction === "save" ? (upward ? -y : 0) : upward ? 0 : direction === "like" ? x : -x;
  return Math.min(1, Math.max(0, (distance - 24) / (SWIPE_DISTANCE - 24)));
}

function stackPose(depth: number) {
  return {
    x: 0,
    y: depth * STEP_Y,
    scale: 1 - depth * STEP_SCALE,
    opacity: depth < VISIBLE ? 1 : 0,
  };
}

/**
 * Confetti on a strong match. It draws on the canvas inside the phone frame (see layout.tsx),
 * not the whole window, so on a wide screen the pieces vanish at the phone's edge.
 */
let fireConfetti: confetti.CreateTypes | null = null;

function celebrate() {
  const canvas = document.querySelector<HTMLCanvasElement>("canvas[data-confetti]");
  import("canvas-confetti")
    .then(({ default: lib }) => {
      // Without the canvas (it should always be there), confetti falls back to covering the window.
      fireConfetti ??= lib.create(canvas ?? undefined, { resize: true, disableForReducedMotion: true });
      return fireConfetti({
        particleCount: 80,
        spread: 70,
        startVelocity: 34,
        gravity: 0.9,
        ticks: 180,
        scalar: 0.9,
        origin: { x: 0.5, y: 0.5 },
        colors: CONFETTI_COLORS,
        disableForReducedMotion: true,
      });
    })
    .catch(() => {
      // Confetti is a nice extra. The swipe already saved.
    });
}

const noopSubscribe = () => () => {};

export default function SwipeDeck({ items }: { items: DeckItem[] }) {
  const { swipes, recordSwipe, removeSwipe, clearSwipes } = useSwipes();
  // Swipes live in the browser, so wait until we are in the browser before drawing the stack.
  // Otherwise cards you already swiped would flash and fly off on every page load.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const [exit, setExit] = useState<Exit>({ direction: "pass", thrown: false });
  const [returning, setReturning] = useState<{ key: string; direction: SwipeDirection } | null>(null);
  const [celebration, setCelebration] = useState<{ key: string; score: number } | null>(null);

  const itemKeys = useMemo(() => new Set(items.map(deckKey)), [items]);
  const seen = new Set(swipes.map((s) => `${s.target_type}:${s.target_id}`));
  const remaining = items.filter((item) => !seen.has(deckKey(item)));
  const top = remaining[0];
  // Newest first, so this is the last card swiped in the deck.
  const lastSwipe = swipes.find((s) => itemKeys.has(`${s.target_type}:${s.target_id}`));

  function swipe(direction: SwipeDirection, thrown = false) {
    if (!top) return;
    setExit({ direction, thrown });
    recordSwipe(top.kind, deckTargetId(top), direction);
    navigator.vibrate?.(10);
    if (direction === "like" && top.match.score >= CELEBRATE_SCORE) {
      setCelebration({ key: deckKey(top), score: top.match.score });
      celebrate();
    }
  }

  function undo() {
    if (!lastSwipe) return;
    setReturning({ key: `${lastSwipe.target_type}:${lastSwipe.target_id}`, direction: lastSwipe.direction });
    removeSwipe(lastSwipe.target_type, lastSwipe.target_id);
  }

  useEffect(() => {
    if (!celebration) return;
    const timer = window.setTimeout(() => setCelebration(null), 1500);
    return () => window.clearTimeout(timer);
  }, [celebration]);

  // Arrow keys swipe and Z undoes. useEffectEvent always sees the current top card.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
    const direction = KEY_DIRECTIONS[event.key];
    if (direction) {
      event.preventDefault();
      swipe(direction);
    } else if (event.key === "z" || event.key === "Z") {
      event.preventDefault();
      undo();
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!hydrated) return <DeckSkeleton />;

  // Deepest card first so the top card is painted last.
  const stack = remaining.slice(0, VISIBLE + 1).map((item, depth) => ({ item, depth })).reverse();

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex min-h-8 items-center justify-between gap-3">
          <p className="text-sm text-ct-muted">
            <span className="font-semibold tabular-nums text-ct-navy">{remaining.length}</span> to go
          </p>
          <AnimatePresence initial={false}>
            {lastSwipe ? (
              <motion.button
                key="undo"
                type="button"
                onClick={undo}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileTap={{ scale: 0.94 }}
                className="glass flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-ct-navy"
                aria-keyshortcuts="z"
              >
                <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
                  <path
                    d="M7 4L3.5 7.5 7 11M4 7.5h7.5a4.5 4.5 0 010 9H9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Undo
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="relative min-h-0 flex-1">
          {remaining.length === 0 ? <DoneState onStartOver={clearSwipes} /> : null}

          <AnimatePresence custom={exit} initial={false}>
            {stack.map(({ item, depth }) => {
              const key = deckKey(item);
              return (
                <SwipeCard
                  key={key}
                  item={item}
                  depth={depth}
                  returnFrom={returning?.key === key ? returning.direction : null}
                  exit={exit}
                  onSwipe={(direction) => swipe(direction, true)}
                />
              );
            })}
          </AnimatePresence>

          <AnimatePresence>
            {celebration ? (
              <motion.div
                key={celebration.key}
                initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: -4 }}
                exit={{ opacity: 0, scale: 0.95, y: -12 }}
                transition={{ type: "spring", stiffness: 380, damping: 20 }}
                className="glass pointer-events-none absolute inset-x-0 top-[38%] z-[60] mx-auto w-fit rounded-[22px] px-5 py-3 text-ct-navy"
                role="status"
              >
                <span className="display text-[26px]">Strong match</span>
                <span className="ml-2 text-sm font-semibold tabular-nums">{celebration.score}/10</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {top ? <SwipeHint nudge={!lastSwipe} /> : null}
        <Controls disabled={!top} onSwipe={(direction) => swipe(direction)} />
      </div>
    </MotionConfig>
  );
}

/**
 * Small text under the deck so people know they can swipe, not just tap the buttons.
 * Until the first swipe, the arrows nudge outward to draw the eye.
 */
function SwipeHint({ nudge }: { nudge: boolean }) {
  return (
    <div className="lg-on-dark mb-2.5 flex items-center justify-between text-xs font-semibold text-ct-navy" aria-hidden="true">
      <span className="glass flex items-center gap-1 rounded-full py-1 pl-1.5 pr-2.5">
        <HintArrow direction="left" nudge={nudge} />
        Swipe left to pass
      </span>
      <span className="glass flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1.5">
        Swipe right if interested
        <HintArrow direction="right" nudge={nudge} />
      </span>
    </div>
  );
}

function HintArrow({ direction, nudge }: { direction: "left" | "right"; nudge: boolean }) {
  const away = direction === "left" ? -3 : 3;
  return (
    <motion.svg
      viewBox="0 0 16 16"
      className="size-3.5"
      animate={nudge ? { x: [0, away, 0] } : { x: 0 }}
      transition={nudge ? { duration: 0.9, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.4 } : { duration: 0.2 }}
    >
      <path
        d={direction === "left" ? "M10 3.5L5.5 8l4.5 4.5" : "M6 3.5L10.5 8 6 12.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

function Controls({ disabled, onSwipe }: { disabled: boolean; onSwipe: (direction: SwipeDirection) => void }) {
  const press = { scale: 0.92 };
  const round =
    "glass-strong flex shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-40";
  return (
    <div className="lg-on-dark mt-1 flex items-center gap-3">
      <motion.button
        type="button"
        onClick={() => onSwipe("pass")}
        disabled={disabled}
        whileTap={press}
        aria-label="Pass"
        title="Pass (left arrow)"
        className={`${round} size-14 text-ct-pass`}
      >
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
        </svg>
      </motion.button>
      <motion.button
        type="button"
        onClick={() => onSwipe("save")}
        disabled={disabled}
        whileTap={press}
        aria-label="Save for later"
        title="Save for later (up arrow)"
        className={`${round} size-12 text-ct-save`}
      >
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
          <path d="M6 3.5h12v17l-6-4.5-6 4.5z" fill="currentColor" />
        </svg>
      </motion.button>
      <motion.button
        type="button"
        onClick={() => onSwipe("like")}
        disabled={disabled}
        whileTap={{ scale: 0.96 }}
        title="Interested (right arrow)"
        className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-ct-blue text-base font-semibold shadow-[inset_0_1px_0_rgb(255_255_255/0.7),var(--ct-lift)] transition-[opacity,filter] hover:brightness-105 disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
          <path
            d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0112 7a4.4 4.4 0 017.5 2.9C19.5 15.4 12 20 12 20z"
            fill="currentColor"
          />
        </svg>
        Interested
      </motion.button>
    </div>
  );
}

function SwipeCard({
  item,
  depth,
  returnFrom,
  exit,
  onSwipe,
}: {
  item: DeckItem;
  depth: number;
  /** Set when Undo brought this card back. It flies in from the side it left. */
  returnFrom: SwipeDirection | null;
  exit: Exit;
  onSwipe: (direction: SwipeDirection) => void;
}) {
  const isTop = depth === 0;
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-320, 320], [-14, 14]);
  // Each stamp fades in as the card moves its way, and only while that direction is winning,
  // so a slightly diagonal drag never shows two stamps at once. Same rule as handleDragEnd.
  const likeOpacity = useTransform(() => stampOpacity(x.get(), y.get(), "like"));
  const passOpacity = useTransform(() => stampOpacity(x.get(), y.get(), "pass"));
  const saveOpacity = useTransform(() => stampOpacity(x.get(), y.get(), "save"));
  // A drag that ends over a link should not also open the link.
  const dragged = useRef(false);

  function handleDragEnd(_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    const { offset, velocity } = info;
    const upward = -offset.y > Math.abs(offset.x);
    const flickUp = offset.y < -FLICK_DISTANCE && velocity.y < -SWIPE_SPEED;
    const flickRight = offset.x > FLICK_DISTANCE && velocity.x > SWIPE_SPEED;
    const flickLeft = offset.x < -FLICK_DISTANCE && velocity.x < -SWIPE_SPEED;
    if (upward && (offset.y < -SWIPE_DISTANCE || flickUp)) {
      onSwipe("save");
    } else if (!upward && (offset.x > SWIPE_DISTANCE || flickRight)) {
      onSwipe("like");
    } else if (!upward && (offset.x < -SWIPE_DISTANCE || flickLeft)) {
      onSwipe("pass");
    } else {
      animate(x, 0, SNAP_BACK);
      animate(y, 0, SNAP_BACK);
    }
  }

  return (
    <motion.article
      style={{ x, y, rotate, zIndex: VISIBLE + 1 - depth, transformOrigin: "50% 100%" }}
      custom={exit}
      variants={cardVariants}
      initial={returnFrom ? { ...OFFSCREEN[returnFrom], scale: 1, opacity: 1 } : stackPose(VISIBLE)}
      animate={stackPose(depth)}
      exit="exit"
      transition={SETTLE}
      drag={isTop}
      dragMomentum={false}
      whileDrag={{ scale: 1.025, transition: { type: "spring", stiffness: 400, damping: 30 } }}
      onDragStart={() => {
        dragged.current = true;
      }}
      onDragEnd={handleDragEnd}
      onPointerDownCapture={() => {
        dragged.current = false;
      }}
      onClickCapture={(event) => {
        if (dragged.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      aria-hidden={!isTop}
      inert={!isTop}
      className={`absolute inset-x-0 bottom-9 top-0 select-none will-change-transform ${
        isTop ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      <DeckCard
        item={item}
        depth={depth}
        overlay={
          <>
            <Stamp label="Interested" opacity={likeOpacity} className="left-4 top-6 -rotate-[10deg] border-ct-like text-ct-like" />
            <Stamp label="Pass" opacity={passOpacity} className="right-4 top-6 rotate-[10deg] border-ct-pass text-ct-pass" />
            <Stamp label="Save" opacity={saveOpacity} className="bottom-20 left-1/2 -translate-x-1/2 border-ct-save text-ct-save" />
          </>
        }
      />
    </motion.article>
  );
}

function Stamp({ label, opacity, className }: { label: string; opacity: MotionValue<number>; className: string }) {
  return (
    <motion.span
      aria-hidden="true"
      style={{ opacity }}
      className={`display pointer-events-none absolute rounded-xl border-[3px] bg-ct-solid/90 px-3 pb-1 pt-1 text-[30px] ${className}`}
    >
      {label}
    </motion.span>
  );
}

function DoneState({ onStartOver }: { onStartOver: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SETTLE, delay: 0.2 }}
      className="glass-surface absolute inset-x-0 bottom-9 top-8 flex flex-col items-start justify-end gap-3 rounded-[26px] p-6"
    >
      <p className="display text-[40px] text-ct-navy">That is every card.</p>
      <p className="max-w-[30ch] text-[15px] text-ct-muted">
        Find more in Explore, or look back at what you picked in History.
      </p>
      <motion.button
        type="button"
        onClick={onStartOver}
        whileTap={{ scale: 0.96 }}
        className="mt-2 rounded-full bg-ct-navy px-5 py-3 text-sm font-semibold"
      >
        Start over
      </motion.button>
    </motion.div>
  );
}

function DeckSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy="true">
      <div className="mb-2 min-h-8" />
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-x-0 bottom-9 top-0 flex flex-col">
          <div className="glass-surface h-8 w-24 rounded-t-2xl opacity-60" />
          <div className="glass-surface flex-1 animate-pulse rounded-[26px] rounded-tl-none" />
        </div>
      </div>
      <div className="mb-2.5 h-6" />
      <div className="h-14" />
    </div>
  );
}
