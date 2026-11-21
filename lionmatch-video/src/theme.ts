// Colors come from the app's own tokens (src/app/globals.css in the app repo).
// The film adds only a few deep backgrounds and one brighter blue for light.

import { loadFont } from "@remotion/google-fonts/InstrumentSans";

const font = loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });
export const FONT = font.fontFamily;

export const C = {
  // App tokens, light theme.
  columbia: "#b9d9eb",
  navy: "#0c2340",
  ink: "#16304f",
  muted: "#2f4763",
  like: "#17845a",
  pass: "#c4392f",
  save: "#b07905",
  catInternship: "#0c2340",
  catClub: "#2b67ad",
  catResearch: "#0e7468",
  catFellowship: "#9c2f55",
  catPerson: "#d39a12",
  // App tokens, dark theme (used for type on the film's navy).
  darkInk: "#e3eff7",
  darkMuted: "#9db4ca",
  darkPage: "#06132a",
  outside: "#030b18",
  // Film only.
  night: "#020711",
  deep: "#04101f",
  glow: "#7cc0ff",
  ice: "#dcecf7",
  white: "#f5f9fc",
};

export const CATEGORY_COLOR: Record<string, string> = {
  internship: C.catInternship,
  club: C.catClub,
  research: C.catResearch,
  fellowship: C.catFellowship,
  person: C.catPerson,
};
