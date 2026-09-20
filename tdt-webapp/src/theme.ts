import React from "react";

/**
 * Theme registry. The actual colors live in themes.css as CSS custom properties,
 * selected through `data-theme` on <html>. This module only knows the theme ids,
 * how to persist the choice and how to read the active tokens back for code that
 * paints with JavaScript (canvas exports, the QR code).
 */

export type ThemeId =
  | "cyberpunk"
  | "blue-eclipse"
  | "blooming-romance"
  | "stormy-morning"
  | "country-garden"
  | "cobalt-sky"
  | "cappuccino";

export interface ThemeInfo {
  id: ThemeId;
  name: string;
  tagline: string;
  kind: "dark" | "light";
  /** Emoji shown on the theme switcher button while this theme is active */
  icon: string;
  /** Four representative colors, shown as swatches in the theme picker */
  swatches: [string, string, string, string];
  /** Value for <meta name="theme-color"> (browser chrome on mobile) */
  themeColor: string;
}

export const THEMES: ThemeInfo[] = [
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    tagline: "Neon on midnight",
    kind: "dark",
    icon: "🌆",
    swatches: ["#080818", "#00f5ff", "#ff2079", "#39ff14"],
    themeColor: "#080818",
  },
  {
    id: "blue-eclipse",
    name: "Blue Eclipse",
    tagline: "Indigo night, lavender light",
    kind: "dark",
    icon: "🌙",
    swatches: ["#0f0e47", "#272757", "#505081", "#8686ac"],
    themeColor: "#0f0e47",
  },
  {
    id: "blooming-romance",
    name: "Blooming Romance",
    tagline: "Burgundy, blossom and leaf",
    kind: "dark",
    icon: "🌹",
    swatches: ["#660033", "#e673ac", "#469110", "#00520a"],
    themeColor: "#4d0026",
  },
  {
    id: "cobalt-sky",
    name: "Cobalt Sky",
    tagline: "Navy, cobalt and sky blue",
    kind: "dark",
    icon: "💙",
    swatches: ["#0047ab", "#000080", "#82c8e5", "#6d8196"],
    themeColor: "#000080",
  },
  {
    id: "stormy-morning",
    name: "Stormy Morning",
    tagline: "Pale sky and slate",
    kind: "light",
    icon: "⛅",
    swatches: ["#6a89a7", "#bdddfc", "#88bdf2", "#384959"],
    themeColor: "#dcebfb",
  },
  {
    id: "country-garden",
    name: "Country Garden",
    tagline: "Cream, lavender, olive, plum",
    kind: "light",
    icon: "🌼",
    swatches: ["#ffffe3", "#dbd4ff", "#808034", "#723480"],
    themeColor: "#ffffe3",
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    tagline: "Foam, tan and coffee",
    kind: "light",
    icon: "☕",
    swatches: ["#d6b588", "#c6c0b9", "#705e46", "#422701"],
    themeColor: "#e9e4dd",
  },
];

export const DEFAULT_THEME: ThemeId = "cyberpunk";

/** localStorage key; also read by the inline script in index.html to avoid a flash of the default theme */
export const THEME_STORAGE_KEY = "tdt-theme";

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function getThemeInfo(id: ThemeId): ThemeInfo {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

function readStoredTheme(): ThemeId {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function applyTheme(id: ThemeId) {
  document.documentElement.setAttribute("data-theme", id);
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = getThemeInfo(id).themeColor;
}

// Tiny external store so every component using useTheme() re-renders together and
// after the DOM attribute has already changed (themeVar() then reads fresh values).
let currentTheme: ThemeId = readStoredTheme();
const listeners = new Set<() => void>();

applyTheme(currentTheme);

export function getTheme(): ThemeId {
  return currentTheme;
}

export function setTheme(id: ThemeId) {
  if (id === currentTheme) return;
  currentTheme = id;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    /* private mode etc. — the theme still applies for this page load */
  }
  applyTheme(id);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React hook: current theme id and a setter that persists and applies it */
export function useTheme(): [ThemeId, (id: ThemeId) => void] {
  const theme = React.useSyncExternalStore(subscribe, getTheme);
  return [theme, setTheme];
}

/**
 * Read the computed value of a theme token, e.g. themeVar("--cyber-cyan").
 * For code that paints to a <canvas> and therefore can't use CSS variables directly.
 */
export function themeVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** React hook version of themeVar(): the value updates when the theme changes */
export function useThemeVar(name: string): string {
  return React.useSyncExternalStore(subscribe, () => themeVar(name));
}
