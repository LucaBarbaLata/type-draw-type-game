import React from "react";
import styled, { keyframes } from "styled-components";
import { useNavigate } from "react-router-dom";

import { StoryContent, StoryElement } from "./model";
import Player from "./Player";
import Scrollable from "./Scrollable";
import NewlineToBreak from "./NewLineToBreak";

const Stories = ({ stories }: { stories: StoryContent[] }) => {
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
            onClick={() => setRevealedCount((c) => Math.min(c + 1, totalElements))}
          >
            Reveal next ▼
          </button>
          <SkipButton onClick={() => setRevealedCount(totalElements)}>
            Reveal all
          </SkipButton>
        </RevealControls>
      )}
      {navButtons}
      <StartNewButton className="button button-red" onClick={() => navigate("/")}>
        Start a new game
      </StartNewButton>
    </Scrollable>
  );
};

export default Stories;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const StartNewButton = styled.button`
  margin-bottom: 2vmin;
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
