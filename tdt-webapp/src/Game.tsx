import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";

import { PlayerInfo, StoryContent } from "./model";
import { getPlayerId } from "./helpers";
import Type from "./Type";
import Draw from "./Draw";
import BigLogoScreen from "./BigLogoScreen";
import {
  WaitForPlayersScreen,
  WaitForGameStartScreen,
  GameSettings,
} from "./BeforeGameStartScreens";
import GameFinishedAnimation from "./GameFinishedAnimation";
import Stories from "./Stories";
import SpectatorView from "./SpectatorView";
import { Join } from "./CreateOrJoin";
import { ConnectionLostErrorDialog } from "./ErrorDialogs";
import { useAudio } from "./audio/useAudio";

interface PlayerState {
  state: string;
}

interface ChatMessage {
  sender: PlayerInfo;
  text: string;
}

interface WaitForPlayersState extends PlayerState {
  state: "waitForPlayers";
  players: PlayerInfo[];
  chatEnabled: boolean;
  chatMessages: ChatMessage[];
}

function isWaitForPlayersState(
  playerState: PlayerState
): playerState is WaitForPlayersState {
  return playerState.state === "waitForPlayers";
}

interface WaitForGameStartState extends PlayerState {
  state: "waitForGameStart";
  players: PlayerInfo[];
  chatEnabled: boolean;
  chatMessages: ChatMessage[];
}

function isWaitForGameStartState(
  playerState: PlayerState
): playerState is WaitForGameStartState {
  return playerState.state === "waitForGameStart";
}

interface TypeState extends PlayerState {
  state: "type";
  round: number;
  rounds: number;
  drawingSrc: string | null;
  artist: PlayerInfo | null;
  roundTimerSeconds: number;
}

function isTypeState(playerState: PlayerState): playerState is TypeState {
  return playerState.state === "type";
}

interface DrawState extends PlayerState {
  state: "draw";
  text: string;
  textWriter: PlayerInfo;
  round: number;
  rounds: number;
  roundTimerSeconds: number;
}

function isDrawState(playerState: PlayerState): playerState is DrawState {
  return playerState.state === "draw";
}

interface WaitForRoundFinishState extends PlayerState {
  state: "waitForRoundFinish";
  waitingForPlayers: PlayerInfo[];
  isTypeRound: boolean;
}

function isWaitForRoundFinishState(
  playerState: PlayerState
): playerState is WaitForRoundFinishState {
  return playerState.state === "waitForRoundFinish";
}

interface StoriesState extends PlayerState {
  state: "stories";
  stories: StoryContent[];
  votesByStory: number[];
}

function isStoriesState(playerState: PlayerState): playerState is StoriesState {
  return playerState.state === "stories";
}

interface SpectatorState extends PlayerState {
  state: "spectator";
  round: number;
  rounds: number;
  players: PlayerInfo[];
  waitingForPlayers: PlayerInfo[];
  stories: StoryContent[];
}

function isSpectatorState(playerState: PlayerState): playerState is SpectatorState {
  return playerState.state === "spectator";
}

function isFinalState(newPlayerState: PlayerState) {
  return (
    newPlayerState.state === "unknownGame" ||
    newPlayerState.state === "alreadyStartedGame" ||
    isStoriesState(newPlayerState)
    // note: "spectator" is NOT final — keep socket open to receive StoriesState when game ends
  );
}

interface Action {
  action: string;
  content?: {
    [key: string]: string | number | boolean;
  };
}

const Game = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const gameIdNotNull = gameId!;

  const [playerState, setPlayerState] = React.useState<PlayerState>({ state: "loading" });

  const [connectionError, setConnectionError] = React.useState(false);

  const [reconnectCount, setReconnectCount] = React.useState(0);

  const {
    muted,
    toggleMute,
    playRoundStart,
    playUrgentTick,
    playUrgentStart,
    playTimerExpire,
    playSubmitSuccess,
    playRevealPop,
    playFanfare,
    playExplosionPop,
  } = useAudio();

  const prevStateRef = React.useRef("");
  React.useEffect(() => {
    const cur = playerState.state;
    const prev = prevStateRef.current;
    if ((cur === "type" || cur === "draw") && cur !== prev) {
      playRoundStart();
    }
    prevStateRef.current = cur;
  }, [playerState.state, playRoundStart]);

  const socketRef = React.useRef<WebSocket>();

  const send = (action: Action) => {
    socketRef.current!.send(JSON.stringify(action));
  };

  React.useEffect(() => {
    const wsProtocol =
      window.location.protocol === "https:" ? "wss://" : "ws://";
    const wsUrl = `${wsProtocol}${window.location.host}/api/websocket`;
    console.log("Connecting to websocket " + wsUrl);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    let closed = false;

    socket.onopen = () => {
      console.log("Websocket opened. Sending access action.");

      send({
        action: "access",
        content: {
          gameId: gameIdNotNull,
          playerId: getPlayerId(),
        },
      });
    };

    socket.onmessage = (messageEvent) => {
      const newPlayerState: PlayerState = JSON.parse(messageEvent.data);
      if (isFinalState(newPlayerState)) {
        closeSocket();
      }
      setPlayerState(newPlayerState);
    };

    socket.onerror = (error) => {
      if (!closed) {
        console.log("Websocket error", error);
        setConnectionError(true);
      }
    };
    socket.onclose = (closeEvent) => {
      if (!closed) {
        console.log("Websocket closed", closeEvent);
        setConnectionError(true);
      }
    };

    const closeSocket = () => {
      console.log("Disconnecting from websocket");
      closed = true;
      socket.close();
    };

    return () => {
      closeSocket();
    };
  }, [gameIdNotNull, reconnectCount]);

  // Auto-rejoin if we have saved name/face in localStorage
  React.useEffect(() => {
    if (playerState.state !== "join") return;
    const savedName = (window.localStorage.getItem("name") ?? "").trim();
    const savedFace = window.localStorage.getItem("face") ?? "A";
    if (!savedName) return;
    socketRef.current!.send(
      JSON.stringify({
        action: "join",
        content: {
          gameId: gameIdNotNull,
          playerId: getPlayerId(),
          name: savedName,
          face: savedFace,
        },
      })
    );
  }, [playerState.state, gameIdNotNull]);

  const handleDrawDone = React.useCallback((image: Blob) => {
    socketRef.current!.send(image);
  }, []);

  const handleSendReplay = React.useCallback((round: number, frames: string[]) => {
    socketRef.current!.send(JSON.stringify({
      action: "drawingReplay",
      content: { round, frames },
    }));
  }, []);

  const handleSettingsChange = React.useCallback((settings: GameSettings) => {
    send({
      action: "settings",
      content: {
        maxPlayers: settings.maxPlayers,
        roundTimerSeconds: settings.roundTimerSeconds,
        chatEnabled: settings.chatEnabled,
        isPublic: settings.isPublic,
      },
    });
  }, []);

  const sendChat = React.useCallback((text: string) => {
    send({ action: "chat", content: { text } });
  }, []);

  const sendKick = React.useCallback((playerName: string) => {
    send({ action: "kick", content: { playerName } });
  }, []);

  const sendBan = React.useCallback((playerName: string) => {
    send({ action: "ban", content: { playerName } });
  }, []);

  const getComponentForState = () => {
    if (playerState.state === "loading") {
      return <LoadingGame />;
    } else if (playerState.state === "join") {
      const handleJoinDone = (face: string, name: string) => {
        send({
          action: "join",
          content: {
            gameId: gameIdNotNull,
            playerId: getPlayerId(),
            name,
            face,
          },
        });
      };

      return <Join handleDone={handleJoinDone} />;
    } else if (isWaitForPlayersState(playerState)) {
      const handleStartGame = (settings: GameSettings) => {
        send({
          action: "start",
          content: {
            roundTimerSeconds: settings.roundTimerSeconds,
            maxPlayers: settings.maxPlayers,
          },
        });
      };

      return (
        <WaitForPlayersScreen
          gameId={gameIdNotNull}
          players={playerState.players}
          chatEnabled={playerState.chatEnabled}
          chatMessages={playerState.chatMessages}
          handleStart={handleStartGame}
          handleSettingsChange={handleSettingsChange}
          onSendMessage={sendChat}
          onKickPlayer={sendKick}
          onBanPlayer={sendBan}
        />
      );
    } else if (isWaitForGameStartState(playerState)) {
      return (
        <WaitForGameStartScreen
          players={playerState.players}
          chatEnabled={playerState.chatEnabled}
          chatMessages={playerState.chatMessages}
          onSendMessage={sendChat}
        />
      );
    } else if (isTypeState(playerState)) {
      const handleTypeDone = (text: string) => {
        send({ action: "type", content: { text } });
      };

      return (
        <Type
          round={playerState.round}
          rounds={playerState.rounds}
          drawingSrc={playerState.drawingSrc}
          artist={playerState.artist}
          roundTimerSeconds={playerState.roundTimerSeconds ?? 0}
          handleDone={handleTypeDone}
          onSubmit={playSubmitSuccess}
          onUrgentStart={playUrgentStart}
          onTick={playUrgentTick}
          onTimerExpire={playTimerExpire}
        />
      );
    } else if (isDrawState(playerState)) {
      return (
        <Draw
          text={playerState.text}
          textWriter={playerState.textWriter}
          round={playerState.round}
          rounds={playerState.rounds}
          roundTimerSeconds={playerState.roundTimerSeconds ?? 0}
          handleDone={handleDrawDone}
          onSubmit={playSubmitSuccess}
          onUrgentStart={playUrgentStart}
          onTick={playUrgentTick}
          onTimerExpire={playTimerExpire}
          onSendReplay={handleSendReplay}
          cacheKey={`draw-${gameIdNotNull}-r${playerState.round}`}
        />
      );
    } else if (isWaitForRoundFinishState(playerState)) {
      return (
        <WaitForRoundFinished
          isTypeRound={playerState.isTypeRound}
          waitingForPlayers={playerState.waitingForPlayers}
        />
      );
    } else if (isStoriesState(playerState)) {
      return (
        <GameFinished
          stories={playerState.stories}
          onReveal={playRevealPop}
          onFanfare={playFanfare}
          onExplosion={playExplosionPop}
        />
      );
    } else if (isSpectatorState(playerState)) {
      return (
        <SpectatorView
          round={playerState.round}
          rounds={playerState.rounds}
          players={playerState.players}
          waitingForPlayers={playerState.waitingForPlayers}
          stories={playerState.stories}
        />
      );
    } else if (playerState.state === "kicked") {
      return (
        <Message>
          You have been kicked from the lobby.{" "}
          <KickedLink onClick={() => navigate("/")}>Go back home</KickedLink>
        </Message>
      );
    } else if (playerState.state === "banned") {
      return (
        <Message>
          You have been banned from this lobby.{" "}
          <KickedLink onClick={() => navigate("/")}>Go back home</KickedLink>
        </Message>
      );
    } else if (playerState.state === "alreadyStartedGame") {
      return (
        <Message>
          Sorry, the game is full or has already started. You will see the
          created stories once that game is finished.
        </Message>
      );
    } else {
      // unknown game
      return (
        <Message>
          Sorry, the game code <em>{gameIdNotNull}</em> was not found.
        </Message>
      );
    }
  };

  const handleReconnect = () => {
    setConnectionError(false);
    setReconnectCount(reconnectCount + 1);
  };

  const showMuteButton =
    playerState.state !== "loading" && playerState.state !== "join";

  return (
    <>
      <ConnectionLostErrorDialog
        show={connectionError}
        handleReconnect={handleReconnect}
      />
      {getComponentForState()}
{showMuteButton && (
        <MuteButton
          onClick={toggleMute}
          title={muted ? "Unmute sounds" : "Mute sounds"}
        >
          {muted ? "🔇" : "🔊"}
        </MuteButton>
      )}
    </>
  );
};

export default Game;

const WaitForRoundFinished = ({
  isTypeRound,
  waitingForPlayers,
}: {
  isTypeRound: boolean;
  waitingForPlayers: PlayerInfo[];
}) => {
  const roundAction = isTypeRound ? "typing" : "drawing";

  const waitingForPlayersText = waitingForPlayers.map((p) => p.name).join(", ");

  return (
    <Message>
      {`Waiting for other players to finish ${roundAction}:`}
      <br />
      {waitingForPlayersText}
    </Message>
  );
};

const GameFinished = ({
  stories,
  onReveal,
  onFanfare,
  onExplosion,
}: {
  stories: StoryContent[];
  onReveal?: () => void;
  onFanfare?: () => void;
  onExplosion?: () => void;
}) => {
  const [showStories, setShowStories] = React.useState(false);

  if (!showStories) {
    return (
      <GameFinishedAnimation
        handleShowStories={() => setShowStories(true)}
        onFanfare={onFanfare}
        onExplosion={onExplosion}
      />
    );
  } else {
    return (
      <Stories
        stories={stories}
        onReveal={onReveal}
      />
    );
  }
};

const MuteButton = styled.button`
  position: fixed;
  bottom: 2vmin;
  right: 2vmin;
  z-index: 100;
  background: rgba(8, 8, 24, 0.85);
  border: 1.5px solid rgba(0, 245, 255, 0.4);
  color: #00f5ff;
  border-radius: 50%;
  width: 6vmin;
  height: 6vmin;
  min-width: 36px;
  min-height: 36px;
  font-size: 3vmin;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: #00f5ff;
    box-shadow: 0 0 10px rgba(0, 245, 255, 0.4);
  }
`;

const Message = ({ children }: { children: React.ReactNode }) => {
  return <BigLogoScreen>{children}</BigLogoScreen>;
};

const KickedLink = styled.span`
  color: var(--cyber-cyan);
  text-decoration: underline;
  cursor: pointer;
`;

const LoadingGame = () => {
  return <div>Loading game...</div>;
};
