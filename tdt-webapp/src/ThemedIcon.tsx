import React from "react";

import drawImg from "./img/draw.svg";
import typeImg from "./img/type.svg";

import undoImg from "./img/icons/undo.svg";
import redoImg from "./img/icons/redo.svg";
import penImg from "./img/icons/pen.svg";
import eraserImg from "./img/icons/eraser.svg";
import fillImg from "./img/icons/fill.svg";
import lineImg from "./img/icons/line.svg";
import rectImg from "./img/icons/rect.svg";
import circleImg from "./img/icons/circle.svg";
import moreImg from "./img/icons/more.svg";
import checkImg from "./img/icons/check.svg";
import helpImg from "./img/icons/help.svg";
import closeImg from "./img/icons/close.svg";
import banImg from "./img/icons/ban.svg";
import homeImg from "./img/icons/home.svg";
import downloadImg from "./img/icons/download.svg";
import shareImg from "./img/icons/share.svg";
import galleryImg from "./img/icons/gallery.svg";
import playImg from "./img/icons/play.svg";
import volumeOnImg from "./img/icons/volume-on.svg";
import volumeOffImg from "./img/icons/volume-off.svg";
import cameraImg from "./img/icons/camera.svg";
import timerImg from "./img/icons/timer.svg";
import eyeImg from "./img/icons/eye.svg";
import sendImg from "./img/icons/send.svg";
import chevronLeftImg from "./img/icons/chevron-left.svg";
import chevronRightImg from "./img/icons/chevron-right.svg";
import chevronDownImg from "./img/icons/chevron-down.svg";
import arrowLeftImg from "./img/icons/arrow-left.svg";
import arrowRightImg from "./img/icons/arrow-right.svg";
import phoneImg from "./img/icons/phone.svg";
import desktopImg from "./img/icons/desktop.svg";

import "./ThemedIcon.css";

/**
 * These SVG icons are single-color shapes. Instead of recoloring them with CSS
 * filters (which can only approximate one fixed hue and fall apart on light
 * backgrounds), the shape is used as a CSS mask over a box filled with
 * `currentColor`, so an icon takes whatever text color the theme gives its parent.
 * (The main logo is not here: its letters have their own colors, see Logo.tsx.)
 */

/**
 * The coolicons pack (img/icons/): every icon is a square 24×24 line drawing
 * stroked at 2px with round caps, so they all share one aspect ratio and one
 * visual weight. `eraser`, `fill`, `line`, `phone` and `desktop` have no
 * counterpart in the pack and are drawn to match it — keep that style if you
 * add more.
 */
const PACK = {
  undo: undoImg,
  redo: redoImg,
  pen: penImg,
  eraser: eraserImg,
  fill: fillImg,
  line: lineImg,
  rect: rectImg,
  circle: circleImg,
  more: moreImg,
  check: checkImg,
  help: helpImg,
  close: closeImg,
  ban: banImg,
  home: homeImg,
  download: downloadImg,
  share: shareImg,
  gallery: galleryImg,
  play: playImg,
  volumeOn: volumeOnImg,
  volumeOff: volumeOffImg,
  camera: cameraImg,
  timer: timerImg,
  eye: eyeImg,
  send: sendImg,
  chevronLeft: chevronLeftImg,
  chevronRight: chevronRightImg,
  chevronDown: chevronDownImg,
  arrowLeft: arrowLeftImg,
  arrowRight: arrowRightImg,
  phone: phoneImg,
  desktop: desktopImg,
} as const;

/**
 * The DRAW and TYPE wordmarks. Not icons — they are words, so each keeps the
 * aspect ratio of its own viewBox and sizes like the original <img> did (set
 * only width or only height and the other follows).
 */
const WORDMARKS = {
  draw: { url: drawImg, ratio: 79.93 / 21.01 },
  type: { url: typeImg, ratio: 32.08 / 12.35 },
} as const;

export type ThemedIconName = keyof typeof PACK | keyof typeof WORDMARKS;

const isWordmark = (name: ThemedIconName): name is keyof typeof WORDMARKS =>
  name in WORDMARKS;

const sourceOf = (name: ThemedIconName) =>
  isWordmark(name)
    ? WORDMARKS[name]
    : { url: PACK[name as keyof typeof PACK], ratio: 1 };

const ThemedIcon = ({
  name,
  label,
  className,
}: {
  name: ThemedIconName;
  /**
   * Accessible name; also used as the tooltip like the old <img title>. Pass
   * null where the icon only repeats an adjacent label, so a screen reader is
   * not told the same thing twice.
   */
  label: string | null;
  className?: string;
}) => {
  const { url, ratio } = sourceOf(name);
  const mask = `url("${url}")`;
  // Only pack icons get the square default size: the wordmarks are sized by
  // rules that set one dimension and let `aspect-ratio` supply the other.
  const square = isWordmark(name) ? "" : " ThemedIcon-square";
  return (
    <span
      className={`ThemedIcon ThemedIcon-${name}${square}${className ? " " + className : ""}`}
      {...(label === null
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": label, title: label })}
      style={{ aspectRatio: `${ratio}` }}
    >
      <span
        className="ThemedIcon-shape"
        style={{ maskImage: mask, WebkitMaskImage: mask } as React.CSSProperties}
      />
    </span>
  );
};

export default ThemedIcon;
