import React from "react";
import styled from "styled-components";

import Dialog from "./Dialog";
import Scrollable from "./Scrollable";

// ── Step definitions (populated after visual components are declared) ────────
// See bottom of file for OverviewVisual, TypeVisual, etc.

// ── Main component ────────────────────────────────────────────────────────────

const HowToButtonAndDialog = () => {
  const [show, setShow] = React.useState(false);
  const [step, setStep] = React.useState(0);

  const close = () => { setShow(false); setStep(0); };

  const currentStep = STEPS[step];

  return (
    <>
      <Dialog show={show}>
        <Scrollable>
          <GuideWrapper>
            <StepCounter>{step + 1} / {STEPS.length}</StepCounter>

            <VisualBox>{currentStep.visual}</VisualBox>

            <StepTitle>{currentStep.title}</StepTitle>
            <StepBody>{currentStep.body}</StepBody>

            <DotRow>
              {STEPS.map((_, i) => (
                <Dot key={i} active={i === step} onClick={() => setStep(i)} />
              ))}
            </DotRow>

            <NavRow>
              <NavButton
                className="button button-red"
                disabled={step === 0}
                onClick={() => setStep((s) => s - 1)}
              >
                ← Back
              </NavButton>
              {step < STEPS.length - 1 ? (
                <NavButton className="button" onClick={() => setStep((s) => s + 1)}>
                  Next →
                </NavButton>
              ) : (
                <NavButton className="button" onClick={close}>
                  Let's play! 🎮
                </NavButton>
              )}
            </NavRow>
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

// ── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  {
    title: "What is Type Draw Type?",
    visual: <OverviewVisual />,
    body: "A chain-reaction party game! Each round you either type a sentence or draw one — passed from player to player. Watch stories transform in hilariously unexpected ways.",
  },
  {
    title: "✍️ Typing rounds",
    visual: <TypeVisual />,
    body: 'You\'ll see a drawing (or start a fresh chain) and type what you see. Be creative — "A wizard fighting a dragon" is a great start!',
  },
  {
    title: "🎨 Drawing rounds",
    visual: <DrawVisual />,
    body: "You receive a sentence and draw your best interpretation on a blank canvas. The next player only sees your drawing — they won't know the original words!",
  },
  {
    title: "🔍 The twist",
    visual: <TwistVisual />,
    body: "Each player only ever sees the step before theirs — never the full chain. Meanings drift. A wizard becomes a man in a hat. Chaos ensues.",
  },
  {
    title: "🎉 The big reveal",
    visual: <RevealVisual />,
    body: "When everyone's done, the full chain is revealed story by story. Scroll through and see exactly where things went gloriously wrong!",
  },
];

// ── Step visuals ──────────────────────────────────────────────────────────────

function OverviewVisual() {
  return (
    <ChainRow>
      <ChainStep color="#00f5ff">✍️<ChainLabel>Type</ChainLabel></ChainStep>
      <Arrow>→</Arrow>
      <ChainStep color="#ff6ec7">🎨<ChainLabel>Draw</ChainLabel></ChainStep>
      <Arrow>→</Arrow>
      <ChainStep color="#00f5ff">✍️<ChainLabel>Type</ChainLabel></ChainStep>
      <Arrow>→</Arrow>
      <ChainStep color="#ff6ec7">🎨<ChainLabel>Draw</ChainLabel></ChainStep>
      <Arrow>→</Arrow>
      <ChainStep color="#ffe066">🎉<ChainLabel>Reveal</ChainLabel></ChainStep>
    </ChainRow>
  );
}

function TypeVisual() {
  return (
    <MockScreen>
      <MockHeader>Round 1 of 6 &nbsp;·&nbsp; <Accent>TYPE</Accent></MockHeader>
      <MockLabel>Start a new story — type anything:</MockLabel>
      <MockInput>"A wizard fighting a dragon 🐉"</MockInput>
      <MockHint>Your sentence gets passed to the next player to draw!</MockHint>
    </MockScreen>
  );
}

function DrawVisual() {
  return (
    <MockScreen>
      <MockHeader>Round 2 of 6 &nbsp;·&nbsp; <Accent color="#ff6ec7">DRAW</Accent></MockHeader>
      <MockLabel>Alex wrote:</MockLabel>
      <MockQuote>"A wizard fighting a dragon 🐉"</MockQuote>
      <MockCanvas>🎨 draw here</MockCanvas>
      <MockHint>The next player only sees your drawing — not the text!</MockHint>
    </MockScreen>
  );
}

function TwistVisual() {
  return (
    <TwistLayout>
      <TwistRow>
        <TwistBox dim>Original<br /><TwistQuote>"A wizard fighting a dragon"</TwistQuote></TwistBox>
        <TwistArrow>→</TwistArrow>
        <TwistBox><span style={{ fontSize: "3vmin" }}>🎨</span><br />Alex draws it</TwistBox>
      </TwistRow>
      <TwistRow>
        <TwistBox><span style={{ fontSize: "3vmin" }}>🖼️</span><br />Sam sees only the drawing</TwistBox>
        <TwistArrow>→</TwistArrow>
        <TwistBox dim>Sam writes<br /><TwistQuote>"A man in a hat near fire?"</TwistQuote></TwistBox>
      </TwistRow>
    </TwistLayout>
  );
}

function RevealVisual() {
  return (
    <RevealChain>
      <RevealRow><RevealFace>😈</RevealFace><RevealText>"A wizard fighting a dragon"</RevealText></RevealRow>
      <RevealArrow>↓ drawn by Alex</RevealArrow>
      <RevealRow><RevealFace>🎨</RevealFace><RevealText dim>[ Alex's drawing ]</RevealText></RevealRow>
      <RevealArrow>↓ described by Sam</RevealArrow>
      <RevealRow><RevealFace>🤔</RevealFace><RevealText>"A man in a hat near fire?"</RevealText></RevealRow>
      <RevealArrow>↓ drawn by …</RevealArrow>
      <RevealRow><RevealFace>😂</RevealFace><RevealText dim>[ keeps going … ]</RevealText></RevealRow>
    </RevealChain>
  );
}

// ── Styled components ─────────────────────────────────────────────────────────

const GuideWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2.5vmin;
  padding: 3vmin 4vmin 4vmin;
  min-height: 100%;
  box-sizing: border-box;
`;

const StepCounter = styled.div`
  font-size: 1.4vmin;
  color: rgba(0, 245, 255, 0.4);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  align-self: flex-end;
`;

const VisualBox = styled.div`
  width: 100%;
  min-height: 18vmin;
  background: rgba(0, 245, 255, 0.03);
  border: 1.5px solid rgba(0, 245, 255, 0.2);
  border-radius: 1.5vmin;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2vmin;
  box-sizing: border-box;
`;

const StepTitle = styled.h2`
  font-size: 2.8vmin;
  color: #00f5ff;
  text-shadow: 0 0 10px rgba(0, 245, 255, 0.5);
  margin: 0;
  text-align: center;
`;

const StepBody = styled.p`
  font-size: 1.9vmin;
  color: #c8d8f0;
  text-align: center;
  line-height: 1.6;
  margin: 0;
  max-width: 70vmin;
`;

const DotRow = styled.div`
  display: flex;
  gap: 1.2vmin;
  align-items: center;
`;

const Dot = styled.button<{ active: boolean }>`
  width: ${({ active }) => (active ? "2.2vmin" : "1.4vmin")};
  height: ${({ active }) => (active ? "2.2vmin" : "1.4vmin")};
  min-width: ${({ active }) => (active ? "10px" : "7px")};
  min-height: ${({ active }) => (active ? "10px" : "7px")};
  border-radius: 50%;
  background: ${({ active }) => (active ? "#00f5ff" : "rgba(0, 245, 255, 0.25)")};
  box-shadow: ${({ active }) => (active ? "0 0 8px #00f5ff" : "none")};
  border: none;
  cursor: pointer;
  padding: 0;
  transition: all 0.15s;
`;

const NavRow = styled.div`
  display: flex;
  gap: 2vmin;
  align-items: center;
`;

const NavButton = styled.button`
  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
`;

// Chain diagram
const ChainRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5vmin;
  flex-wrap: wrap;
  justify-content: center;
`;

const ChainStep = styled.div<{ color: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5vmin;
  font-size: 3.5vmin;
  color: ${({ color }) => color};
`;

const ChainLabel = styled.span`
  font-size: 1.3vmin;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const Arrow = styled.span`
  font-size: 2vmin;
  color: rgba(0, 245, 255, 0.4);
`;

// Mock screens
const MockScreen = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.2vmin;
`;

const MockHeader = styled.div`
  font-size: 1.4vmin;
  color: #6688aa;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(0, 245, 255, 0.15);
  padding-bottom: 0.8vmin;
`;

const Accent = styled.span<{ color?: string }>`
  color: ${({ color }) => color ?? "#00f5ff"};
  font-weight: bold;
`;

const MockLabel = styled.div`
  font-size: 1.5vmin;
  color: #6688aa;
`;

const MockInput = styled.div`
  font-size: 1.8vmin;
  color: #c8d8f0;
  padding: 1vmin 1.5vmin;
  border: 1.5px solid rgba(0, 245, 255, 0.4);
  border-radius: 0.8vmin;
  background: rgba(0, 245, 255, 0.04);
`;

const MockQuote = styled.div`
  font-size: 1.8vmin;
  color: #00f5ff;
  padding: 0.8vmin 1.5vmin;
  background: rgba(0, 245, 255, 0.07);
  border-left: 3px solid #00f5ff;
  border-radius: 0 0.5vmin 0.5vmin 0;
`;

const MockCanvas = styled.div`
  font-size: 1.6vmin;
  color: rgba(0, 245, 255, 0.3);
  border: 1.5px dashed rgba(0, 245, 255, 0.25);
  border-radius: 0.8vmin;
  padding: 2vmin;
  text-align: center;
  letter-spacing: 0.1em;
`;

const MockHint = styled.div`
  font-size: 1.3vmin;
  color: rgba(200, 216, 240, 0.45);
  font-style: italic;
`;

// Twist step
const TwistLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5vmin;
  width: 100%;
`;

const TwistRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5vmin;
`;

const TwistBox = styled.div<{ dim?: boolean }>`
  flex: 1;
  text-align: center;
  font-size: 1.4vmin;
  color: ${({ dim }) => (dim ? "#6688aa" : "#c8d8f0")};
  padding: 1vmin;
  background: rgba(0, 245, 255, 0.03);
  border: 1px solid rgba(0, 245, 255, 0.15);
  border-radius: 0.8vmin;
  line-height: 1.6;
`;

const TwistQuote = styled.div`
  font-style: italic;
  color: #00f5ff;
  margin-top: 0.3vmin;
`;

const TwistArrow = styled.span`
  font-size: 2vmin;
  color: rgba(0, 245, 255, 0.4);
  flex-shrink: 0;
`;

// Reveal step
const RevealChain = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.4vmin;
  width: 100%;
`;

const RevealRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.2vmin;
`;

const RevealFace = styled.span`
  font-size: 2.2vmin;
  width: 3vmin;
  text-align: center;
`;

const RevealText = styled.span<{ dim?: boolean }>`
  font-size: 1.5vmin;
  color: ${({ dim }) => (dim ? "rgba(0,245,255,0.35)" : "#c8d8f0")};
  font-style: ${({ dim }) => (dim ? "italic" : "normal")};
`;

const RevealArrow = styled.div`
  font-size: 1.3vmin;
  color: rgba(0, 245, 255, 0.35);
  padding-left: 1.2vmin;
  letter-spacing: 0.08em;
`;
