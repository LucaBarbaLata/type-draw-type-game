import React from "react";
import styled, { keyframes } from "styled-components";

import { PlayerInfo, StoryContent, StoryElement } from "./model";
import Player from "./Player";
import Scrollable from "./Scrollable";
import NewlineToBreak from "./NewLineToBreak";
import DrawingReplay from "./replay/DrawingReplay";
import { EmojiCascade } from "./EmojiCascade";

const REACTIONS = ["👍", "❤️", "😂", "🔥", "😮"];

const Stories = ({
  stories,
  onReveal,
  onLikeDrawing,
  onRematch,
  onMainMenu,
  rematchVoters,
  totalPlayers,
}: {
  stories: StoryContent[];
  onReveal?: () => void;
  onLikeDrawing?: (storyIndex: number, elementIndex: number, reaction: string) => void;
  onRematch?: () => void;
  onMainMenu?: () => void;
  rematchVoters?: PlayerInfo[];
  totalPlayers?: number;
}) => {
  const [hasVotedRematch, setHasVotedRematch] = React.useState(false);
  // Track the current player's chosen reaction per element: key = "storyIdx_elemIdx" -> emoji | null
  const [myReactions, setMyReactions] = React.useState<Record<string, string | null>>({});
  // Active emoji cascade effects: [{id, emoji}]
  const [cascades, setCascades] = React.useState<Array<{ id: number; emoji: string }>>([]);
  const nextCascadeId = React.useRef(0);
  // Track previous reaction counts to detect incoming reactions from other players
  const prevReactionsRef = React.useRef<Record<string, Record<string, number>> | null>(null);
  // Keys of local reactions already cascaded — suppress the server-echo for those
  const suppressNextCascadeRef = React.useRef<Set<string>>(new Set());

  // Detect reaction count increases pushed by the server and cascade them for all viewers
  React.useEffect(() => {
    const newReactions: Record<string, Record<string, number>> = {};
    stories.forEach((story, storyIdx) => {
      story.elements.forEach((element, elemIdx) => {
        newReactions[`${storyIdx}_${elemIdx}`] = element.reactions ?? {};
      });
    });

    const prev = prevReactionsRef.current;
    if (prev !== null) {
      for (const [key, elementReactions] of Object.entries(newReactions)) {
        const prevElementReactions = prev[key] ?? {};
        for (const [emoji, count] of Object.entries(elementReactions)) {
          if (count > (prevElementReactions[emoji] ?? 0)) {
            const suppressKey = `${key}_${emoji}`;
            if (suppressNextCascadeRef.current.has(suppressKey)) {
              suppressNextCascadeRef.current.delete(suppressKey);
            } else {
              const id = nextCascadeId.current++;
              setCascades(c => [...c, { id, emoji }]);
            }
          }
        }
      }
    }

    prevReactionsRef.current = newReactions;
  }, [stories]);

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

  return (
    <>
    <Scrollable ref={scrollableRef}>
      {navButtons}
      <h1>
        Story {selectedStory + 1} of {stories.length}
      </h1>
      <Story
        story={currentStory}
        storyIndex={selectedStory}
        revealedCount={revealedCount}
        myReactions={myReactions}
        onReact={onLikeDrawing ? (elemIdx, reaction) => {
          const key = `${selectedStory}_${elemIdx}`;
          const isAdding = myReactions[key] !== reaction;
          setMyReactions(prev => {
            const current = prev[key];
            return { ...prev, [key]: current === reaction ? null : reaction };
          });
          onLikeDrawing(selectedStory, elemIdx, reaction);
          // Only cascade when adding (not removing) a reaction
          if (isAdding) {
            const id = nextCascadeId.current++;
            setCascades(prev => [...prev, { id, emoji: reaction }]);
            // Suppress the server-echo cascade for this same reaction (we already showed it)
            suppressNextCascadeRef.current.add(`${key}_${reaction}`);
          }
        } : undefined}
      />
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
      <EndButtons>
        {onMainMenu && (
          <button className="button" onClick={onMainMenu}>
            ⌂ Main Menu
          </button>
        )}
        {onRematch && (
          <PlayAgainButton
            className="button button-red"
            onClick={() => { if (!hasVotedRematch) { setHasVotedRematch(true); onRematch(); } }}
            disabled={hasVotedRematch}
          >
            {hasVotedRematch ? "Waiting for others..." : "▶ Play Again"}
          </PlayAgainButton>
        )}
      </EndButtons>
      {onRematch && rematchVoters !== undefined && totalPlayers !== undefined && totalPlayers > 1 && (
        <RematchVoteStatus>
          {rematchVoters.length === 0
            ? `0 / ${totalPlayers} want to play again`
            : `${rematchVoters.map(p => p.name).join(", ")} want${rematchVoters.length === 1 ? "s" : ""} to play again (${rematchVoters.length}/${totalPlayers})`
          }
        </RematchVoteStatus>
      )}
    </Scrollable>
    {cascades.map((c) => (
      <EmojiCascade
        key={c.id}
        emoji={c.emoji}
        onDone={() => setCascades((prev) => prev.filter((x) => x.id !== c.id))}
      />
    ))}
    </>
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

const EndButtons = styled.div`
  display: flex;
  gap: 3vmin;
  justify-content: center;
  flex-wrap: wrap;
  margin: 2vmin 0 1vmin;
`;

const PlayAgainButton = styled.button`
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const RematchVoteStatus = styled.div`
  font-size: 1.8vmin;
  color: #6688aa;
  text-align: center;
  letter-spacing: 0.05em;
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
  storyIndex,
  revealedCount,
  myReactions,
  onReact,
}: {
  story: StoryContent;
  storyIndex: number;
  revealedCount: number;
  myReactions: Record<string, string | null>;
  onReact?: (elemIdx: number, reaction: string) => void;
}) => (
  <StyledStory>
    {story.elements.slice(0, revealedCount).map((e, index) => (
      <AnimatedElement key={index}>
        <StoryElementComponent
          element={e}
          myReaction={myReactions[`${storyIndex}_${index}`] ?? null}
          onReact={e.type === "image" && onReact ? (r) => onReact(index, r) : undefined}
        />
      </AnimatedElement>
    ))}
  </StyledStory>
);

const StoryElementComponent = ({
  element,
  myReaction,
  onReact,
}: {
  element: StoryElement;
  myReaction?: string | null;
  onReact?: (reaction: string) => void;
}) => {
  if (element.type === "text") {
    return (
      <TextStoryElement>
        <Player face={element.player.face}>{element.player.name} typed:</Player>
        <div className="field">{NewlineToBreak(element.content)}</div>
      </TextStoryElement>
    );
  }

  const reactionBar = (
    <ReactionRow>
      {REACTIONS.map((emoji) => {
        const count = element.reactions?.[emoji] ?? 0;
        const active = myReaction === emoji;
        return (
          <ReactionButton key={emoji} $active={active} onClick={() => onReact?.(emoji)} title={emoji}>
            {emoji}{count > 0 && <ReactionCount>{count}</ReactionCount>}
          </ReactionButton>
        );
      })}
    </ReactionRow>
  );

  if (element.replayUrl) {
    return (
      <ImageStoryElement>
        <Player face={element.player.face}>{element.player.name} painted:</Player>
        <DrawingReplay replayUrl={element.replayUrl} staticFallback={element.content} />
        {reactionBar}
      </ImageStoryElement>
    );
  }

  return (
    <ImageStoryElement>
      <Player face={element.player.face}>{element.player.name} painted:</Player>
      <img src={element.content} alt="Drawing" />
      {reactionBar}
    </ImageStoryElement>
  );
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

const ReactionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.2vmin;
  margin-top: 1.5vmin;
  flex-wrap: wrap;
`;

const ReactionButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  background: ${({ $active }) => $active ? "rgba(0, 245, 255, 0.15)" : "none"};
  border: 1.5px solid ${({ $active }) => $active ? "rgba(0, 245, 255, 0.8)" : "rgba(0, 245, 255, 0.3)"};
  border-radius: 2vmin;
  font-size: 2.2vmin;
  padding: 0.4vmin 1.2vmin;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
  box-shadow: ${({ $active }) => $active ? "0 0 10px rgba(0, 245, 255, 0.35)" : "none"};

  &:hover {
    background: rgba(0, 245, 255, 0.12);
    border-color: rgba(0, 245, 255, 0.7);
    box-shadow: 0 0 8px rgba(0, 245, 255, 0.25);
  }
`;

const ReactionCount = styled.span`
  font-size: 1.6vmin;
  color: var(--cyber-cyan);
  text-shadow: 0 0 6px rgba(0, 245, 255, 0.5);
  min-width: 1.5ch;
  line-height: 1;
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
