import React from "react";
import styled, { keyframes } from "styled-components";
import { useNavigate } from "react-router-dom";

import { StoryContent, StoryElement } from "./model";
import Player from "./Player";
import Scrollable from "./Scrollable";
import NewlineToBreak from "./NewLineToBreak";

const Stories = ({
  stories,
  votesByStory,
  onVote,
}: {
  stories: StoryContent[];
  votesByStory: number[];
  onVote: (storyIndex: number) => void;
}) => {
  const [selectedStory, setSelectedStory] = React.useState(0);
  const [revealedCount, setRevealedCount] = React.useState(1);
  const [myVote, setMyVote] = React.useState<number | null>(null);

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

  const handleRevealNext = () => {
    setRevealedCount((c) => Math.min(c + 1, totalElements));
  };

  const handleRevealAll = () => {
    setRevealedCount(totalElements);
  };

  const handleVote = (storyIndex: number) => {
    if (myVote !== null) return;
    setMyVote(storyIndex);
    onVote(storyIndex);
  };

  const navButtons = (
    <StoryNavButtons
      selectedIndex={selectedStory}
      items={stories}
      handleNav={setSelectedStoryAndScrollToTop}
    />
  );

  const navigate = useNavigate();

  const handleNewGame = () => {
    navigate("/");
  };

  const handleDownload = () => {
    downloadStory(currentStory, selectedStory + 1);
  };

  const votes = votesByStory[selectedStory] ?? 0;
  const hasVotedThis = myVote === selectedStory;

  return (
    <Scrollable ref={scrollableRef}>
      {navButtons}
      <StoryHeader>
        <h1>
          Story {selectedStory + 1} of {stories.length}
        </h1>
        <VoteArea>
          <VoteButton
            onClick={() => handleVote(selectedStory)}
            active={hasVotedThis}
            disabled={myVote !== null}
            title={myVote !== null ? "Already voted" : "Vote for this story"}
          >
            ❤️ {votes > 0 ? votes : ""}
          </VoteButton>
          <DownloadButton onClick={handleDownload} title="Download this story">
            ⬇ Download
          </DownloadButton>
        </VoteArea>
      </StoryHeader>
      <Story
        story={currentStory}
        revealedCount={revealedCount}
      />
      {!allRevealed && (
        <RevealControls>
          <button className="button" onClick={handleRevealNext}>
            Reveal next ▼
          </button>
          <SkipButton onClick={handleRevealAll}>Reveal all</SkipButton>
        </RevealControls>
      )}
      {navButtons}
      <StartNewButton className="button button-red" onClick={handleNewGame}>
        Start a new game
      </StartNewButton>
    </Scrollable>
  );
};

export default Stories;

async function downloadStory(story: StoryContent, storyNumber: number) {
  const CARD_WIDTH = 800;
  const ELEMENT_HEIGHT = 400;
  const PADDING = 20;
  const HEADER_HEIGHT = 60;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = HEADER_HEIGHT + story.elements.length * (ELEMENT_HEIGHT + PADDING) + PADDING;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, canvas.width, HEADER_HEIGHT);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Story ${storyNumber}`, CARD_WIDTH / 2, 38);

  let y = HEADER_HEIGHT + PADDING;

  for (const element of story.elements) {
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(PADDING, y, CARD_WIDTH - PADDING * 2, ELEMENT_HEIGHT);

    ctx.fillStyle = "#333";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "left";
    const label = element.type === "text"
      ? `${element.player.name} typed:`
      : `${element.player.name} drew:`;
    ctx.fillText(label, PADDING * 2, y + 28);

    if (element.type === "text") {
      ctx.fillStyle = "#111";
      ctx.font = "18px sans-serif";
      const words = element.content.split(" ");
      let line = "";
      let lineY = y + 60;
      const maxWidth = CARD_WIDTH - PADDING * 4;
      for (const word of words) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line, PADDING * 2, lineY);
          line = word;
          lineY += 24;
          if (lineY > y + ELEMENT_HEIGHT - 10) break;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, PADDING * 2, lineY);
    } else {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const imgH = ELEMENT_HEIGHT - 50;
          const imgW = Math.min(img.width * (imgH / img.height), CARD_WIDTH - PADDING * 4);
          ctx.drawImage(img, PADDING * 2, y + 40, imgW, imgH);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = element.content;
      });
    }

    y += ELEMENT_HEIGHT + PADDING;
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `story-${storyNumber}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const StartNewButton = styled.button`
  margin-bottom: 2vmin;
`;

const StoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 80vw;
  flex-wrap: wrap;
  gap: 2vmin;

  h1 {
    margin: 0;
  }
`;

const VoteArea = styled.div`
  display: flex;
  align-items: center;
  gap: 2vmin;
`;

const VoteButton = styled.button<{ active: boolean }>`
  background: ${({ active }) => (active ? "#e91e63" : "#555")};
  color: white;
  border: none;
  border-radius: 2vmin;
  padding: 1vmin 2vmin;
  font-size: 2.5vmin;
  cursor: ${({ disabled }) => (disabled ? "default" : "pointer")};
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
  transition: background 0.2s;
`;

const DownloadButton = styled.button`
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 2vmin;
  padding: 1vmin 2vmin;
  font-size: 2vmin;
  cursor: pointer;
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
  color: #888;
  font-size: 1.8vmin;
  cursor: pointer;
  text-decoration: underline;
`;

const StyledStory = styled.div`
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
}) => {
  return (
    <StyledStory>
      {story.elements.slice(0, revealedCount).map((e, index) => (
        <AnimatedElement key={index}>
          <StoryElementComponent element={e} />
        </AnimatedElement>
      ))}
    </StyledStory>
  );
};

const AnimatedElement = styled.div`
  animation: ${fadeIn} 0.4s ease both;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

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
    border: 0.7vmin solid black;
    border-radius: 2vmin;
    box-shadow: 0.5vmin 0.7vmin 1vmin rgba(0, 0, 0, 0.2);
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
}) => {
  return (
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
};
