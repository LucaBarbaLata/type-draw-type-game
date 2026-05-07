import React, { useEffect, useState } from "react";
import styled, { css, keyframes } from "styled-components";

import Dialog from "./Dialog";
import Scrollable from "./Scrollable";

// ── Animations ────────────────────────────────────────────────────────────────

const slideInRight = keyframes`
  from { opacity: 0; transform: translateX(5vmin); }
  to   { opacity: 1; transform: translateX(0); }
`;

const slideInLeft = keyframes`
  from { opacity: 0; transform: translateX(-5vmin); }
  to   { opacity: 1; transform: translateX(0); }
`;

const popIn = keyframes`
  0%   { opacity: 0; transform: scale(0.55); }
  70%  { transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
`;

const arrowPulse = keyframes`
  0%, 100% { transform: translateX(0); opacity: 0.35; }
  50%       { transform: translateX(2px); opacity: 0.75; }
`;

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
`;

const drawStroke = keyframes`
  to { stroke-dashoffset: 0; opacity: 1; }
`;

const rowReveal = keyframes`
  from { opacity: 0; transform: translateX(-1.5vmin); }
  to   { opacity: 1; transform: translateX(0); }
`;

// ── Typewriter hook ───────────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 40) {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text]);
  return out;
}

// ── Main component ────────────────────────────────────────────────────────────

const HowToButtonAndDialog = () => {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [animKey, setAnimKey] = useState(0);

  const close = () => { setShow(false); setStep(0); };

  const go = (next: number) => {
    setDir(next > step ? "next" : "prev");
    setAnimKey((k) => k + 1);
    setStep(next);
  };

  const cur = STEPS[step];

  return (
    <>
      <Dialog show={show}>
        <Scrollable>
          <GuideWrapper>
            <TopRow>
              <ProgressTrack>
                <ProgressFill style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
              </ProgressTrack>
              <StepCounter>{step + 1} / {STEPS.length}</StepCounter>
              <CloseBtn onClick={close} title="Close">✕</CloseBtn>
            </TopRow>

            <SlideArea key={animKey} dir={dir}>
              <VisualZone>{cur.visual}</VisualZone>

              <InfoZone>
                <StepTitle>{cur.title}</StepTitle>
                <StepBody>{cur.body}</StepBody>
                {cur.tip && (
                  <TipBox>
                    <span>💡</span>
                    <span>{cur.tip}</span>
                  </TipBox>
                )}
              </InfoZone>
            </SlideArea>

            <NavZone>
              <DotRow>
                {STEPS.map((_, i) => (
                  <Dot key={i} active={i === step} past={i < step} onClick={() => go(i)} />
                ))}
              </DotRow>
              <BtnRow>
                <NavBtn
                  className="button button-red"
                  disabled={step === 0}
                  onClick={() => go(step - 1)}
                >
                  ← Back
                </NavBtn>
                {step < STEPS.length - 1 ? (
                  <button className="button" onClick={() => go(step + 1)}>
                    Next →
                  </button>
                ) : (
                  <button className="button" onClick={close}>
                    Let's play! 🎮
                  </button>
                )}
              </BtnRow>
            </NavZone>
          </GuideWrapper>
        </Scrollable>
      </Dialog>

      <button className="button button-red" onClick={() => setShow(true)}>
        How to play?
      </button>
    </>
  );
};

export default HowToButtonAndDialog;

// ── Step data ─────────────────────────────────────────────────────────────────

const STEPS = [
  {
    title: "What is Type Draw Type?",
    visual: <OverviewVisual />,
    body: "A chain-reaction party game where sentences become drawings, drawings become new sentences, and the original meaning slowly falls apart. Every game tells a completely different story.",
    tip: null,
  },
  {
    title: "✍️ Typing rounds",
    visual: <TypeVisual />,
    body: "You see either a blank slate or a drawing from the previous player, and type what it means to you. Your sentence becomes the drawing prompt for whoever comes next in the chain.",
    tip: 'Be specific! "A red wizard casting lightning at a sleeping dragon" gives way more to draw than just "wizard". The more vivid the description, the wilder the chain.',
  },
  {
    title: "🎨 Drawing rounds",
    visual: <DrawVisual />,
    body: "You receive a sentence and draw your best interpretation on a blank canvas. The next player sees only your drawing — never the original words. So draw clearly!",
    tip: "Stick to the 2–3 most important things in the sentence. Simple and recognisable beats detailed and confusing every time. Stick figures are completely valid!",
  },
  {
    title: "🔍 The twist",
    visual: <TwistVisual />,
    body: "Every player is isolated — you only ever see the one step directly before yours, never the full chain. Meanings drift from player to player. A wizard becomes a man in a hat. A dragon becomes a dog on fire. Chaos is guaranteed.",
    tip: null,
  },
  {
    title: "🎉 The big reveal",
    visual: <RevealVisual />,
    body: "When everyone is done, each chain unravels for the whole group to see. Scroll through step by step and find the exact moment it all went hilariously wrong. Then immediately start another game.",
    tip: null,
  },
];

// ── Visuals ───────────────────────────────────────────────────────────────────

const NODES = [
  { icon: "✍️", label: "Type",   color: "#00f5ff" },
  { icon: "🎨", label: "Draw",   color: "#ff6ec7" },
  { icon: "✍️", label: "Type",   color: "#00f5ff" },
  { icon: "🎨", label: "Draw",   color: "#ff6ec7" },
  { icon: "🎉", label: "Reveal", color: "#ffe066" },
];

function OverviewVisual() {
  return (
    <ChainRow>
      {NODES.map((node, i) => (
        <React.Fragment key={i}>
          <ChainNode color={node.color} delay={i * 0.16}>
            <NodeIcon>{node.icon}</NodeIcon>
            <NodeLabel color={node.color}>{node.label}</NodeLabel>
          </ChainNode>
          {i < NODES.length - 1 && (
            <ChainArrow delay={i * 0.16 + 0.08}>→</ChainArrow>
          )}
        </React.Fragment>
      ))}
    </ChainRow>
  );
}

function TypeVisual() {
  const text = "A red wizard casting lightning at a sleeping dragon 🐉";
  const typed = useTypewriter(text, 38);
  const done = typed.length >= text.length;
  return (
    <MockScreen>
      <MockTop>
        <Badge color="#00f5ff">TYPING ROUND</Badge>
        <MockRound>Round 1 of 6</MockRound>
      </MockTop>
      <MockLabel>Start a new story — type anything:</MockLabel>
      <MockField>
        <MockTyped>{typed}</MockTyped>
        <Cursor done={done}>|</Cursor>
      </MockField>
      <MockFlow>↓ your sentence becomes the next player's drawing prompt</MockFlow>
    </MockScreen>
  );
}

function DrawVisual() {
  return (
    <MockScreen>
      <MockTop>
        <Badge color="#ff6ec7">DRAWING ROUND</Badge>
        <MockRound>Round 2 of 6</MockRound>
      </MockTop>
      <QuotedText>
        <QuoteBy>Alex wrote:</QuoteBy>
        <QuoteContent>"A wizard fighting a dragon 🐉"</QuoteContent>
      </QuotedText>
      <CanvasZone>
        <DrawSvg />
      </CanvasZone>
      <MockFlow>↓ next player only sees your drawing — not the text</MockFlow>
    </MockScreen>
  );
}

function DrawSvg() {
  return (
    <svg viewBox="0 0 260 72" style={{ width: "100%", overflow: "visible" }}>
      {/* Wizard body + arms */}
      <SvgPath d="M 55 68 L 55 46 M 43 56 L 67 56" stroke="#00f5ff" len={46} delay={0} />
      {/* Hat brim + cone */}
      <SvgPath d="M 44 46 L 66 46 M 44 46 L 55 26 L 66 46" stroke="#00f5ff" len={66} delay={0.28} />
      {/* Wizard head */}
      <SvgCircle cx={55} cy={50} r={5} stroke="#00f5ff" delay={0.16} />
      {/* Lightning bolt */}
      <SvgPath d="M 70 50 L 83 43 L 78 53 L 96 44" stroke="#ffe066" len={44} delay={0.62} />
      {/* Dragon body */}
      <SvgPath d="M 133 60 Q 158 36 183 60" stroke="#ff6ec7" len={70} delay={0.92} />
      {/* Dragon neck + head */}
      <SvgPath d="M 183 60 Q 196 50 202 55 L 213 48" stroke="#ff6ec7" len={48} delay={1.15} />
      {/* Dragon eye */}
      <SvgCircle cx={199} cy={53} r={2} stroke="#ff6ec7" delay={1.3} />
      {/* Dragon wing */}
      <SvgPath d="M 152 50 L 150 33 L 166 46" stroke="#ff6ec7" len={48} delay={1.44} />
      {/* Dragon tail */}
      <SvgPath d="M 133 60 L 118 69 L 112 62 L 104 68" stroke="#ff6ec7" len={40} delay={1.58} />
      {/* Dragon legs */}
      <SvgPath d="M 158 60 L 155 71 M 172 58 L 172 71" stroke="#ff6ec7" len={26} delay={1.72} />
    </svg>
  );
}

function TwistVisual() {
  const players = [
    { name: "You",    sees: "blank prompt",     does: "write a sentence", icon: "✍️", color: "#00f5ff" },
    { name: "Alex",   sees: "your sentence",    does: "draws it",         icon: "🎨", color: "#ff6ec7" },
    { name: "Sam",    sees: "Alex's drawing",   does: "types what they see", icon: "✍️", color: "#00f5ff" },
    { name: "Jordan", sees: "Sam's sentence",   does: "draws it",         icon: "🎨", color: "#ff6ec7" },
  ];
  return (
    <TwistGrid>
      {players.map((p, i) => (
        <PlayerCard key={i} color={p.color} delay={i * 0.18}>
          <span style={{ fontSize: "clamp(16px, 3vmin, 26px)" }}>{p.icon}</span>
          <PlayerName color={p.color}>{p.name}</PlayerName>
          <PlayerSees>sees: <em>{p.sees}</em></PlayerSees>
          <PlayerDoes>{p.does}</PlayerDoes>
        </PlayerCard>
      ))}
    </TwistGrid>
  );
}

const CHAIN = [
  { face: "😈", text: '"A wizard fighting a dragon"', dim: false, delay: 0 },
  { face: "🎨", text: "↓ Alex draws it…",             dim: true,  delay: 0.22 },
  { face: "🤔", text: '"A man in a hat near fire"',   dim: false, delay: 0.44 },
  { face: "🎨", text: "↓ Jordan draws it…",           dim: true,  delay: 0.66 },
  { face: "😂", text: '"A chef at a bonfire??"',      dim: false, delay: 0.88 },
];

function RevealVisual() {
  return (
    <RevealList>
      {CHAIN.map((item, i) => (
        <RevealRow key={i} delay={item.delay}>
          <RevealFace>{item.face}</RevealFace>
          <RevealText dim={item.dim}>{item.text}</RevealText>
        </RevealRow>
      ))}
    </RevealList>
  );
}

// ── SVG draw-animation helpers ────────────────────────────────────────────────

const SvgPath = styled.path<{ len: number; delay: number }>`
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: ${({ len }) => len};
  stroke-dashoffset: ${({ len }) => len};
  opacity: 0;
  animation: ${drawStroke} 0.45s ${({ delay }) => delay}s ease-out forwards;
`;

const SvgCircle = styled.circle<{ delay: number }>`
  fill: none;
  stroke-width: 2;
  stroke-dasharray: 32;
  stroke-dashoffset: 32;
  opacity: 0;
  animation: ${drawStroke} 0.4s ${({ delay }) => delay}s ease-out forwards;
`;

// ── Layout ────────────────────────────────────────────────────────────────────

const GuideWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
  padding: 2.5vmin 3.5vmin 3vmin;
  box-sizing: border-box;
  gap: 2vmin;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5vmin;
`;

const ProgressTrack = styled.div`
  flex: 1;
  height: 3px;
  background: rgba(0, 245, 255, 0.12);
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #00f5ff 0%, #ff6ec7 100%);
  border-radius: 2px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 6px #00f5ff;
`;

const StepCounter = styled.div`
  font-size: clamp(9px, 1.3vmin, 13px);
  color: rgba(0, 245, 255, 0.4);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  white-space: nowrap;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: rgba(0, 245, 255, 0.4);
  font-size: clamp(14px, 2.2vmin, 20px);
  cursor: pointer;
  padding: 0.4vmin 0.6vmin;
  line-height: 1;
  border-radius: 4px;
  transition: color 0.15s;
  &:hover { color: #00f5ff; }
`;

const SlideArea = styled.div<{ dir: "next" | "prev" }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2.5vmin;
  min-height: 0;
  animation: ${({ dir }) => dir === "next" ? slideInRight : slideInLeft} 0.28s ease-out;
`;

const VisualZone = styled.div`
  background: rgba(0, 245, 255, 0.03);
  border: 1.5px solid rgba(0, 245, 255, 0.18);
  border-radius: 1.2vmin;
  padding: 2.5vmin 3vmin;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 18vmin;
`;

const InfoZone = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.4vmin;
`;

const StepTitle = styled.h2`
  font-size: clamp(16px, 3vmin, 28px);
  color: #00f5ff;
  text-shadow: 0 0 12px rgba(0, 245, 255, 0.45);
  margin: 0;
`;

const StepBody = styled.p`
  font-size: clamp(12px, 1.85vmin, 17px);
  color: #c8d8f0;
  line-height: 1.65;
  margin: 0;
`;

const TipBox = styled.div`
  display: flex;
  gap: 1vmin;
  align-items: flex-start;
  background: rgba(255, 224, 102, 0.06);
  border: 1px solid rgba(255, 224, 102, 0.25);
  border-radius: 0.8vmin;
  padding: 1.2vmin 1.5vmin;
  font-size: clamp(11px, 1.6vmin, 15px);
  color: rgba(255, 224, 102, 0.85);
  line-height: 1.55;
`;

const NavZone = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const DotRow = styled.div`
  display: flex;
  gap: 1vmin;
  align-items: center;
`;

const Dot = styled.button<{ active: boolean; past: boolean }>`
  width: ${({ active }) => active ? "2.4vmin" : "1.4vmin"};
  height: ${({ active }) => active ? "2.4vmin" : "1.4vmin"};
  min-width: ${({ active }) => active ? "11px" : "7px"};
  min-height: ${({ active }) => active ? "11px" : "7px"};
  border-radius: 50%;
  background: ${({ active, past }) =>
    active ? "#00f5ff" : past ? "rgba(0,245,255,0.5)" : "rgba(0,245,255,0.2)"};
  box-shadow: ${({ active }) => active ? "0 0 8px #00f5ff" : "none"};
  border: none;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
`;

const BtnRow = styled.div`
  display: flex;
  gap: 1.5vmin;
`;

const NavBtn = styled.button`
  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
`;

// ── Chain overview ────────────────────────────────────────────────────────────

const ChainRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5vmin;
  flex-wrap: wrap;
  justify-content: center;
`;

const ChainNode = styled.div<{ color: string; delay: number }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8vmin;
  opacity: 0;
  animation: ${popIn} 0.45s ${({ delay }) => delay}s ease both;
`;

const NodeIcon = styled.div`
  font-size: clamp(20px, 4.5vmin, 40px);
`;

const NodeLabel = styled.div<{ color: string }>`
  font-size: clamp(8px, 1.2vmin, 13px);
  color: ${({ color }) => color};
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: bold;
`;

const ChainArrow = styled.div<{ delay: number }>`
  font-size: clamp(12px, 2.2vmin, 20px);
  color: rgba(0, 245, 255, 0.45);
  opacity: 0;
  animation:
    ${popIn} 0.3s ${({ delay }) => delay}s both,
    ${arrowPulse} 1.8s ${({ delay }) => delay + 0.5}s ease-in-out infinite;
`;

// ── Mock screen ───────────────────────────────────────────────────────────────

const MockScreen = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.4vmin;
`;

const MockTop = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5vmin;
  border-bottom: 1px solid rgba(0, 245, 255, 0.12);
  padding-bottom: 1vmin;
`;

const Badge = styled.span<{ color: string }>`
  font-size: clamp(7px, 1.05vmin, 11px);
  font-weight: bold;
  letter-spacing: 0.15em;
  padding: 0.3vmin 0.8vmin;
  border-radius: 0.4vmin;
  background: ${({ color }) => color}20;
  border: 1px solid ${({ color }) => color}55;
  color: ${({ color }) => color};
`;

const MockRound = styled.div`
  font-size: clamp(9px, 1.25vmin, 13px);
  color: #6688aa;
`;

const MockLabel = styled.div`
  font-size: clamp(9px, 1.3vmin, 13px);
  color: #6688aa;
`;

const MockField = styled.div`
  font-size: clamp(11px, 1.7vmin, 17px);
  color: #c8d8f0;
  padding: 0.8vmin 1.3vmin;
  border: 1.5px solid rgba(0, 245, 255, 0.35);
  border-radius: 0.6vmin;
  background: rgba(0, 245, 255, 0.04);
  display: flex;
  align-items: center;
  min-height: 3.5vmin;
`;

const MockTyped = styled.span``;

const Cursor = styled.span<{ done: boolean }>`
  color: #00f5ff;
  margin-left: 1px;
  ${({ done }) => !done && css`animation: ${blink} 0.75s step-end infinite;`}
  ${({ done }) => done && "opacity: 0;"}
`;

const MockFlow = styled.div`
  font-size: clamp(9px, 1.1vmin, 12px);
  color: rgba(0, 245, 255, 0.3);
  font-style: italic;
  text-align: center;
`;

const QuotedText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3vmin;
  padding: 0.8vmin 1.2vmin 0.8vmin 1.3vmin;
  border-left: 3px solid #00f5ff;
  background: rgba(0, 245, 255, 0.05);
  border-radius: 0 0.5vmin 0.5vmin 0;
`;

const QuoteBy = styled.div`
  font-size: clamp(8px, 1.1vmin, 12px);
  color: #6688aa;
`;

const QuoteContent = styled.div`
  font-size: clamp(11px, 1.6vmin, 16px);
  color: #00f5ff;
`;

const CanvasZone = styled.div`
  border: 1.5px dashed rgba(255, 110, 199, 0.28);
  border-radius: 0.8vmin;
  background: rgba(255, 110, 199, 0.02);
  padding: 1.2vmin 1.5vmin;
  display: flex;
  align-items: center;
`;

// ── Twist ─────────────────────────────────────────────────────────────────────

const TwistGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5vmin;
  width: 100%;
`;

const PlayerCard = styled.div<{ color: string; delay: number }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5vmin;
  padding: 1.5vmin 1vmin;
  border: 1px solid ${({ color }) => color}30;
  border-radius: 1vmin;
  background: ${({ color }) => color}08;
  opacity: 0;
  animation: ${popIn} 0.38s ${({ delay }) => delay}s both;
`;

const PlayerName = styled.div<{ color: string }>`
  font-size: clamp(10px, 1.5vmin, 15px);
  color: ${({ color }) => color};
  font-weight: bold;
`;

const PlayerSees = styled.div`
  font-size: clamp(8px, 1.15vmin, 12px);
  color: #6688aa;
  em { color: #c8d8f0; font-style: normal; }
`;

const PlayerDoes = styled.div`
  font-size: clamp(8px, 1.15vmin, 12px);
  color: rgba(200, 216, 240, 0.5);
  font-style: italic;
`;

// ── Reveal ────────────────────────────────────────────────────────────────────

const RevealList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8vmin;
  width: 100%;
`;

const RevealRow = styled.div<{ delay: number }>`
  display: flex;
  align-items: center;
  gap: 1.2vmin;
  opacity: 0;
  animation: ${rowReveal} 0.38s ${({ delay }) => delay}s both;
`;

const RevealFace = styled.span`
  font-size: clamp(14px, 2.2vmin, 22px);
  width: 3vmin;
  min-width: 18px;
  text-align: center;
  flex-shrink: 0;
`;

const RevealText = styled.span<{ dim: boolean }>`
  font-size: clamp(10px, 1.5vmin, 16px);
  color: ${({ dim }) => dim ? "rgba(0,245,255,0.3)" : "#c8d8f0"};
  font-style: ${({ dim }) => dim ? "italic" : "normal"};
`;
