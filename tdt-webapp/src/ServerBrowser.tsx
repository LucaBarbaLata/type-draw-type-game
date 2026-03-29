import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import {
  toggleToFullscreenAndLandscapeOnMobile,
  getRandomCharacterFromString,
  isBlank,
  getPlayerId,
  useLocalStorageState,
} from "./helpers";
import Face from "./Face";
import { ConnectionLostErrorDialog } from "./ErrorDialogs";

interface PublicGameInfo {
  gameId: string;
  creatorName: string;
  creatorFace: string;
  playerCount: number;
  maxPlayers: number;
}

const ServerBrowser = () => {
  const navigate = useNavigate();

  // --- Create Match ---
  const faces = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const [face, setFace] = useLocalStorageState("face", () =>
    getRandomCharacterFromString(faces)
  );
  const nameMaxLength = 50;
  const [nameUnchecked, setName] = useLocalStorageState("name", "");
  const name =
    nameUnchecked.length > nameMaxLength
      ? nameUnchecked.slice(0, nameMaxLength)
      : nameUnchecked;
  const [createError, setCreateError] = React.useState(false);

  const handleCreate = async () => {
    try {
      const response = await window.fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: getPlayerId(),
          playerName: name.trim(),
          playerFace: face,
        }),
      });
      const { gameId } = await response.json();
      navigate(`/g/${gameId}`);
      toggleToFullscreenAndLandscapeOnMobile();
    } catch {
      setCreateError(true);
    }
  };

  const nextFace = () => {
    const newFace = faces.charAt((faces.indexOf(face) + 1) % faces.length);
    setFace(newFace);
  };

  // --- Join Match ---
  const [games, setGames] = React.useState<PublicGameInfo[] | null>(null);
  const [gamesError, setGamesError] = React.useState(false);

  const fetchGames = React.useCallback(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((data: PublicGameInfo[]) => {
        setGames(data);
        setGamesError(false);
      })
      .catch(() => setGamesError(true));
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

  return (
    <>
      <ConnectionLostErrorDialog
        show={createError}
        handleReconnect={() => setCreateError(false)}
      />
      <Wrapper>
        <TopBar>
          <BrowserTitle>Server Browser</BrowserTitle>
          <button className="button button-blue" onClick={() => navigate("/")}>
            ← Back
          </button>
        </TopBar>

        <Panels>
          {/* ── Create Match ─────────────────────────────── */}
          <Panel>
            <PanelHeading>Create Match</PanelHeading>

            <FacePickerWrapper onClick={nextFace} title="Click to change avatar">
              <Face face={face} small={false} />
              <FaceHint>click to change</FaceHint>
            </FacePickerWrapper>

            <FieldLabel htmlFor="sb-name">Your name</FieldLabel>
            <NameInput
              type="text"
              id="sb-name"
              name="name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={nameMaxLength}
              placeholder="Enter your name…"
            />

            <button
              className="button"
              disabled={isBlank(name)}
              onClick={handleCreate}
            >
              Create Match
            </button>
          </Panel>

          <PanelDivider />

          {/* ── Join Match ───────────────────────────────── */}
          <Panel>
            <PanelHeading>Join Match</PanelHeading>

            {gamesError && <StatusMsg>Could not load lobbies.</StatusMsg>}
            {!gamesError && games === null && <StatusMsg>Loading…</StatusMsg>}
            {!gamesError && games !== null && games.length === 0 && (
              <StatusMsg>No public lobbies right now — create one!</StatusMsg>
            )}

            {games && games.length > 0 && (
              <GameList>
                {games.map((g) => (
                  <GameCard key={g.gameId}>
                    <CardLeft>
                      <Face face={g.creatorFace} small={true} />
                      <CardInfo>
                        <CreatorName>👑 {g.creatorName}'s game</CreatorName>
                        <PlayerCount>
                          {g.playerCount}
                          {g.maxPlayers > 0 ? `/${g.maxPlayers}` : ""} player
                          {g.playerCount !== 1 ? "s" : ""}
                        </PlayerCount>
                      </CardInfo>
                    </CardLeft>
                    <JoinBtn
                      onClick={() => handleJoin(g.gameId)}
                      disabled={
                        g.maxPlayers > 0 && g.playerCount >= g.maxPlayers
                      }
                    >
                      {g.maxPlayers > 0 && g.playerCount >= g.maxPlayers
                        ? "Full"
                        : "Join"}
                    </JoinBtn>
                  </GameCard>
                ))}
              </GameList>
            )}
          </Panel>
        </Panels>
      </Wrapper>
    </>
  );
};

export default ServerBrowser;

// ── Styled components ────────────────────────────────────────────────────────

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--cyber-bg);
  padding: 2vmin 3vmin;
  box-sizing: border-box;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2.5vmin;
`;

const BrowserTitle = styled.h1`
  margin: 0;
  font-size: 3vmin;
  color: var(--cyber-cyan);
  text-shadow: var(--cyber-glow);
  text-transform: uppercase;
  letter-spacing: 0.18em;
`;

const Panels = styled.div`
  display: flex;
  flex: 1;
  gap: 0;
  min-height: 0;
`;

const Panel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2vmin 3vmin;
  overflow-y: auto;
`;

const PanelDivider = styled.div`
  width: 1.5px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(0, 245, 255, 0.35) 15%,
    rgba(0, 245, 255, 0.35) 85%,
    transparent
  );
  box-shadow: 0 0 8px rgba(0, 245, 255, 0.2);
  margin: 0 1vmin;
  flex-shrink: 0;
`;

const PanelHeading = styled.h2`
  margin: 0 0 2.5vmin;
  font-size: 2.2vmin;
  color: var(--cyber-magenta);
  text-shadow: var(--cyber-glow-magenta);
  text-transform: uppercase;
  letter-spacing: 0.14em;
`;

// Create Match panel
const FacePickerWrapper = styled.div`
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8vmin;
  margin-bottom: 2.5vmin;
`;

const FaceHint = styled.span`
  font-size: 1.2vmin;
  color: var(--cyber-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const FieldLabel = styled.label`
  display: block;
  margin-bottom: 0.9vmin;
  color: var(--cyber-text-muted);
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  width: 80%;
  text-align: center;
`;

const NameInput = styled.input`
  width: 80%;
  margin-bottom: 3vmin;
`;

// Join Match panel
const StatusMsg = styled.div`
  color: #6688aa;
  font-size: 1.8vmin;
  text-align: center;
  margin-top: 2vmin;
`;

const GameList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5vmin;
  width: 100%;
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
