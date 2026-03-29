import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import { toggleToFullscreenAndLandscapeOnMobile } from "./helpers";
import BigLogoScreen from "./BigLogoScreen";

interface PublicGameInfo {
  gameId: string;
  creatorName: string;
  creatorFace: string;
  playerCount: number;
  maxPlayers: number;
}

const PublicGames = () => {
  const navigate = useNavigate();
  const [games, setGames] = React.useState<PublicGameInfo[] | null>(null);
  const [error, setError] = React.useState(false);

  const fetchGames = React.useCallback(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((data: PublicGameInfo[]) => {
        setGames(data);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  React.useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 5000);
    return () => clearInterval(interval);
  }, [fetchGames]);

  const handleJoin = (gameId: string) => {
    navigate(`/g/${gameId}`);
    toggleToFullscreenAndLandscapeOnMobile();
  };

  const handleBack = () => navigate("/");

  return (
    <BigLogoScreen>
      <Content>
        <Title>Public Lobbies</Title>

        {error && <StatusMsg>Could not load lobbies.</StatusMsg>}
        {!error && games === null && <StatusMsg>Loading…</StatusMsg>}
        {!error && games !== null && games.length === 0 && (
          <StatusMsg>No public lobbies right now. Start one!</StatusMsg>
        )}

        {games && games.length > 0 && (
          <GameList>
            {games.map((g) => (
              <GameCard key={g.gameId}>
                <CardLeft>
                  <CreatorFace>{g.creatorFace}</CreatorFace>
                  <CardInfo>
                    <CreatorName>{g.creatorName}'s game</CreatorName>
                    <PlayerCount>
                      {g.playerCount}{g.maxPlayers > 0 ? `/${g.maxPlayers}` : ""} player{g.playerCount !== 1 ? "s" : ""}
                    </PlayerCount>
                  </CardInfo>
                </CardLeft>
                <JoinBtn
                  onClick={() => handleJoin(g.gameId)}
                  disabled={g.maxPlayers > 0 && g.playerCount >= g.maxPlayers}
                >
                  {g.maxPlayers > 0 && g.playerCount >= g.maxPlayers ? "Full" : "Join"}
                </JoinBtn>
              </GameCard>
            ))}
          </GameList>
        )}

        <BackBtn className="button button-blue" onClick={handleBack}>
          Back
        </BackBtn>
      </Content>
    </BigLogoScreen>
  );
};

export default PublicGames;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2vmin;
  width: min(90vw, 480px);
`;

const Title = styled.h2`
  color: var(--cyber-cyan);
  text-shadow: var(--cyber-glow);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-size: 2.5vmin;
  margin: 0;
`;

const StatusMsg = styled.div`
  color: #6688aa;
  font-size: 1.8vmin;
  text-align: center;
`;

const GameList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5vmin;
  width: 100%;
  max-height: 50vh;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 245, 255, 0.3);
    border-radius: 2px;
  }
`;

const GameCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5vmin 2vmin;
  border: 1.5px solid rgba(0, 245, 255, 0.3);
  border-radius: 1vmin;
  background: rgba(0, 245, 255, 0.03);
  box-shadow: 0 0 8px rgba(0, 245, 255, 0.06);
`;

const CardLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5vmin;
`;

const CreatorFace = styled.span`
  font-size: 3vmin;
`;

const CardInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3vmin;
`;

const CreatorName = styled.div`
  font-size: 1.8vmin;
  color: var(--cyber-cyan);
  font-weight: bold;
`;

const PlayerCount = styled.div`
  font-size: 1.4vmin;
  color: #6688aa;
`;

const JoinBtn = styled.button`
  font-size: 1.6vmin;
  padding: 0.7vmin 2vmin;
  background: rgba(0, 245, 255, 0.1);
  border: 1.5px solid rgba(0, 245, 255, 0.5);
  border-radius: 0.6vmin;
  color: var(--cyber-cyan);
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  transition: background 0.1s, border-color 0.1s;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: rgba(0, 245, 255, 0.22);
    border-color: var(--cyber-cyan);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

const BackBtn = styled.button`
  margin-top: 1vmin;
`;
