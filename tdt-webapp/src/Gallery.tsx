import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";

import { StoryContent } from "./model";
import NewlineToBreak from "./NewLineToBreak";

const Gallery = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [stories, setStories] = React.useState<StoryContent[] | null>(null);
  const [error, setError] = React.useState(false);
  const [selected, setSelected] = React.useState(0);

  React.useEffect(() => {
    if (!gameId) return;
    fetch(`/api/stories/${gameId}`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data: StoryContent[]) => setStories(data))
      .catch(() => setError(true));
  }, [gameId]);

  if (error) {
    return (
      <Shell>
        <ErrorCard>
          <ErrorTitle>Game not found</ErrorTitle>
          <ErrorSub>
            <em>{gameId}</em> doesn't exist or hasn't finished yet.
          </ErrorSub>
          <HomeBtn onClick={() => navigate("/")}>⌂ Go home</HomeBtn>
        </ErrorCard>
      </Shell>
    );
  }

  if (stories === null) {
    return (
      <Shell>
        <Spinner />
        <LoadingLabel>Loading gallery…</LoadingLabel>
      </Shell>
    );
  }

  const story = stories[selected];

  return (
    <Root>
      <TopBar>
        <TopBarLeft>
          <HomeBtn onClick={() => navigate("/")}>⌂</HomeBtn>
          <GameCode>{gameId}</GameCode>
        </TopBarLeft>
        <StoryTabs>
          {stories.map((_, i) => (
            <StoryTab key={i} $active={i === selected} onClick={() => setSelected(i)}>
              {i + 1}
            </StoryTab>
          ))}
        </StoryTabs>
      </TopBar>

      <ScrollArea>
        <Chain>
          {story.elements.map((el, i) => (
            <PanelWrapper key={i} $type={el.type}>
              <PanelAuthor>
                <Face>{el.player.face}</Face>
                <AuthorName>{el.player.name}</AuthorName>
                <AuthorVerb>{el.type === "text" ? "typed" : "drew"}</AuthorVerb>
              </PanelAuthor>

              {el.type === "image" ? (
                <DrawingPanel>
                  <DrawingImg src={el.content} alt={`Drawing by ${el.player.name}`} />
                </DrawingPanel>
              ) : (
                <TextPanel>
                  <TextContent>{NewlineToBreak(el.content)}</TextContent>
                </TextPanel>
              )}

              {i < story.elements.length - 1 && (
                <Connector $type={el.type} />
              )}
            </PanelWrapper>
          ))}
        </Chain>
      </ScrollArea>
    </Root>
  );
};

export default Gallery;

// ── Animations ──────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const scanPulse = keyframes`
  0%, 100% { opacity: 0.4; letter-spacing: 0.28em; }
  50%       { opacity: 1;   letter-spacing: 0.38em; }
`;

const panelIn = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ── Loading / Error ──────────────────────────────────────────────────────────

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--cyber-bg);
  gap: 2vmin;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 245, 255, 0.15);
  border-top-color: #00f5ff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  box-shadow: 0 0 12px rgba(0, 245, 255, 0.3);
`;

const LoadingLabel = styled.div`
  color: var(--cyber-cyan);
  font-size: 1.8vmin;
  text-transform: uppercase;
  letter-spacing: 0.28em;
  animation: ${scanPulse} 1.5s ease-in-out infinite;
`;

const ErrorCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5vmin;
  padding: 4vmin 5vmin;
  border: 1.5px solid rgba(255, 32, 121, 0.4);
  border-radius: 1.2vmin;
  background: rgba(255, 32, 121, 0.05);
  box-shadow: 0 0 24px rgba(255, 32, 121, 0.12);
  animation: ${fadeUp} 0.4s ease-out;
`;

const ErrorTitle = styled.div`
  font-size: 2.4vmin;
  color: #ff2079;
  text-shadow: 0 0 8px #ff2079;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const ErrorSub = styled.div`
  font-size: 1.6vmin;
  color: #6688aa;
  em { color: #c8d8f0; font-style: normal; }
`;

// ── Layout ───────────────────────────────────────────────────────────────────

const Root = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--cyber-bg);
  overflow: hidden;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.4vmin 2.5vmin;
  border-bottom: 1px solid rgba(0, 245, 255, 0.14);
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  flex-shrink: 0;
  gap: 2vmin;
`;

const TopBarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5vmin;
`;

const GameCode = styled.div`
  font-size: 1.6vmin;
  color: rgba(0, 245, 255, 0.5);
  letter-spacing: 0.25em;
  text-transform: uppercase;
  font-weight: 600;
`;

const HomeBtn = styled.button`
  background: none;
  border: 1.5px solid rgba(0, 245, 255, 0.35);
  border-radius: 0.6vmin;
  color: rgba(0, 245, 255, 0.7);
  font-size: 1.8vmin;
  padding: 0.5vmin 1.4vmin;
  cursor: pointer;
  letter-spacing: 0.04em;
  transition: color 0.15s, border-color 0.15s, box-shadow 0.15s;

  &:hover {
    color: #00f5ff;
    border-color: #00f5ff;
    box-shadow: 0 0 10px rgba(0, 245, 255, 0.3);
  }
`;

const StoryTabs = styled.div`
  display: flex;
  gap: 0.8vmin;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const StoryTab = styled.button<{ $active: boolean }>`
  background: ${({ $active }) => $active ? "rgba(0,245,255,0.15)" : "none"};
  border: 1.5px solid ${({ $active }) => $active ? "#00f5ff" : "rgba(0,245,255,0.25)"};
  border-radius: 0.5vmin;
  color: ${({ $active }) => $active ? "#00f5ff" : "rgba(0,245,255,0.5)"};
  font-size: 1.6vmin;
  padding: 0.4vmin 1.2vmin;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: ${({ $active }) => $active ? "0 0 10px rgba(0,245,255,0.3)" : "none"};

  &:hover {
    border-color: rgba(0, 245, 255, 0.7);
    color: #00f5ff;
  }
`;

const ScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 3vmin 0 5vmin;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 245, 255, 0.2);
    border-radius: 2px;
  }
`;

// ── Story chain ──────────────────────────────────────────────────────────────

const Chain = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  max-width: 720px;
  margin: 0 auto;
  padding: 0 3vmin;
`;

const PanelWrapper = styled.div<{ $type: "text" | "image" }>`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: ${panelIn} 0.35s ease both;
`;

const PanelAuthor = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8vmin;
  align-self: flex-start;
  margin-bottom: 1.2vmin;
  margin-top: 3vmin;
`;

const Face = styled.span`
  font-size: 2.4vmin;
  line-height: 1;
`;

const AuthorName = styled.span`
  font-size: 1.5vmin;
  font-weight: 700;
  color: var(--cyber-cyan);
  text-shadow: 0 0 6px rgba(0, 245, 255, 0.5);
  letter-spacing: 0.06em;
`;

const AuthorVerb = styled.span`
  font-size: 1.3vmin;
  color: rgba(0, 245, 255, 0.4);
  letter-spacing: 0.06em;
`;

const DrawingPanel = styled.div`
  width: 100%;
  border: 1.5px solid rgba(0, 245, 255, 0.3);
  border-radius: 1vmin;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 245, 255, 0.1), 0 4px 24px rgba(0, 0, 0, 0.4);
  background: #fff;
`;

const DrawingImg = styled.img`
  display: block;
  width: 100%;
  height: auto;
`;

const TextPanel = styled.div`
  width: 100%;
  background: rgba(0, 245, 255, 0.04);
  border: 1.5px solid rgba(0, 245, 255, 0.18);
  border-radius: 1vmin;
  padding: 2.5vmin 3vmin;
  box-shadow: inset 0 0 30px rgba(0, 245, 255, 0.03);
`;

const TextContent = styled.div`
  font-size: 2.2vmin;
  color: #c8d8f0;
  line-height: 1.65;
  letter-spacing: 0.02em;
`;

const Connector = styled.div<{ $type: "text" | "image" }>`
  width: 2px;
  height: 3vmin;
  background: linear-gradient(
    to bottom,
    ${({ $type }) => $type === "image"
      ? "rgba(0,245,255,0.35)"
      : "rgba(255,32,121,0.35)"},
    rgba(0, 245, 255, 0.1)
  );
  margin: 0.5vmin 0;
`;
