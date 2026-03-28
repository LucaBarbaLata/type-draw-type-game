import React from "react";
import styled from "styled-components";

import { PlayerInfo } from "./model";
import Player from "./Player";
import Logo from "./Logo";

import "./BeforeGameStartScreens.css";

export interface GameSettings {
  roundTimerSeconds: number;
  maxPlayers: number;
}

export const WaitForPlayersScreen = ({
  gameId,
  players,
  handleStart,
  handleSettingsChange,
}: {
  gameId: string;
  players: PlayerInfo[];
  handleStart: (settings: GameSettings) => void;
  handleSettingsChange: (settings: GameSettings) => void;
}) => {
  const [roundTimerSeconds, setRoundTimerSeconds] = React.useState(0);
  const [maxPlayers, setMaxPlayers] = React.useState(0);

  const notifyChange = (timerSecs: number, maxP: number) => {
    handleSettingsChange({ roundTimerSeconds: timerSecs, maxPlayers: maxP });
  };

  const buttonDisabled = players.length <= 1;

  const link = window.location.toString();

  return (
    <BeforeGameStartScreen players={players}>
      <Logo />
      <div>Ask your friends to join the game:</div>
      <div>
        <div className="field-label">Game Code:</div>
        <div className="field">{gameId}</div>
      </div>
      <div>
        <div className="field-label">Link:</div>
        <div className="field">{link}</div>
      </div>
      <SettingsSection>
        <SettingsTitle>Game Settings</SettingsTitle>
        <SettingRow>
          <label htmlFor="timer-select">Round Timer:</label>
          <select
            id="timer-select"
            value={roundTimerSeconds}
            onChange={(e) => {
              const v = Number(e.target.value);
              setRoundTimerSeconds(v);
              notifyChange(v, maxPlayers);
            }}
          >
            <option value={0}>No limit</option>
            <option value={30}>30 seconds</option>
            <option value={60}>60 seconds</option>
            <option value={90}>90 seconds</option>
            <option value={120}>2 minutes</option>
            <option value={180}>3 minutes</option>
          </select>
        </SettingRow>
        <SettingRow>
          <label htmlFor="maxplayers-select">Max Players:</label>
          <select
            id="maxplayers-select"
            value={maxPlayers}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMaxPlayers(v);
              notifyChange(roundTimerSeconds, v);
            }}
          >
            <option value={0}>No limit</option>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
              <option key={n} value={n}>
                {n} players
              </option>
            ))}
          </select>
        </SettingRow>
      </SettingsSection>
      <div className="buttons">
        <button
          className="button"
          disabled={buttonDisabled}
          title={
            buttonDisabled
              ? "Waiting for more players"
              : "Let's get this party started!"
          }
          onClick={() => handleStart({ roundTimerSeconds, maxPlayers })}
        >
          Start Game
        </button>
      </div>
      <div className="small">
        Once the game has started, no additional players can join!
      </div>
    </BeforeGameStartScreen>
  );
};

export const WaitForGameStartScreen = ({
  players,
}: {
  players: PlayerInfo[];
}) => {
  const creator = players.find((p) => p.isCreator)!;

  return (
    <BeforeGameStartScreen players={players}>
      <div>Waiting for {creator.name} to start game.</div>
    </BeforeGameStartScreen>
  );
};

const BeforeGameStartScreen = ({
  players,
  children,
}: {
  players: PlayerInfo[];
  children: React.ReactNode;
}) => {
  return (
    <div className="BeforeGameStartScreen">
      <div className="BeforeGameStartScreen-left">
        <div className="Players-title">Players:</div>
        <div className="Players">
          {players.map((player, index) => (
            <Player key={index} face={player.face}>
              {player.name}
            </Player>
          ))}
        </div>
      </div>
      <div className="BeforeGameStartScreen-right">{children}</div>
    </div>
  );
};

const SettingsSection = styled.div`
  margin: 2vmin 0;
  padding: 2vmin;
  background: rgba(0, 245, 255, 0.03);
  border: 1.5px solid rgba(0, 245, 255, 0.3);
  border-radius: 1vmin;
  min-width: 30vmin;
  box-shadow: 0 0 12px rgba(0, 245, 255, 0.08);
`;

const SettingsTitle = styled.div`
  font-weight: bold;
  margin-bottom: 1.5vmin;
  font-size: 1.8vmin;
  color: #00f5ff;
  text-shadow: 0 0 8px #00f5ff;
  text-transform: uppercase;
  letter-spacing: 0.12em;
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2vmin;
  margin-bottom: 1vmin;

  label {
    font-size: 1.6vmin;
    white-space: nowrap;
    color: #6688aa;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  select {
    font-size: 1.6vmin;
    padding: 0.5vmin 1vmin;
    border-radius: 0.5vmin;
    border: 1.5px solid rgba(0, 245, 255, 0.4);
    background: rgba(0, 245, 255, 0.06);
    color: #00f5ff;
    cursor: pointer;
    outline: none;
    box-shadow: 0 0 6px rgba(0, 245, 255, 0.15);
  }

  select option {
    background: #0c0c20;
    color: #c8d8f0;
  }
`;

export default WaitForPlayersScreen;
