# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A multiplayer party game (Telephone Pictionary) where players alternate between typing sentences and drawing pictures. Only the previous player's output is visible to the next player, creating a "telephone" chain effect. Supports 9 game modes and real-time multiplayer via WebSocket.

## Project Structure

Two sub-projects:

- `tdt-webapp/` — React + TypeScript frontend (Vite)
- `tdt-server/` — Spring Boot backend (Java 21, Gradle)

## Commands

### Frontend (`tdt-webapp/`)

```sh
yarn dev       # Dev server at localhost:5173 (proxies /api to :8080)
yarn build     # tsc + vite build
yarn lint      # ESLint (zero warnings allowed)
yarn preview   # Preview prod build
```

### Backend (`tdt-server/`)

```sh
./gradlew bootRun              # Run server at :8080
./gradlew test                 # Run tests
./gradlew build --continuous   # Watch mode
```

### Docker (production)

```sh
./build.sh    # Builds frontend, packages into Spring Boot jar, builds Docker image
docker run -p 8080:8080 -v tdt-data:/data type-draw-type
```

## Architecture

### Communication Protocol

All game state flows over a single WebSocket connection at `/api/ws` (Vite proxies this in dev). The pattern is:

1. Client sends a JSON action: `{ "action": "join" | "type" | "draw" | "vote" | ... , ...payload }`
2. Server updates state and broadcasts a new `PlayerState` JSON object to every connected client
3. Frontend switches UI based on the `state` discriminator field in the received object

Drawing images travel as base64 DataURLs embedded in JSON. Timelapse replays during story reveal are sent as binary WebSocket messages.

### Frontend State Machine (`tdt-webapp/src/`)

`Game.tsx` is the central orchestrator. It holds the WebSocket connection and the current `PlayerState` received from the server. Child components are rendered based on type guards:

- `isWaitForPlayersState()` → `WaitForPlayers.tsx`
- `isTypeState()` → `Type.tsx`
- `isDrawState()` / `isHotPotatoDrawState()` → `Draw.tsx`
- `isStoriesState()` → `Stories.tsx`

State is server-driven — the frontend has no local game state machine; it simply reflects whatever the server sends.

Notable: `DrawCanvas.tsx` handles the full canvas engine (pen, fill, shapes, undo/redo). Drawing progress is cached in `sessionStorage` for crash recovery.

### Backend State Machine (`tdt-server/`)

Each player has a `PlayerState` (abstract base) with concrete implementations in `playerstate/`. `GameManager.java` drives round transitions. `WebSocketHandler.java` routes incoming action messages to the appropriate handler in `actions/`. `GameLoader.java` handles JSON persistence to a Docker volume.

### Audio

Entirely synthesized via Web Audio API — no audio files. See `tdt-webapp/src/audio/audioEngine.ts`.
