import React from "react";
import { Routes, Route } from "react-router-dom";

import { toggleToFullscreenAndLandscapeOnMobile } from "./helpers";
import Home from "./Home";
import Game from "./Game";
import Gallery from "./Gallery";
import ServerBrowser from "./ServerBrowser";
import { Create, JoinWithCode } from "./CreateOrJoin";
import ThemeSwitcher from "./ThemeSwitcher";
import ErrorBoundary from "./ErrorBoundary";

import "./App.css";

const App = () => {
  React.useEffect(() => {
    window.document.body.addEventListener(
      "click",
      toggleToFullscreenAndLandscapeOnMobile
    );

    return () => {
      window.document.body.removeEventListener(
        "click",
        toggleToFullscreenAndLandscapeOnMobile
      );
    };
  }, []);

  return (
    <>
      <div className="App">
        <ErrorBoundary>
          <Routes>
            <Route path="/join" element={<JoinWithCode />} />
            <Route path="/new" element={<Create />} />
            <Route path="/g/:gameId" element={<Game />} />
            <Route path="/g/:gameId/gallery" element={<Gallery />} />
            <Route path="/server-browser" element={<ServerBrowser />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </ErrorBoundary>
      </div>
      {/* Outside .App so the `.App > div` sizing rule doesn't apply to it */}
      <ThemeSwitcher />
    </>
  );
};

export default App;
