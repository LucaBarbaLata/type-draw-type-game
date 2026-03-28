import React from "react";
import styled, { keyframes } from "styled-components";
import { useNavigate } from "react-router-dom";

import { StoryContent, StoryElement } from "./model";
import Player from "./Player";
import Scrollable from "./Scrollable";
import NewlineToBreak from "./NewLineToBreak";

const Stories = ({ stories, onReveal }: { stories: StoryContent[]; onReveal?: () => void }) => {
  const [selectedStory, setSelectedStory] = React.useState(0);
  const [revealedCount, setRevealedCount] = React.useState(1);

  const scrollableRef = React.useRef<HTMLDivElement>(null);

  const setSelectedStoryAndScrollToTop = (storyIndex: number) => {
    setSelectedStory(storyIndex);
    setRevealedCount(1);
    if (scrollableRef.current !== null) {
      scrollableRef.current.scrollTo(0, 0);
    }
  };

  const currentStory = stories[selectedStory];
  const totalElements = currentStory.elements.length;
  const allRevealed = revealedCount >= totalElements;

  const navButtons = (
    <StoryNavButtons
      selectedIndex={selectedStory}
      items={stories}
      handleNav={setSelectedStoryAndScrollToTop}
    />
  );

  const navigate = useNavigate();

  return (
    <Scrollable ref={scrollableRef}>
      {navButtons}
      <h1>
        Story {selectedStory + 1} of {stories.length}
      </h1>
      <Story story={currentStory} revealedCount={revealedCount} />
      {!allRevealed && (
        <RevealControls>
          <button
            className="button"
            onClick={() => { onReveal?.(); setRevealedCount((c) => Math.min(c + 1, totalElements)); }}
          >
            Reveal next ▼
          </button>
          <SkipButton onClick={() => setRevealedCount(totalElements)}>
            Reveal all
          </SkipButton>
        </RevealControls>
      )}
      {allRevealed && (
        <ExportButton onClick={() => exportStory(currentStory, selectedStory)}>
          ↓ Download story as image
        </ExportButton>
      )}
      {navButtons}
      <StartNewButton className="button button-red" onClick={() => navigate("/")}>
        Start a new game
      </StartNewButton>
    </Scrollable>
  );
};

export default Stories;

async function exportStory(story: StoryContent, storyIndex: number) {
  const W = 900;
  const PAD = 40;
  const contentW = W - PAD * 2;
  const HEADER_H = 36;
  const TEXT_LINE_H = 22;
  const ELEMENT_GAP = 32;

  // Load all images up front
  const imageMap = new Map<string, HTMLImageElement>();
  await Promise.all(
    story.elements
      .filter((e) => e.type === "image")
      .map(
        (e) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => { imageMap.set(e.content, img); resolve(); };
            img.onerror = () => resolve();
            img.src = e.content;
          })
      )
  );

  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    const result: string[] = [];
    for (const paragraph of text.split("\n")) {
      if (!paragraph) { result.push(""); continue; }
      const words = paragraph.split(" ");
      let line = "";
      for (const word of words) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > maxW && line) {
          result.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      result.push(line);
    }
    return result;
  }

  // Calculate total canvas height with a temp canvas for text measurement
  const tmpCanvas = document.createElement("canvas");
  const tmpCtx = tmpCanvas.getContext("2d")!;
  tmpCtx.font = "16px monospace";

  let totalH = PAD;
  for (const e of story.elements) {
    let h = HEADER_H;
    if (e.type === "image") {
      const img = imageMap.get(e.content);
      h += img ? Math.round((img.height / img.width) * contentW) : 100;
    } else {
      h += wrapText(tmpCtx, e.content, contentW).length * TEXT_LINE_H + 12;
    }
    totalH += h + ELEMENT_GAP;
  }
  totalH += PAD - ELEMENT_GAP;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#080818";
  ctx.fillRect(0, 0, W, totalH);

  let y = PAD;
  for (let i = 0; i < story.elements.length; i++) {
    const e = story.elements[i];

    if (i > 0) {
      ctx.strokeStyle = "rgba(0, 245, 255, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, y - ELEMENT_GAP / 2);
      ctx.lineTo(W - PAD, y - ELEMENT_GAP / 2);
      ctx.stroke();
    }

    ctx.font = "bold 14px monospace";
    ctx.fillStyle = "#00f5ff";
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 6;
    ctx.fillText(`${e.player.name} ${e.type === "text" ? "typed:" : "painted:"}`, PAD, y + 22);
    ctx.shadowBlur = 0;
    y += HEADER_H;

    if (e.type === "image") {
      const img = imageMap.get(e.content);
      if (img) {
        const imgH = Math.round((img.height / img.width) * contentW);
        const r = 8;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(PAD + r, y); ctx.lineTo(PAD + contentW - r, y);
        ctx.arcTo(PAD + contentW, y, PAD + contentW, y + r, r);
        ctx.lineTo(PAD + contentW, y + imgH - r);
        ctx.arcTo(PAD + contentW, y + imgH, PAD + contentW - r, y + imgH, r);
        ctx.lineTo(PAD + r, y + imgH);
        ctx.arcTo(PAD, y + imgH, PAD, y + imgH - r, r);
        ctx.lineTo(PAD, y + r);
        ctx.arcTo(PAD, y, PAD + r, y, r);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, PAD, y, contentW, imgH);
        ctx.restore();
        ctx.strokeStyle = "rgba(0, 245, 255, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(PAD + r, y); ctx.lineTo(PAD + contentW - r, y);
        ctx.arcTo(PAD + contentW, y, PAD + contentW, y + r, r);
        ctx.lineTo(PAD + contentW, y + imgH - r);
        ctx.arcTo(PAD + contentW, y + imgH, PAD + contentW - r, y + imgH, r);
        ctx.lineTo(PAD + r, y + imgH);
        ctx.arcTo(PAD, y + imgH, PAD, y + imgH - r, r);
        ctx.lineTo(PAD, y + r);
        ctx.arcTo(PAD, y, PAD + r, y, r);
        ctx.closePath();
        ctx.stroke();
        y += imgH;
      }
    } else {
      ctx.font = "16px monospace";
      ctx.fillStyle = "#c8d8f0";
      const lines = wrapText(ctx, e.content, contentW);
      for (const line of lines) {
        ctx.fillText(line, PAD, y + 16);
        y += TEXT_LINE_H;
      }
      y += 12;
    }

    y += ELEMENT_GAP;
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `story-${storyIndex + 1}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const StartNewButton = styled.button`
  margin-bottom: 2vmin;
`;

const ExportButton = styled.button`
  background: none;
  border: 1.5px solid rgba(0, 245, 255, 0.4);
  border-radius: 0.8vmin;
  color: rgba(0, 245, 255, 0.7);
  font-size: 1.8vmin;
  padding: 1vmin 2.5vmin;
  cursor: pointer;
  letter-spacing: 0.06em;
  margin: 2vmin 0;
  transition: color 0.15s, border-color 0.15s, box-shadow 0.15s;

  &:hover {
    color: #00f5ff;
    border-color: #00f5ff;
    box-shadow: 0 0 10px rgba(0, 245, 255, 0.3);
  }
`;

const RevealControls = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2vmin;
  margin: 2vmin 0;
`;

const SkipButton = styled.button`
  background: none;
  border: none;
  color: #3d5570;
  font-size: 1.8vmin;
  cursor: pointer;
  text-decoration: underline;
  letter-spacing: 0.06em;
  transition: color 0.15s;

  &:hover {
    color: #6688aa;
  }
`;

const StyledStory = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const AnimatedElement = styled.div`
  animation: ${fadeIn} 0.4s ease both;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Story = ({
  story,
  revealedCount,
}: {
  story: StoryContent;
  revealedCount: number;
}) => (
  <StyledStory>
    {story.elements.slice(0, revealedCount).map((e, index) => (
      <AnimatedElement key={index}>
        <StoryElementComponent element={e} />
      </AnimatedElement>
    ))}
  </StyledStory>
);

const StoryElementComponent = ({ element }: { element: StoryElement }) => {
  if (element.type === "text") {
    return (
      <TextStoryElement>
        <Player face={element.player.face}>{element.player.name} typed:</Player>
        <div className="field">{NewlineToBreak(element.content)}</div>
      </TextStoryElement>
    );
  } else {
    return (
      <ImageStoryElement>
        <Player face={element.player.face}>
          {element.player.name} painted:
        </Player>
        <img src={element.content} alt="Drawing" />
      </ImageStoryElement>
    );
  }
};

const TextStoryElement = styled.div`
  margin: 3vmin 0;
  width: 80vw;

  .field {
    margin-top: 1vmin;
  }
`;

const ImageStoryElement = styled.div`
  margin: 3vmin 0;
  width: 80vw;

  img {
    margin-top: 1vmin;
    max-height: 100vh;
    max-width: 80vw;
    border: 1.5px solid rgba(0, 245, 255, 0.5);
    border-radius: 1vmin;
    box-shadow: 0 0 16px rgba(0, 245, 255, 0.2), 0 0 40px rgba(0, 245, 255, 0.06);
  }
`;

const NavButtons = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  .button {
    margin: 2vmin;
  }
`;

const StoryNavButtons = ({
  selectedIndex,
  items,
  handleNav,
}: {
  selectedIndex: number;
  items: object[];
  handleNav: (index: number) => void;
}) => (
  <NavButtons>
    <button
      className="button"
      onClick={() => handleNav(selectedIndex - 1)}
      disabled={selectedIndex === 0}
    >
      ⇦
    </button>
    {items.map((_item, index) => (
      <button
        key={index}
        className="button"
        onClick={() => handleNav(index)}
        disabled={selectedIndex === index}
      >
        {index + 1}
      </button>
    ))}
    <button
      className="button"
      onClick={() => handleNav(selectedIndex + 1)}
      disabled={selectedIndex === items.length - 1}
    >
      ⇨
    </button>
  </NavButtons>
);
