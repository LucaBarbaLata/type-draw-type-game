import React from "react";
import ReactDOM from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";

import { GameMode, PlayerInfo, StoryContent, StrokeSegment, RemoteStroke } from "./model";
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
  gameMode: GameMode;
  hotPotatoIntervalSeconds: number;
  hotPotatoTotalSeconds: number;
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
  gameMode: GameMode;
  hotPotatoIntervalSeconds: number;
  hotPotatoTotalSeconds: number;
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
  gameMode: GameMode;
  teamPartner?: PlayerInfo;
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
  gameMode: GameMode;
  teamPartner?: PlayerInfo;
  spectatorCount?: number;
}

function isDrawState(playerState: PlayerState): playerState is DrawState {
  return playerState.state === "draw";
}

interface HotPotatoDrawState extends PlayerState {
  state: "hotPotatoDraw";
  rotationNumber: number;
  totalRotations: number;
  intervalSeconds: number;
  initialCanvasUrl: string | null;
  gameMode: GameMode;
  spectatorCount?: number;
}

function isHotPotatoDrawState(playerState: PlayerState): playerState is HotPotatoDrawState {
  return playerState.state === "hotPotatoDraw";
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
  rematchVoters?: PlayerInfo[];
  totalPlayers?: number;
}

function isStoriesState(playerState: PlayerState): playerState is StoriesState {
  return playerState.state === "stories";
}

interface RematchState extends PlayerState {
  state: "rematch";
  newGameId: string;
}

interface SpectatorCurrentDrawing {
  player: PlayerInfo;
  prompt: string;
  snapshotDataUrl?: string;
}

interface SpectatorState extends PlayerState {
  state: "spectator";
  round: number;
  rounds: number;
  players: PlayerInfo[];
  waitingForPlayers: PlayerInfo[];
  stories: StoryContent[];
  currentDrawings?: SpectatorCurrentDrawing[];
}

function isSpectatorState(playerState: PlayerState): playerState is SpectatorState {
  return playerState.state === "spectator";
}

interface TeamStrokeMessage extends RemoteStroke {
  state: "teamStroke";
}

function isFinalState(newPlayerState: PlayerState) {
  return (
    newPlayerState.state === "unknownGame" ||
    newPlayerState.state === "alreadyStartedGame"
    // note: storiesState and spectator are NOT final — keep socket open to receive reactions/state updates
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
  const [connectionStatus, setConnectionStatus] = React.useState<"connecting" | "connected" | "disconnected">("connecting");

  // Team mode: partner cursor position (canvas coordinates) and draw canvas ref
  const [partnerCursor, setPartnerCursor] = React.useState<{ x: number; y: number; name: string } | null>(null);
  const imageProviderRef = React.useRef<import("./DrawCanvas").ImageProvider | undefined>();
  // Team mode: track the current draw round so teamStroke messages include the correct round number
  const currentDrawRoundRef = React.useRef<number>(0);
  const sentCanvasRequestForRoundRef = React.useRef<number>(-1);

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
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(action));
    }
  };

  React.useEffect(() => {
    const wsProtocol =
      window.location.protocol === "https:" ? "wss://" : "ws://";
    const wsUrl = `${wsProtocol}${window.location.host}/api/websocket`;
    console.debug("Connecting to websocket " + wsUrl);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    let closed = false;

    setConnectionStatus("connecting");

    socket.onopen = () => {
      console.debug("Websocket opened. Sending access action.");
      setConnectionStatus("connected");

      send({
        action: "access",
        content: {
          gameId: gameIdNotNull,
          playerId: getPlayerId(),
        },
      });
    };

    socket.onmessage = (messageEvent) => {
      const msg: PlayerState = JSON.parse(messageEvent.data);
      if (msg.state === "rematch") {
        const rematch = msg as unknown as RematchState;
        navigate("/g/" + rematch.newGameId);
        return;
      }
      if (msg.state === "teamStroke") {
        const seg = msg as unknown as TeamStrokeMessage;
        imageProviderRef.current?.applyRemoteStroke(seg);
        if (seg.x1 != null && seg.y1 != null) {
          setPartnerCursor({ x: seg.x1, y: seg.y1, name: seg.fromPlayer });
        }
        return;
      }
      if (msg.state === "teamCanvasRequest") {
        handleTeamCanvasRequest();
        return;
      }
      if (msg.state === "teamCanvasSync") {
        const syncMsg = msg as unknown as { state: string; imageDataUrl: string };
        imageProviderRef.current?.loadImageDataURL(syncMsg.imageDataUrl);
        return;
      }
      if (isFinalState(msg)) {
        closeSocket();
      }
      setPlayerState(msg);
    };

    socket.onerror = (error) => {
      if (!closed) {
        console.debug("Websocket error", error);
        setConnectionStatus("disconnected");
        setConnectionError(true);
      }
    };
    socket.onclose = (closeEvent) => {
      if (!closed) {
        console.debug("Websocket closed", closeEvent);
        setConnectionStatus("disconnected");
        setConnectionError(true);
      }
    };

    const closeSocket = () => {
      console.debug("Disconnecting from websocket");
      closed = true;
      socket.close();
    };

    return () => {
      closeSocket();
      socketRef.current = undefined;
    };
  }, [gameIdNotNull, reconnectCount]);

  // Keep currentDrawRoundRef in sync, and on entering a team draw round request the partner's canvas
  React.useEffect(() => {
    if (!isDrawState(playerState)) return;
    currentDrawRoundRef.current = playerState.round;
    if ((playerState.gameMode ?? "CLASSIC") !== "TEAM") return;
    if (sentCanvasRequestForRoundRef.current === playerState.round) return;
    sentCanvasRequestForRoundRef.current = playerState.round;
    // Small delay to ensure DrawCanvas has mounted and imageProviderRef is set
    const timer = setTimeout(() => {
      socketRef.current?.send(JSON.stringify({
        action: "teamCanvasRequest",
        content: { round: playerState.round },
      }));
    }, 300);
    return () => clearTimeout(timer);
  }, [playerState]);

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

  const handleStrokeSegment = React.useCallback((seg: StrokeSegment) => {
    socketRef.current?.send(JSON.stringify({
      action: "teamStroke",
      content: { ...seg, round: currentDrawRoundRef.current },
    }));
  }, []);

  const handleTeamCanvasRequest = React.useCallback(() => {
    const dataUrl = imageProviderRef.current?.getImageDataURL();
    if (!dataUrl) return;
    socketRef.current?.send(JSON.stringify({
      action: "teamCanvasSync",
      content: { round: currentDrawRoundRef.current, imageDataUrl: dataUrl },
    }));
  }, []);

  const handleSendReplay = React.useCallback((round: number, frames: string[]) => {
    socketRef.current!.send(JSON.stringify({
      action: "drawingReplay",
      content: { round, frames },
    }));
  }, []);

  const handleSpectatorSnapshot = React.useCallback((dataUrl: string) => {
    socketRef.current?.send(JSON.stringify({
      action: "spectatorSnapshot",
      content: { round: currentDrawRoundRef.current, imageDataUrl: dataUrl },
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
        gameMode: settings.gameMode,
        hotPotatoIntervalSeconds: settings.hotPotatoIntervalSeconds,
        hotPotatoTotalSeconds: settings.hotPotatoTotalSeconds,
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
          gameMode={playerState.gameMode ?? "CLASSIC"}
          hotPotatoIntervalSeconds={playerState.hotPotatoIntervalSeconds}
          hotPotatoTotalSeconds={playerState.hotPotatoTotalSeconds}
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
          gameMode={playerState.gameMode ?? "CLASSIC"}
          teamPartner={playerState.teamPartner}
          handleDone={handleTypeDone}
          onSubmit={playSubmitSuccess}
          onUrgentStart={playUrgentStart}
          onTick={playUrgentTick}
          onTimerExpire={playTimerExpire}
        />
      );
    } else if (isDrawState(playerState)) {
      const isTeam = (playerState.gameMode ?? "CLASSIC") === "TEAM";
      return (
        <Draw
          text={playerState.text}
          textWriter={playerState.textWriter}
          round={playerState.round}
          rounds={playerState.rounds}
          roundTimerSeconds={playerState.roundTimerSeconds ?? 0}
          gameMode={playerState.gameMode ?? "CLASSIC"}
          handleDone={handleDrawDone}
          onSubmit={playSubmitSuccess}
          onUrgentStart={playUrgentStart}
          onTick={playUrgentTick}
          onTimerExpire={playTimerExpire}
          onSendReplay={handleSendReplay}
          onStrokeSegment={isTeam ? handleStrokeSegment : undefined}
          onTeamSync={isTeam ? handleTeamCanvasRequest : undefined}
          cacheKey={`draw-${gameIdNotNull}-r${playerState.round}`}
          partnerCursor={isTeam ? partnerCursor : null}
          imageProviderRef={isTeam ? imageProviderRef : undefined}
          spectatorCount={playerState.spectatorCount}
          onSpectatorSnapshot={playerState.spectatorCount ? handleSpectatorSnapshot : undefined}
        />
      );
    } else if (isHotPotatoDrawState(playerState)) {
      return (
        <Draw
          key={`hp-${playerState.rotationNumber}`}
          text=""
          textWriter={{ name: "", face: "A", isCreator: false }}
          round={playerState.rotationNumber}
          rounds={playerState.totalRotations}
          roundTimerSeconds={playerState.intervalSeconds}
          gameMode={playerState.gameMode ?? "HOT_POTATO"}
          handleDone={handleDrawDone}
          onSubmit={playSubmitSuccess}
          onUrgentStart={playUrgentStart}
          onTick={playUrgentTick}
          onTimerExpire={playTimerExpire}
          onSendReplay={handleSendReplay}
          initialImageUrl={playerState.initialCanvasUrl ?? undefined}
          cacheKey={`hp-${gameIdNotNull}-r${playerState.rotationNumber}`}
          spectatorCount={playerState.spectatorCount}
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
      const handleLikeDrawing = (storyIndex: number, elementIndex: number, reaction: string) => {
        send({ action: "rateDrawing", content: { storyIndex, roundIndex: elementIndex, reaction } });
      };
      const handleRematch = () => {
        send({ action: "rematch" });
      };
      return (
        <GameFinished
          stories={playerState.stories}
          onReveal={playRevealPop}
          onFanfare={playFanfare}
          onExplosion={playExplosionPop}
          onLikeDrawing={handleLikeDrawing}
          onRematch={handleRematch}
          onMainMenu={() => navigate("/")}
          rematchVoters={playerState.rematchVoters}
          totalPlayers={playerState.totalPlayers}
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
          currentDrawings={playerState.currentDrawings}
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
      {ReactDOM.createPortal(
        <div
          title={
            connectionStatus === "connected" ? "Connected" :
            connectionStatus === "connecting" ? "Connecting..." : "Disconnected"
          }
          style={{
            position: "fixed",
            top: 8,
            right: 8,
            width: 10,
            height: 10,
            borderRadius: "50%",
            zIndex: 1000,
            pointerEvents: "none",
            background: connectionStatus === "connected" ? "#00ff88" : connectionStatus === "connecting" ? "#ffcc00" : "#ff4444",
            boxShadow: connectionStatus === "connected" ? "0 0 6px #00ff88" : connectionStatus === "connecting" ? "0 0 6px #ffcc00" : "0 0 6px #ff4444",
          }}
        />,
        document.body
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
  onLikeDrawing,
  onRematch,
  onMainMenu,
  rematchVoters,
  totalPlayers,
}: {
  stories: StoryContent[];
  onReveal?: () => void;
  onFanfare?: () => void;
  onExplosion?: () => void;
  onLikeDrawing?: (storyIndex: number, elementIndex: number, reaction: string) => void;
  onRematch?: () => void;
  onMainMenu?: () => void;
  rematchVoters?: PlayerInfo[];
  totalPlayers?: number;
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
        onLikeDrawing={onLikeDrawing}
        onRematch={onRematch}
        onMainMenu={onMainMenu}
        rematchVoters={rematchVoters}
        totalPlayers={totalPlayers}
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

