import React from "react";
import styled, { keyframes } from "styled-components";

import { THEMES, getThemeInfo, useTheme } from "./theme";
import { originFromEvent } from "./themeTransition";

/**
 * Floating theme picker, shown on every page (bottom-right corner, next to the
 * in-game mute button) except during a round on a small screen, where it would
 * cover the canvas — see .FloatingBadge in App.css. The choice is stored in
 * localStorage and applied to <html data-theme> — see theme.ts / themes.css.
 */
const ThemeSwitcher = () => {
  const [theme, setTheme] = useTheme();
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const current = getThemeInfo(theme);

  return (
    <Wrapper ref={wrapperRef} className="FloatingBadge">
      {open && (
        <Panel role="listbox" aria-label="Theme">
          <PanelTitle>Theme</PanelTitle>
          {THEMES.map((t) => (
            <Option
              key={t.id}
              role="option"
              aria-selected={t.id === theme}
              $active={t.id === theme}
              onClick={(e) => {
                setTheme(t.id, originFromEvent(e));
                setOpen(false);
              }}
            >
              <Swatches aria-hidden="true">
                {t.swatches.map((c, i) => (
                  <Swatch key={i} style={{ backgroundColor: c }} />
                ))}
              </Swatches>
              <OptionText>
                <OptionName>
                  <span aria-hidden="true">{t.icon}</span> {t.name}
                </OptionName>
                <OptionTagline>{t.tagline}</OptionTagline>
              </OptionText>
              <KindBadge>{t.kind}</KindBadge>
            </Option>
          ))}
        </Panel>
      )}
      <ToggleButton
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Theme: ${current.name}`}
        aria-label={`Change theme (current: ${current.name})`}
      >
        {/* Remounted on each change so the pop animation replays */}
        <ToggleIcon key={theme} aria-hidden="true">
          {current.icon}
        </ToggleIcon>
      </ToggleButton>
    </Wrapper>
  );
};

export default ThemeSwitcher;

const buttonIn = keyframes`
  from { opacity: 0; transform: scale(0.6); }
  to   { opacity: 1; transform: scale(1); }
`;

const iconPop = keyframes`
  0%   { opacity: 0; transform: scale(0.4) rotate(-110deg); }
  60%  { opacity: 1; transform: scale(1.15) rotate(10deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
`;

const panelIn = keyframes`
  from { opacity: 0; transform: translateY(6px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const Wrapper = styled.div`
  position: fixed;
  bottom: 2vmin;
  right: 2vmin;
  z-index: 100;
`;

const ToggleButton = styled.button`
  background: rgba(var(--cyber-bg-deep-rgb), 0.85);
  border: 1.5px solid rgba(var(--cyber-cyan-rgb), 0.4);
  color: var(--cyber-cyan);
  border-radius: 50%;
  width: 6vmin;
  height: 6vmin;
  min-width: 36px;
  min-height: 36px;
  font-size: 3vmin;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
  animation: ${buttonIn} 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:hover {
    border-color: var(--cyber-cyan);
    box-shadow: 0 0 10px rgba(var(--cyber-cyan-rgb), 0.4);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.9);
  }
`;

const ToggleIcon = styled.span`
  display: block;
  animation: ${iconPop} 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
`;

const Panel = styled.div`
  position: absolute;
  bottom: calc(100% + 1vmin);
  right: 0;
  min-width: 34vmin;
  max-width: calc(100vw - 4vmin);
  max-height: calc(100vh - 12vmin);
  overflow: auto;
  padding: 1vmin;
  border-radius: 1.2vmin;
  background: rgba(var(--cyber-bg-deep-rgb), 0.96);
  border: 1.5px solid rgba(var(--cyber-cyan-rgb), 0.4);
  box-shadow: var(--cyber-glow);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  gap: 0.5vmin;
  text-align: left;
  animation: ${panelIn} 0.18s ease-out;
`;

const PanelTitle = styled.div`
  font-size: 1.3vmin;
  padding: 0.3vmin 1vmin 0.6vmin;
  color: var(--cyber-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.15em;
`;

const Option = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 1.2vmin;
  width: 100%;
  padding: 0.9vmin 1vmin;
  border-radius: 0.8vmin;
  border: 1.5px solid
    ${({ $active }) => ($active ? "var(--cyber-cyan)" : "rgba(var(--cyber-cyan-rgb), 0.18)")};
  background: ${({ $active }) => ($active ? "rgba(var(--cyber-cyan-rgb), 0.12)" : "transparent")};
  box-shadow: ${({ $active }) => ($active ? "var(--cyber-glow)" : "none")};
  color: var(--cyber-text);
  font-family: inherit;
  font-size: 1em;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: rgba(var(--cyber-cyan-rgb), 0.1);
    border-color: rgba(var(--cyber-cyan-rgb), 0.6);
  }
`;

const Swatches = styled.div`
  display: flex;
  gap: 0.35vmin;
  flex-shrink: 0;
`;

const Swatch = styled.span`
  width: 1.8vmin;
  height: 2.6vmin;
  min-width: 10px;
  min-height: 14px;
  border-radius: 0.4vmin;
  border: 1px solid rgba(var(--cyber-text-rgb), 0.25);
`;

const OptionText = styled.div`
  flex: 1;
  min-width: 0;
`;

const OptionName = styled.div`
  font-size: 1.8vmin;
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
`;

const OptionTagline = styled.div`
  font-size: 1.3vmin;
  color: var(--cyber-text-soft);
  white-space: nowrap;
`;

const KindBadge = styled.span`
  flex-shrink: 0;
  font-size: 1.1vmin;
  padding: 0.25vmin 0.7vmin;
  border-radius: 100px;
  border: 1px solid rgba(var(--cyber-cyan-rgb), 0.35);
  color: var(--cyber-text-soft);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;
