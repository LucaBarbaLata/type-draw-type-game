import React from "react";
import styled, { keyframes } from "styled-components";
import { useNavigate } from "react-router-dom";

import {
  toggleToFullscreenAndLandscapeOnMobile,
  getRandomCharacterFromString,
  isBlank,
  getPlayerId,
  useLocalStorageState,
} from "./helpers";
import Logo from "./Logo";
import Face from "./Face";
import HowToButtonAndDialog from "./HowToButtonAndDialog";
import { ConnectionLostErrorDialog } from "./ErrorDialogs";

import "./CreateOrJoin.css";

export const Create = () => {
  const [error, setError] = React.useState(false);

  const navigate = useNavigate();

  const handleDone = async (face: string, name: string) => {
    interface CreatedGameResponse {
      gameId: string;
    }

    try {
      const response = await window.fetch("/api/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: getPlayerId(),
          playerName: name,
          playerFace: face,
        }),
      });

      const createdGame: CreatedGameResponse = await response.json();
      const gameId = createdGame.gameId;

      navigate(`/g/${gameId}`);
    } catch (e) {
      console.log("Error creating game", e);
      setError(true);
    }
  };

  return (
    <>
      <ConnectionLostErrorDialog
        show={error}
        handleReconnect={() => setError(false)}
      />
      <CreateOrJoin buttonLabel="Create game" handleDone={handleDone} />
    </>
  );
};

export const Join = ({
  handleDone,
  takenName,
}: {
  handleDone: (face: string, name: string) => void;
  /** Name the server rejected because another player in the lobby already uses it */
  takenName?: string;
}) => {
  return (
    <CreateOrJoin
      buttonLabel="Join game"
      handleDone={handleDone}
      takenName={takenName}
    />
  );
};

const nameShake = keyframes`
  0%, 100% { transform: translateX(0); }
  25%       { transform: translateX(-4px); }
  60%       { transform: translateX(4px); }
  85%       { transform: translateX(-2px); }
`;

const CreateOrJoin = ({
  buttonLabel,
  handleDone,
  takenName,
}: {
  buttonLabel: string;
  handleDone: (face: string, name: string) => void;
  takenName?: string;
}) => {
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

  // The server compares names without surrounding whitespace and ignoring case, so mirror that here: the error
  // disappears as soon as a different name is typed and comes back if the rejected one is typed again.
  const nameIsTaken =
    takenName !== undefined &&
    name.trim().toLowerCase() === takenName.trim().toLowerCase();

  const buttonDisabled = isBlank(name) || nameIsTaken;

  const handleChangeFace = (newFace: string) => setFace(newFace);

  return (
    <LogoLeftScreen>
      Pick your look:
      <br />
      <SelectFace face={face} faces={faces} handleChange={handleChangeFace} />
      <label htmlFor="name">Enter your name:</label>
      <input
        type="text"
        id="name"
        name="name"
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={nameMaxLength}
        aria-invalid={nameIsTaken}
      />
      {nameIsTaken ? (
        <NameTakenMessage role="alert">
          Someone in this lobby is already called <strong>{name.trim()}</strong>
          . Pick another name.
        </NameTakenMessage>
      ) : (
        <br />
      )}
      <button
        className="button"
        disabled={buttonDisabled}
        onClick={() => handleDone(face, name.trim())}
      >
        {buttonLabel}
      </button>
    </LogoLeftScreen>
  );
};

const LogoLeftScreen = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="Join">
      <div className="Join-logo">
        <Logo />
        <HowToButtonAndDialog />
      </div>
      <div className="Join-content">{children}</div>
    </div>
  );
};

const NameTakenMessage = styled.div`
  color: var(--cyber-magenta);
  text-shadow: var(--cyber-text-glow-magenta);
  font-size: 0.8em;
  /* sits in the gap below the name input (its own margin-bottom), just above the button */
  margin: 0 auto 2vmin;
  max-width: 80%;
  animation: ${nameShake} 0.45s ease-out;

  strong {
    word-break: break-word;
  }
`;

const facePop = keyframes`
  0%   { transform: scale(0.7) rotate(-10deg); opacity: 0.5; }
  65%  { transform: scale(1.1) rotate(4deg);   opacity: 1; }
  100% { transform: scale(1)   rotate(0deg);   opacity: 1; }
`;

const FaceWrapper = styled.div`
  animation: ${facePop} 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
`;

const SelectFace = ({
  face,
  faces,
  handleChange,
}: {
  face: string;
  faces: string;
  handleChange: (face: string) => void;
}) => {
  const [flipKey, setFlipKey] = React.useState(0);

  const nextFace = () => {
    const newFace = faces.charAt((faces.indexOf(face) + 1) % faces.length);
    handleChange(newFace);
    setFlipKey((k) => k + 1);
  };

  return (
    <div className="SelectFace" onClick={nextFace} title="Click to change your character">
      <FaceWrapper key={flipKey}>
        <Face face={face} small={false} />
      </FaceWrapper>
    </div>
  );
};

const CODE_LENGTH = 5;
const codePattern = `^[a-z0-9]{${CODE_LENGTH}}$`;
const codeRegex = new RegExp(codePattern);

export const JoinWithCode = () => {
  const [code, setCode] = React.useState("");

  const buttonDisabled = !codeRegex.test(code);

  const handleChangeCode = (newCode: string) => {
    setCode(newCode.toLowerCase());
  };

  const navigate = useNavigate();

  const handleJoin = () => {
    navigate(`/g/${code}`);
    toggleToFullscreenAndLandscapeOnMobile();
  };

  return (
    <LogoLeftScreen>
      <label htmlFor="code">Enter Game Code:</label>
      <input
        type="text"
        id="code"
        name="code"
        minLength={CODE_LENGTH}
        maxLength={CODE_LENGTH}
        pattern={codePattern}
        autoFocus
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        value={code}
        onChange={(event) => handleChangeCode(event.target.value)}
      />
      <br />
      <button
        className="button"
        disabled={buttonDisabled}
        onClick={handleJoin}
        title={buttonDisabled ? "Game code should have five characters" : ""}
      >
        Join game
      </button>
    </LogoLeftScreen>
  );
};
