/**
 * Theme change animation.
 *
 * Two things happen when the theme switches:
 *
 *  1. `data-theme-transition` is set on <html> for the length of the switch, which
 *     makes every element cross-fade its colors instead of snapping to the new
 *     palette (the rules live in themes.css, see "Theme change animation").
 *  2. A ring in the new accent color sweeps out from wherever the user clicked
 *     until it has crossed the whole viewport.
 *
 * Both are skipped for users who asked for reduced motion — the theme still
 * applies, just instantly.
 */

/** Where the sweep starts, in viewport coordinates */
export interface ThemeChangeOrigin {
  x: number;
  y: number;
}

/** Duration of the color cross-fade. Published to CSS as `--theme-fade`, so themes.css never repeats it. */
const FADE_MS = 420;

/** How long the ring takes to travel from the click to the far corner of the viewport */
const RIPPLE_MS = 640;

let fadeTimer = 0;

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * The point a click happened at. Keyboard activations report `detail === 0` and
 * meaningless coordinates, so those sweep from the middle of the activated element.
 */
export function originFromEvent(event: {
  clientX: number;
  clientY: number;
  detail: number;
  currentTarget: Element;
}): ThemeChangeOrigin {
  if (event.detail > 0) return { x: event.clientX, y: event.clientY };
  const rect = event.currentTarget.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * Run `applyTheme` (which flips `data-theme` and re-renders) inside the animation.
 * `origin` is optional: without one only the cross-fade plays.
 */
export function animateThemeChange(
  origin: ThemeChangeOrigin | undefined,
  applyTheme: () => void
) {
  const root = document.documentElement;

  if (prefersReducedMotion()) {
    applyTheme();
    return;
  }

  root.style.setProperty("--theme-fade", `${FADE_MS}ms`);
  root.setAttribute("data-theme-transition", "");
  applyTheme();

  // Switching again mid-fade just restarts the clock — the attribute must outlive
  // the last change, not the first one.
  window.clearTimeout(fadeTimer);
  fadeTimer = window.setTimeout(
    () => root.removeAttribute("data-theme-transition"),
    FADE_MS + 50
  );

  if (!origin) return;

  // Radius that reaches the corner furthest from the click, so the ring leaves the
  // screen everywhere at the same moment.
  const dx = Math.max(origin.x, window.innerWidth - origin.x);
  const dy = Math.max(origin.y, window.innerHeight - origin.y);
  const radius = Math.hypot(dx, dy);

  const ripple = document.createElement("div");
  ripple.className = "theme-ripple";
  ripple.style.left = `${origin.x - radius}px`;
  ripple.style.top = `${origin.y - radius}px`;
  ripple.style.width = `${radius * 2}px`;
  ripple.style.height = `${radius * 2}px`;
  document.body.appendChild(ripple);

  // Scaling a fixed-size circle keeps this on the compositor; the colors come from
  // the new theme because the element is created after data-theme has changed.
  const animation = ripple.animate(
    [
      { transform: "scale(0)", opacity: 0 },
      { transform: "scale(0.3)", opacity: 1, offset: 0.22 },
      { transform: "scale(1)", opacity: 0 },
    ],
    { duration: RIPPLE_MS, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" }
  );

  const removeRipple = () => ripple.remove();
  animation.finished.then(removeRipple, removeRipple);
}
