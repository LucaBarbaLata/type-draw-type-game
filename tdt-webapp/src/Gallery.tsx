import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";

import { StoryContent } from "./model";
import BigLogoScreen from "./BigLogoScreen";
import Player from "./Player";
import Scrollable from "./Scrollable";
import NewlineToBreak from "./NewLineToBreak";

const Gallery = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [stories, setStories] = React.useState<StoryContent[] | null>(null);
  const [error, setError] = React.useState<"notFound" | "notFinished" | null>(null);

  React.useEffect(() => {
    if (!gameId) return;
    fetch(`/api/stories/${gameId}`)
      .then((res) => {
        if (res.status === 404) throw new Error("notFound");
        if (!res.ok) throw new Error("notFound");
        return res.json();
      })
      .then((data: StoryContent[]) => setStories(data))
      .catch((e) => setError(e.message === "notFound" ? "notFound" : "notFound"));
  }, [gameId]);

  if (error === "notFound") {
    return (
      <BigLogoScreen>
        <InfoText>
          Game <em>{gameId}</em> not found or hasn't finished yet.
        </InfoText>
        <BackButton onClick={() => navigate("/")}>⌂ Home</BackButton>
      </BigLogoScreen>
    );
  }

  if (stories === null) {
    return (
      <BigLogoScreen>
        <LoadingText>Loading gallery…</LoadingText>
      </BigLogoScreen>
    );
  }

  return (
    <Scrollable>
      <Header>
        <Title>Gallery — {gameId}</Title>
        <BackButton onClick={() => navigate("/")}>⌂ Home</BackButton>
      </Header>
      {stories.map((story, si) => (
        <StoryBlock key={si}>
          <StoryTitle>Story {si + 1}</StoryTitle>
          <StoryChain>
            {story.elements.map((el, ei) => (
              <ChainItem key={ei}>
                <Player face={el.player.face}>{el.player.name} {el.type === "text" ? "typed:" : "drew:"}</Player>
                {el.type === "image" ? (
                  <ChainImage src={el.content} alt={`Drawing by ${el.player.name}`} />
                ) : (
                  <ChainText>{NewlineToBreak(el.content)}</ChainText>
                )}
              </ChainItem>
            ))}
          </StoryChain>
        </StoryBlock>
      ))}
    </Scrollable>
  );
};

export default Gallery;

const scanPulse = keyframes`
  0%, 100% { opacity: 0.35; letter-spacing: 0.32em; }
  50%       { opacity: 1;    letter-spacing: 0.42em; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const LoadingText = styled.div`
  color: var(--cyber-cyan);
  text-shadow: var(--cyber-glow);
  font-size: 2.5vmin;
  text-transform: uppercase;
  letter-spacing: 0.32em;
  animation: ${scanPulse} 1.5s ease-in-out infinite;
`;

const InfoText = styled.div`
  color: #6688aa;
  font-size: 2vmin;
  margin-bottom: 3vmin;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 80vw;
  margin: 2vmin auto 4vmin;
`;

const Title = styled.h1`
  font-size: 3vmin;
  color: var(--cyber-cyan);
  text-shadow: var(--cyber-glow);
  letter-spacing: 0.12em;
  margin: 0;
`;

const BackButton = styled.button`
  background: none;
  border: 1.5px solid rgba(0, 245, 255, 0.4);
  border-radius: 0.8vmin;
  color: rgba(0, 245, 255, 0.7);
  font-size: 1.8vmin;
  padding: 0.8vmin 2vmin;
  cursor: pointer;
  letter-spacing: 0.06em;
  transition: color 0.15s, border-color 0.15s, box-shadow 0.15s;

  &:hover {
    color: #00f5ff;
    border-color: #00f5ff;
    box-shadow: 0 0 10px rgba(0, 245, 255, 0.3);
  }
`;

const StoryBlock = styled.div`
  width: 80vw;
  margin: 0 auto 6vmin;
  animation: ${fadeIn} 0.4s ease both;
`;

const StoryTitle = styled.h2`
  font-size: 2vmin;
  color: rgba(0, 245, 255, 0.6);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin-bottom: 2vmin;
  border-bottom: 1px solid rgba(0, 245, 255, 0.15);
  padding-bottom: 1vmin;
`;

const StoryChain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3vmin;
`;

const ChainItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1vmin;
`;

const ChainImage = styled.img`
  max-width: 100%;
  max-height: 60vh;
  border: 1.5px solid rgba(0, 245, 255, 0.4);
  border-radius: 1vmin;
  box-shadow: 0 0 16px rgba(0, 245, 255, 0.15);
`;

const ChainText = styled.div`
  background: rgba(0, 245, 255, 0.04);
  border: 1px solid rgba(0, 245, 255, 0.2);
  border-radius: 0.8vmin;
  padding: 1.5vmin 2vmin;
  font-size: 2vmin;
  color: #c8d8f0;
  line-height: 1.6;
`;
