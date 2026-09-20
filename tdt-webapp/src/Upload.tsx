import React from "react";
import styled, { keyframes } from "styled-components";

import Scrollable from "./Scrollable";
import RoundTimer from "./RoundTimer";
import { blobToDataURL, makePlaceholderImage, prepareUploadImage, UploadImageError } from "./imageUtils";

import "./Upload.css";

/** If the server has not moved us on after this long, assume the upload was rejected and let the player retry. */
const SEND_TIMEOUT_MS = 8000;

type Status = "idle" | "preparing" | "ready" | "sending" | "error";

const Upload = ({
  round,
  rounds,
  roundTimerSeconds,
  handleDone,
  onSubmit,
  onUrgentStart,
  onTick,
  onTimerExpire,
  cacheKey,
}: {
  round: number;
  rounds: number;
  roundTimerSeconds: number;
  handleDone: (image: Blob) => void;
  onSubmit?: () => void;
  onUrgentStart?: () => void;
  onTick?: () => void;
  onTimerExpire?: () => void;
  cacheKey?: string;
}) => {
  const [status, setStatus] = React.useState<Status>("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const blobRef = React.useRef<Blob | null>(null);
  const sendTimeoutRef = React.useRef<number | undefined>();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Restore a photo chosen before a page refresh
  React.useEffect(() => {
    if (!cacheKey) return;
    const cached = sessionStorage.getItem(cacheKey);
    if (!cached) return;
    let cancelled = false;
    window
      .fetch(cached)
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return;
        blobRef.current = blob;
        setPreviewUrl(cached);
        setStatus("ready");
      })
      .catch(() => sessionStorage.removeItem(cacheKey));
    return () => { cancelled = true; };
  }, [cacheKey]);

  React.useEffect(() => () => window.clearTimeout(sendTimeoutRef.current), []);

  const handleFileChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow picking the same file again
    if (!file) return;
    setStatus("preparing");
    setErrorMessage(null);
    try {
      const blob = await prepareUploadImage(file);
      blobRef.current = blob;
      const dataUrl = await blobToDataURL(blob);
      setPreviewUrl(dataUrl);
      setStatus("ready");
      if (cacheKey) {
        try {
          sessionStorage.setItem(cacheKey, dataUrl);
        } catch { /* quota exceeded */ }
      }
    } catch (e) {
      blobRef.current = null;
      setPreviewUrl(null);
      setErrorMessage(e instanceof UploadImageError ? e.message : "Could not read that image. Please try another one.");
      setStatus("error");
    }
  };

  const send = React.useCallback((blob: Blob) => {
    setStatus("sending");
    setErrorMessage(null);
    if (cacheKey) sessionStorage.removeItem(cacheKey);
    onSubmit?.();
    handleDone(blob);
    // The server answers with the next player state (which unmounts this screen). If that never happens the
    // upload was rejected — let the player try again.
    window.clearTimeout(sendTimeoutRef.current);
    sendTimeoutRef.current = window.setTimeout(() => {
      setErrorMessage("Upload failed. Please try a smaller photo.");
      setStatus("error");
    }, SEND_TIMEOUT_MS);
  }, [cacheKey, handleDone, onSubmit]);

  const handleClickDone = () => {
    if (blobRef.current) send(blobRef.current);
  };

  const handleTimerExpire = React.useCallback(() => {
    onTimerExpire?.();
    if (blobRef.current) {
      send(blobRef.current);
    } else {
      makePlaceholderImage().then(send);
    }
  }, [send, onTimerExpire]);

  const busy = status === "preparing" || status === "sending";

  return (
    <Scrollable>
      {roundTimerSeconds > 0 && (
        <RoundTimer seconds={roundTimerSeconds} onExpire={handleTimerExpire} onUrgentStart={onUrgentStart} onTick={onTick} />
      )}
      <div className="Upload">
        <div>
          <div className="small">
            Round {round} of {rounds}
          </div>
          <h1>
            <CameraIcon aria-hidden="true">📷</CameraIcon> Upload
          </h1>
          <div>... a photo. Another player will have to redraw it by hand!</div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChosen}
          className="Upload-input"
        />

        {previewUrl ? (
          <div className="Upload-preview">
            <img src={previewUrl} className="Drawing" alt="Your photo" />
          </div>
        ) : (
          <button
            className="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose photo
          </button>
        )}

        {status === "preparing" && <StatusText>Preparing photo…</StatusText>}
        {status === "sending" && <StatusText>Sending…</StatusText>}
        {errorMessage && <ErrorText>{errorMessage}</ErrorText>}

        <div className="Upload-buttons">
          {previewUrl && (
            <button
              className="button button-red"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              Pick another
            </button>
          )}
          <button
            className="button"
            disabled={busy || !blobRef.current}
            onClick={handleClickDone}
          >
            Done
          </button>
        </div>
      </div>
    </Scrollable>
  );
};

export default Upload;

const pulse = keyframes`
  0%, 100% { opacity: 0.55; }
  50%       { opacity: 1; }
`;

const CameraIcon = styled.span`
  filter: var(--cyber-icon-glow);
`;

const StatusText = styled.div`
  color: var(--cyber-cyan);
  text-shadow: var(--cyber-glow);
  letter-spacing: 0.1em;
  animation: ${pulse} 1.6s ease-in-out infinite;
`;

const ErrorText = styled.div`
  color: var(--cyber-magenta);
  text-shadow: var(--cyber-glow-magenta);
  max-width: 80vw;
  text-align: center;
`;
