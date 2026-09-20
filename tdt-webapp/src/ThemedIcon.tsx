import React from "react";

import logoImg from "./img/logo.svg";
import drawImg from "./img/draw.svg";
import typeImg from "./img/type.svg";
import helpImg from "./img/help.svg";
import checkImg from "./img/check.svg";

import "./ThemedIcon.css";

/**
 * The SVG icons in ./img are plain black shapes. Instead of recoloring them with
 * CSS filters (which can only approximate one fixed hue and fall apart on light
 * backgrounds), the shape is used as a CSS mask over a box filled with
 * `currentColor`, so an icon takes whatever text color the theme gives its parent.
 *
 * The aspect ratio is taken from each SVG's viewBox so the box sizes like the
 * original <img> did (set only width or only height and the other follows).
 */
const ICONS = {
  logo: { url: logoImg, ratio: 77.02 / 47.92 },
  draw: { url: drawImg, ratio: 79.93 / 21.01 },
  type: { url: typeImg, ratio: 32.08 / 12.35 },
  help: { url: helpImg, ratio: 1 },
  check: { url: checkImg, ratio: 1 },
} as const;

export type ThemedIconName = keyof typeof ICONS;

const ThemedIcon = ({
  name,
  label,
  className,
}: {
  name: ThemedIconName;
  /** Accessible name; also used as the tooltip like the old <img title> */
  label: string;
  className?: string;
}) => {
  const { url, ratio } = ICONS[name];
  const mask = `url("${url}")`;
  return (
    <span
      className={`ThemedIcon ThemedIcon-${name}${className ? " " + className : ""}`}
      role="img"
      aria-label={label}
      title={label}
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
