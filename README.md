# Type Draw Type

![Type Draw Type Logo](/tdt-webapp/src/img/logo.svg?raw=true&sanitize=true)

A multiplayer party game in the spirit of Telephone Pictionary. Players alternate between typing sentences and drawing pictures, each only seeing the previous player's output. By the end, the original sentence has usually transformed into something completely different — and hilarious.

This is a heavily modified fork of [Hermann Czedik-Eysenberg's original](https://github.com/Bronkoknorb/type-draw-type-game).

---

## How it works

1. Every player types a starting sentence.
2. The sentences are shuffled and passed on — the next player draws what they received.
3. The drawing is passed on — the next player types what they see (without knowing the original sentence).
4. This continues, alternating typing and drawing, until everyone has touched every chain.
5. All stories are revealed at the end for maximum confusion and laughter.

With N players there are N rounds and N stories — each player contributes exactly once to each chain.

---

## Game Modes

Select a mode when creating a lobby. All players see the active mode before the game starts.

| Mode | Description |
|---|---|
| **Classic** | The original game — type, draw, repeat. |
| **One-Word** | Typing phases are limited to a single word — no spaces allowed. |
| **Shaky Hands** | A random wobble is added to every stroke. Good luck drawing a straight line. |
| **Blind Draw** | Your brush is invisible while you draw. Strokes only appear when you lift the pen. |
| **Telephone Noir** | The colour palette is locked to black, white, and grey. All drawings must be monochrome. |
| **Opposite Mode** | Always draw the *opposite* of what you receive. The chain constantly inverts itself. |
| **Fog of War** | Only a small circle around your cursor is visible while drawing. |
| **Hot Canvas** | All players draw simultaneously. Every rotation the server passes each canvas to the next player — nobody finishes their own drawing. |
| **Team Mode** | Two players share one canvas and draw on it simultaneously in real time via WebSocket stroke relay. |

---

## Features

### Gameplay
- **Round timer** — optional per-round time limit (30 / 60 / 90 / 120 / 180 seconds), with audio warnings and auto-submit on expiry
- **Max players** — creator can cap the lobby at 2–12 players
- **Spectator mode** — late joiners watch the game without disrupting ongoing rounds
- **Auto-reconnect** — WebSocket reconnects automatically on connection drops; player name and face are remembered across sessions
- **Canvas caching** — drawing progress is saved to sessionStorage so a reload or brief disconnect doesn't wipe your work

### Drawing tools
- Pen, eraser, flood fill, line, rectangle, ellipse
- 5 brush sizes with visual preview
- Full color picker
- Undo / redo (up to 50 steps)
- Drawing timelapse replay — captured during the draw round and played back during the story reveal (click to play/pause)

### Lobby & sharing
- Shareable game code and URL
- QR code for instant mobile joining (click to download as PNG)

### Results
- Progressive story reveal — uncover one element at a time with animations
- Download any story as a formatted PNG image

### How to Play guide
- Interactive 5-step tutorial built into the home screen, with mockup examples for each phase

### Audio
- Fully synthesized sounds via Web Audio API (no samples) — round start, urgent countdown ticks, timer expire, submit, reveal, fanfare, and more
- Global mute toggle

### UI
- Cyberpunk aesthetic — dark background, cyan/magenta glows, responsive vmin-based layout
- Works on desktop and mobile; can be added to the home screen (PWA-ready)

---

## Running with Docker

### Prerequisites

- [Docker](https://www.docker.com/) installed and running

### Steps

**1. Clone the repository:**

```bash
git clone https://github.com/LucaBarbaLata/type-draw-type-game.git
cd type-draw-type-game
```

**2. Build the app:**

```bash
./build.sh
```

Builds the React frontend and Spring Boot server inside Docker, then extracts the production JAR to `./build/server.jar`.

**3. Build the runtime image:**

```bash
docker build -f Dockerfile_prod -t tdt-game-prod .
```

**4. Run:**

```bash
docker run --rm -p 8080:8080 -v tdt-data:/tdt-data tdt-game-prod
```

The game is now at `http://<your-server-ip>:8080/`

`tdt-data` is a named Docker volume where game state is persisted across restarts.

---

## Development

### Backend

Spring Boot 3 / Java 21, built with Gradle.

```bash
cd tdt-server
./gradlew bootRun
```

For live reloads, run in a second terminal:

```bash
./gradlew build --continuous
```

### Frontend

React 18 / TypeScript / Vite, built with Yarn.

```bash
cd tdt-webapp
yarn
yarn dev
```

Dev server runs at `http://localhost:5173` and proxies `/api` requests to the backend on port 8080.

---

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 18, TypeScript 5, Vite, styled-components |
| Backend | Spring Boot 3.3, Java 21, Gradle |
| Real-time | WebSocket (Spring) |
| Audio | Web Audio API (fully synthesized) |
| Container | Docker multi-stage build, Eclipse Temurin JRE 21 |
| Storage | JSON state files in a Docker volume |

---

## Credits

Original game by **Hermann Czedik-Eysenberg** — [github.com/Bronkoknorb](https://github.com/Bronkoknorb)

Forked and rewritten by **[lucariki](https://github.com/LucaBarbaLata)** — cyberpunk UI, full drawing toolset (fill, shapes, undo/redo), drawing timelapse replay, synthesized audio engine, QR code lobby, round timer, spectator mode, story PNG export, interactive how-to guide, auto-reconnect, canvas progress caching, and nine game modes (One-Word, Shaky Hands, Blind Draw, Telephone Noir, Opposite, Fog of War, Hot Canvas, Team Mode).

License: [GNU Affero General Public License](LICENSE)
