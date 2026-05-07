import React from "react";
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
  const [isLoading, setIsLoading] = React.useState(false);

  const navigate = useNavigate();

  const handleDone = async (face: string, name: string) => {
    interface CreatedGameResponse {
      gameId: string;
    }

    setIsLoading(true);
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
      setIsLoading(false);
      setError(true);
    }
  };

  return (
    <>
      <ConnectionLostErrorDialog
        show={error}
        handleReconnect={() => setError(false)}
      />
      <CreateOrJoin buttonLabel="Create game" handleDone={handleDone} isLoading={isLoading} />
    </>
  );
};

export const Join = ({
  handleDone,
}: {
  handleDone: (face: string, name: string) => void;
}) => {
  return <CreateOrJoin buttonLabel="Join game" handleDone={handleDone} />;
};

const CreateOrJoin = ({
  buttonLabel,
  handleDone,
  isLoading = false,
}: {
  buttonLabel: string;
  handleDone: (face: string, name: string) => void;
  isLoading?: boolean;
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

  const buttonDisabled = isBlank(name) || isLoading;

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
      />
      <br />
      <button
        className="button"
        disabled={buttonDisabled}
        onClick={() => handleDone(face, name.trim())}
      >
        {isLoading ? "Creating…" : buttonLabel}
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

const SelectFace = ({
  face,
  faces,
  handleChange,
}: {
  face: string;
  faces: string;
  handleChange: (face: string) => void;
}) => {
  const nextFace = () => {
    const newFace = faces.charAt((faces.indexOf(face) + 1) % faces.length);
    handleChange(newFace);
  };

  return (
    <div
      className="SelectFace"
      onClick={nextFace}
      role="button"
      tabIndex={0}
      aria-label={`Avatar: ${face}. Click or press Enter to change`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          nextFace();
        }
      }}
    >
      <Face face={face} small={false} />
    </div>
  );
};

const CODE_LENGTH = 5;
const codePattern = `^[a-z0-9]{${CODE_LENGTH}}$`;
const codeRegex = new RegExp(codePattern);

export const JoinWithCode = () => {
  const [code, setCode] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const buttonDisabled = !codeRegex.test(code) || isLoading;

  const handleChangeCode = (newCode: string) => {
    setCode(newCode.toLowerCase());
  };

  const navigate = useNavigate();

  const handleJoin = () => {
    setIsLoading(true);
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
        inputMode="text"
        spellCheck={false}
        value={code}
        onChange={(event) => handleChangeCode(event.target.value)}
      />
      <br />
      <button
        className="button"
        disabled={buttonDisabled}
        onClick={handleJoin}
        title={buttonDisabled && !isLoading ? "Game code should have five characters" : ""}
      >
        {isLoading ? "Joining…" : "Join game"}
      </button>
    </LogoLeftScreen>
  );
};
