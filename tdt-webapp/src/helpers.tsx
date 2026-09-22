import React from "react";
import { v4 as uuidv4 } from "uuid";
import o9n from "o9n";

import { DeviceType } from "./model";

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Which kind of device this player is on, sent to the server on create/join so
 * the lobby can show everyone who is on a phone (small screen, finger drawing)
 * and who is on a computer. Only ever a guess, so it is used for decoration and
 * nothing that affects gameplay.
 */
export function getDeviceType(): DeviceType {
  // Chromium's client hint is the one source that is actually told to us rather
  // than sniffed out of a user agent string, so it wins where it exists.
  const uaData = (
    navigator as Navigator & { userAgentData?: { mobile?: boolean } }
  ).userAgentData;
  if (typeof uaData?.mobile === "boolean") {
    return uaData.mobile ? "MOBILE" : "DESKTOP";
  }
  if (isMobileDevice()) return "MOBILE";
  // iPadOS 13+ sends a desktop user agent, so the regex above misses it. A
  // touch screen as the *primary* pointer catches it; a laptop with a
  // touchscreen still reports a fine pointer and stays DESKTOP.
  if (
    navigator.maxTouchPoints > 1 &&
    window.matchMedia("(pointer: coarse)").matches
  ) {
    return "MOBILE";
  }
  return "DESKTOP";
}

export function toggleToFullscreenAndLandscapeOnMobile() {
  if (isMobileDevice()) {
    if (document.documentElement.requestFullscreen) {
      document.documentElement
        .requestFullscreen()
        .then(() => {
          o9n.orientation
            .lock("landscape-primary")
            .catch(() => console.log("Cannot change orientation"));
        })
        .catch(() => console.log("Cannot switch to fullscreen"));
    }
  }
}

export function useWindowSize() {
  function getSize() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  const [windowSize, setWindowSize] = React.useState(getSize);

  React.useEffect(() => {
    function handleResize() {
      setWindowSize(getSize());
    }

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}

export function getRandomCharacterFromString(s: string) {
  return s.charAt(Math.floor(Math.random() * s.length));
}

// calculates size and position of img/canvas with css object-fit: contain
function getObjectFitSize(
  containerWidth: number,
  containerHeight: number,
  width: number,
  height: number
) {
  const doRatio = width / height;
  const cRatio = containerWidth / containerHeight;
  let targetWidth = 0;
  let targetHeight = 0;

  if (doRatio > cRatio) {
    targetWidth = containerWidth;
    targetHeight = targetWidth / doRatio;
  } else {
    targetHeight = containerHeight;
    targetWidth = targetHeight * doRatio;
  }

  return {
    width: targetWidth,
    height: targetHeight,
    x: (containerWidth - targetWidth) / 2,
    y: (containerHeight - targetHeight) / 2,
  };
}

export function getCanvasSize(canvas: HTMLCanvasElement) {
  return getObjectFitSize(
    canvas.clientWidth,
    canvas.clientHeight,
    canvas.width,
    canvas.height
  );
}

export function isBlank(str: string) {
  return !/\S/.test(str);
}

export function getPlayerId() {
  const store = window.localStorage;
  let playerId = store.getItem("playerId");
  if (playerId === null) {
    playerId = uuidv4();
    store.setItem("playerId", playerId);
  }
  return playerId;
}

export function useLocalStorageState(
  key: string,
  initialValue: string | (() => string)
): [string, (value: string) => void] {
  const [storedValue, setStoredValue] = React.useState(() => {
    const item = window.localStorage.getItem(key);
    if (item !== null) {
      return item;
    } else {
      // Allow initialValue to be a function so we have same API as useState
      const value =
        initialValue instanceof Function ? initialValue() : initialValue;
      return value;
    }
  });

  const setValue = (value: string) => {
    window.localStorage.setItem(key, value);
    setStoredValue(value);
  };

  return [storedValue, setValue];
}
