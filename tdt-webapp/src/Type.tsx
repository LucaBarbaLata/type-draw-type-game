import React from "react";

import { isBlank } from "./helpers";
import Scrollable from "./Scrollable";
import { GameMode, PlayerInfo } from "./model";
import RoundTimer from "./RoundTimer";
import WaitingMessage from "./WaitingMessage";

import "./Type.css";

import typeImg from "./img/type.svg";

const Type = ({
  round,
  rounds,
  drawingSrc,
  artist,
  roundTimerSeconds,
  gameMode,
  teamPartner,
  handleDone,
  onSubmit,
  onUrgentStart,
  onTick,
  onTimerExpire,
}: {
  round: number;
  rounds: number;
  drawingSrc: string | null;
  artist: PlayerInfo | null;
  roundTimerSeconds: number;
  gameMode: GameMode;
  teamPartner?: PlayerInfo;
  handleDone: (text: string) => void;
  onSubmit?: () => void;
  onUrgentStart?: () => void;
  onTick?: () => void;
  onTimerExpire?: () => void;
}) => {
  const oneWord = gameMode === "ONE_WORD";
  const [text, setText] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const submittedRef = React.useRef(false);

  const buttonDisabled = isBlank(text);

  const first = drawingSrc === null;

  const submitText = React.useCallback(
    (value: string) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      onSubmit?.();
      setSubmitted(true);
      handleDone(value.trim() || "(no response)");
    },
    [handleDone, onSubmit]
  );

  const handleTimerExpire = React.useCallback(() => {
    onTimerExpire?.();
    submitText(text);
  }, [submitText, text, onTimerExpire]);

  if (submitted) {
    return (
      <div className="Type-waiting">
        <WaitingMessage context="type" />
      </div>
    );
  }

  return (
    <Scrollable>
      {roundTimerSeconds > 0 && (
        <RoundTimer seconds={roundTimerSeconds} onExpire={handleTimerExpire} onUrgentStart={onUrgentStart} onTick={onTick} />
      )}
      <div className="Type">
        <div>
          <div className="small">
            Round {round} of {rounds}
          </div>
          <h1>
            <img src={typeImg} alt="Type" />
          </h1>
          <div>
            {first
              ? oneWord ? "... a single word:" : "... a sentence or short story:"
              : "... what you see on the drawing below:"}
          </div>
          {oneWord && (
            <div className="small" style={{ color: "var(--cyber-magenta)", marginTop: "0.5em" }}>
              One word only — no spaces!
            </div>
          )}
        </div>
        {oneWord ? (
          <input
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value.replace(/\s/g, ""))}
            maxLength={50}
            style={{ textAlign: "center" }}
          />
        ) : (
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={2000}
          />
        )}
        {first && (
          <div className="small">
            {teamPartner ? "The next team will have to draw your text." : "The next player will have to draw your text."}
          </div>
        )}
        {!first && (
          <div>
            Art by {artist!.name}:
            <img src={drawingSrc!} className="Drawing" alt="Drawing" />
          </div>
        )}
        <button
          className="button"
          disabled={buttonDisabled}
          onClick={() => submitText(text)}
        >
          Done
        </button>
      </div>
    </Scrollable>
  );
};

export default Type;
