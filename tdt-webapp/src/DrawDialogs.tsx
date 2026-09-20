import styled from "styled-components";

import NewlineToBreak from "./NewLineToBreak";
import { PlayerInfo } from "./model";
import Dialog from "./Dialog";
import Scrollable from "./Scrollable";
import ThemedIcon from "./ThemedIcon";

export const ConfirmDrawingDialog = ({
  text,
  referenceImageSrc,
  show,
  drawingDataUrl,
  handleDone,
  handleContinue,
}: {
  text: string;
  referenceImageSrc?: string;
  show: boolean;
  drawingDataUrl?: string;
  handleDone: () => void;
  handleContinue: () => void;
}) => {
  return (
    <Dialog show={show}>
      <ConfirmDrawingDialogContent>
        <h1>Are you finished with your drawing?</h1>
        {referenceImageSrc ? (
          <Comparison>
            <img src={referenceImageSrc} alt="Photo" />
            <img src={drawingDataUrl} alt="Drawing" />
          </Comparison>
        ) : (
          <>
            <Text className="ConfirmDrawingDialogContent-text">
              {NewlineToBreak(text)}
            </Text>
            <div>
              <img src={drawingDataUrl} alt="Drawing" />
            </div>
          </>
        )}
        <div className="buttons">
          <button className="button" onClick={handleDone}>
            Yes, I'm done
          </button>
          <button className="button button-red" onClick={handleContinue}>
            No, continue drawing
          </button>
        </div>
      </ConfirmDrawingDialogContent>
    </Dialog>
  );
};

const ConfirmDrawingDialogContent = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;

  img {
    border: 0.7vmin solid black;
    border-radius: 2vmin;
    max-height: 50vh;
    max-width: 80%;
  }

  .ConfirmDrawingDialogContent-text {
    flex-shrink: 1;
    max-height: fit-content;
  }
`;

const Comparison = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 2vmin;
  max-width: 100%;

  img {
    max-width: 40%;
    max-height: 50vh;
    object-fit: contain;
  }
`;

const ReferencePhoto = styled.img`
  max-width: 90%;
  max-height: 55vh;
  object-fit: contain;
  border: 1.5px solid rgba(var(--cyber-cyan-rgb), 0.5);
  border-radius: 1vmin;
  box-shadow: var(--cyber-glow);
  margin: 2vmin 0;
`;

export const DrawHelpDialog = ({
  text,
  referenceImageSrc,
  textWriter,
  round,
  rounds,
  show,
  firstShow,
  handleClose,
}: {
  text: string;
  referenceImageSrc?: string;
  textWriter: PlayerInfo;
  round: number;
  rounds: number;
  show: boolean;
  firstShow: boolean;
  handleClose: () => void;
}) => {
  return (
    <Dialog show={show}>
      <Scrollable>
        <div className="DrawHelp">
          <div>
            <div className="small">
              Round {round} of {rounds}
            </div>
            <h1>
              <ThemedIcon name="draw" label="Draw" />
            </h1>
            <div>... this {referenceImageSrc ? "photo" : "text"} by {textWriter.name}:</div>
          </div>
          {referenceImageSrc ? (
            <ReferencePhoto src={referenceImageSrc} alt={`Photo by ${textWriter.name}`} />
          ) : (
            <Text>{NewlineToBreak(text)}</Text>
          )}
          <button className="button" onClick={handleClose}>
            Okay, {firstShow ? "start" : "continue"} drawing
          </button>
        </div>
      </Scrollable>
    </Dialog>
  );
};


const Text = styled.div`
  border-radius: 2vmin;
  padding: 1vmin 2vmin;
  background-color: rgba(var(--cyber-cyan-rgb), 0.1);
  border: 1.5px solid rgba(var(--cyber-cyan-rgb), 0.5);
  color: var(--cyber-text);
  width: 90%;
  box-shadow: var(--cyber-glow);
  margin: 2vmin 0;
  word-break: break-word;
  overflow-wrap: anywhere;
  overflow: auto;
`;
