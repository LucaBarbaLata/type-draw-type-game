import React from "react";
import styled from "styled-components";

import { PlayerInfo, StoryContent, StoryElement } from "./model";
import Player from "./Player";
import Scrollable from "./Scrollable";
import NewlineToBreak from "./NewLineToBreak";

const SpectatorView = ({
  round,
  rounds,
  players,
  waitingForPlayers,
  stories,
}: {
  round: number;
  rounds: number;
  players: PlayerInfo[];
  waitingForPlayers: PlayerInfo[];
  stories: StoryContent[];
}) => {
  const [selectedStory, setSelectedStory] = React.useState(0);
  const scrollableRef = React.useRef<HTMLDivElement>(null);

  const setStoryAndScroll = (index: number) => {
    setSelectedStory(index);
    scrollableRef.current?.scrollTo(0, 0);
  };

  const hasStories = stories.length > 0;
  const currentStory = hasStories ? stories[selectedStory] : null;
  const hasElements = currentStory && currentStory.elements.length > 0;

  const stillDrawing = waitingForPlayers.length > 0;

  return (
    <Scrollable ref={scrollableRef}>
      <Header>
        <StatusBadge>👀 SPECTATING</StatusBadge>
        <RoundInfo>
          Round {round} of {rounds} —{" "}
          {stillDrawing
            ? `waiting for ${waitingForPlayers.map((p) => p.name).join(", ")}`
            : "round complete"}
        </RoundInfo>
        <PlayerRow>
          {players.map((p, i) => (
            <Player key={i} face={p.face}>
              {p.name}
              {waitingForPlayers.some((w) => w.name === p.name) ? " ✏️" : " ✓"}
            </Player>
          ))}
        </PlayerRow>
      </Header>

      {hasStories && (
        <>
          <NavButtons>
            <button
              className="button"
              onClick={() => setStoryAndScroll(selectedStory - 1)}
              disabled={selectedStory === 0}
            >
              ⇦
            </button>
            {stories.map((_s, i) => (
              <button
                key={i}
                className="button"
                onClick={() => setStoryAndScroll(i)}
                disabled={selectedStory === i}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="button"
              onClick={() => setStoryAndScroll(selectedStory + 1)}
              disabled={selectedStory === stories.length - 1}
            >
              ⇨
            </button>
          </NavButtons>

          <StoryTitle>Story {selectedStory + 1} of {stories.length}</StoryTitle>

          {hasElements ? (
            <StyledStory>
              {currentStory!.elements.map((e, i) => (
                <StoryElementComponent key={i} element={e} />
              ))}
            </StyledStory>
          ) : (
            <EmptyNote>No elements yet — waiting for players to submit...</EmptyNote>
          )}
        </>
      )}

      {!hasStories && (
        <EmptyNote>Waiting for the first round to complete...</EmptyNote>
      )}
    </Scrollable>
  );
};

export default SpectatorView;

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
          {element.player.name} drew:
        </Player>
        <img src={element.content} alt="Drawing" />
      </ImageStoryElement>
    );
  }
};

const Header = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2vmin;
  padding: 3vmin;
  background: rgba(0, 245, 255, 0.03);
  border-bottom: 1.5px solid rgba(0, 245, 255, 0.2);
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 2vmin;
`;

const StatusBadge = styled.div`
  font-size: 3vmin;
  font-weight: bold;
  color: #00f5ff;
  text-shadow: 0 0 10px #00f5ff, 0 0 25px rgba(0, 245, 255, 0.4);
  letter-spacing: 0.2em;
`;

const RoundInfo = styled.div`
  font-size: 2.2vmin;
  color: #6688aa;
  letter-spacing: 0.06em;
`;

const PlayerRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2vmin;
`;

const NavButtons = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  .button {
    margin: 2vmin;
  }
`;

const StoryTitle = styled.h1`
  text-align: center;
`;

const StyledStory = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

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
    box-shadow: 0 0 16px rgba(0, 245, 255, 0.2);
  }
`;

const EmptyNote = styled.div`
  color: #3d5570;
  font-size: 2.5vmin;
  text-align: center;
  margin: 6vmin;
  letter-spacing: 0.06em;
`;
