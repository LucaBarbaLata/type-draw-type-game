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
| **Fog of War** | Only a small circle around your cursor is visible while drawing. Explore the canvas to see what you've done. |
| **Hot Canvas** | All players draw simultaneously. Every 15 / 30 / 60 seconds (host's choice) the server rotates everyone to a different canvas for a total of 3, 5 or 10 minutes — nobody finishes their own drawing. |
| **Team Mode** | Two players share one canvas and draw on it simultaneously in real time via WebSocket stroke relay. Needs at least 4 players. |
| **Picture Perfect** | Everyone uploads a photo from their device, then redraws a random other player's photo by hand with the original in view. The reveal shows photo and drawing side by side. Two rounds only. |

---

## Features

### Gameplay
- **Round timer** — optional per-round time limit (30 / 60 / 90 / 120 / 180 seconds), with audio warnings and auto-submit on expiry
- **Max players** — creator can cap the lobby at 2–12 players; instance hosts can enforce a server-wide cap on top (see [Configuration](#configuration))
- **Spectator mode** — late joiners watch the game without disrupting ongoing rounds
- **Rematch** — a "Play Again" vote at the end restarts a new game with the same group
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
- **Public lobbies** — flag a lobby as public and it shows up in the Server Browser on the home screen for anyone to join (instance hosts can turn this off)
- **Chat** — lobby chat, plus a per-round chat for players who have already submitted; the host can disable it
- **Host moderation** — the host can kick or ban players from the lobby

### Results
- Progressive story reveal — uncover one element at a time with animations
- **Emoji reactions** — react to any drawing during the reveal (👍 ❤️ 😂 🔥 😮 🤯 💕); reactions cascade live on everyone's screen
- Download any story as a formatted PNG image

### How to Play guide
- Interactive 5-step tutorial built into the home screen, with mockup examples for each phase

### Audio
- Fully synthesized sounds via Web Audio API (no samples) — round start, urgent countdown ticks, timer expire, submit, reveal, fanfare, and more
- Global mute toggle

### UI
- Cyberpunk aesthetic by default — dark background, cyan/magenta glows, responsive vmin-based layout
- **Themes** — switch the whole look from the palette button in the corner (saved per browser): Cyberpunk, Blue Eclipse, Blooming Romance and Cobalt Sky (dark), Stormy Morning, Country Garden and Cappuccino (light)
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

`tdt-data` is a named Docker volume that holds everything the instance owns: persisted games (state, drawings,
uploaded photos, replays) **and** the optional `config.yml` the server reads at startup.

**5. Configure (optional):**

Out of the box the server only accepts WebSocket connections from `http://localhost:8080`, so as soon as players
reach the game through a different hostname or a reverse proxy you need a `config.yml` — see
[Configuration](#configuration). Put it into the data volume with either of these:

```bash
# a) copy it into the named volume
docker run --rm -v tdt-data:/tdt-data -v "$PWD":/src alpine cp /src/config.yml /tdt-data/config.yml

# b) or mount a host directory instead of a named volume and keep config.yml in it
mkdir -p ./tdt-data && cp config.example.yml ./tdt-data/config.yml   # then edit it
docker run --rm -p 8080:8080 -v "$PWD/tdt-data":/tdt-data tdt-game-prod
```

Restart the container after changing the file.

---

## Configuration

Everything an instance host can tune lives in **one file: `config.yml`**. Start from the fully commented
[`config.example.yml`](config.example.yml) — copy it, keep only the keys you want to change, and restart the server.
The built-in defaults live in `tdt-server/src/main/resources/application.yml`; don't edit that file to configure an
instance. `config.yml` (in the repo root and in `tdt-server/`) is git-ignored, so your real values never end up in a commit.

Where the server looks for it:

| How you run it | Location |
|---|---|
| Docker (`Dockerfile_prod`) | `/tdt-data/config.yml` — inside the data volume (the image sets `TDT_CONFIG_FILE` to this path). Override with `-e TDT_CONFIG_FILE=/path/to/file.yml` |
| `java -jar server.jar` | `./config.yml` in the working directory (or set `TDT_CONFIG_FILE`) |
| `./gradlew bootRun` | `tdt-server/config.yml` |

The file is optional; anything you leave out keeps its default. On startup the server logs which file it used —
look for `Instance config: loaded /tdt-data/config.yml` (or `Instance config: no file at … - using built-in defaults`)
near the top of the log if a setting seems to be ignored; it's the first thing to check after the file's location.

A typical public deployment behind a reverse proxy only needs:

```yaml
tdt:
  websocket:
    allowed-origins:
      - https://tdt.example.com   # the exact origin players see in their address bar
```

What you can configure:

| Key | Default | What it does |
|---|---|---|
| `server.port` | `8080` | HTTP port |
| `server.compression.enabled` | `true` | Gzip HTTP responses (static frontend assets and JSON API) |
| `tdt.storage-dir` | `.` | Where games are persisted — a `games/` folder is created inside (fixed to `/tdt-data` in Docker) |
| `tdt.websocket.allowed-origins` | `[http://localhost:8080]` | Origins allowed to open the game WebSocket — the exact scheme + host (+ port) players see in the address bar. `"*"` allows any |
| `tdt.websocket.max-text-message-bytes` | 3 MiB | Largest text frame (JSON actions, Team-mode canvas syncs, replays). Raise it if large Team-mode canvases get disconnected |
| `tdt.websocket.max-binary-message-bytes` | 5 MiB | Largest binary frame (drawings, uploaded photos). Must be larger than `max-upload-bytes` |
| `tdt.websocket.keep-alive-interval-seconds` | `15` | Ping interval that keeps idle connections open through proxies — keep it well under your proxy's read timeout |
| `tdt.limits.max-players` | `0` (none) | Server-wide cap on players per game; a lobby setting above it is clamped down |
| `tdt.limits.max-chat-messages` | `50` | Chat history kept (and replayed to reconnecting players) per chat |
| `tdt.limits.max-chat-text-length` | `200` | Longest accepted chat message, in characters; longer ones are dropped |
| `tdt.limits.max-upload-bytes` | 2 MiB | Largest photo accepted in Picture Perfect mode (the browser already downscales before uploading) |
| `tdt.public-games.enabled` | `true` | Whether lobbies can be listed in the public server browser. `false` ignores the "Public Lobby" toggle and `/api/games` always returns an empty list |

Any other standard Spring Boot property (e.g. `logging.level.*`) works in the same file.

Invalid values (e.g. a negative limit or an empty origins list) stop the server at startup with a message naming the
key and the line in `config.yml`.

Every key can also be passed as an environment variable or command-line flag, which take precedence over the file —
for example `-e TDT_WEBSOCKET_ALLOWEDORIGINS=https://tdt.example.com` or `--tdt.limits.max-players=8`. The
pre-config-file flags `--storage.dir=…` and `--websocket.allowed-origins=…` still work as aliases for
`tdt.storage-dir` and `tdt.websocket.allowed-origins`.

---

## Development

### Backend

Spring Boot 3 / Java 21, built with Gradle.

```bash
cd tdt-server
./gradlew bootRun      # server at http://localhost:8080
./gradlew test         # JUnit 5 test suite
```

For live reloads, run in a second terminal:

```bash
./gradlew build --continuous
```

To try instance settings locally, drop a `config.yml` into `tdt-server/` (it's git-ignored) — `bootRun` picks it up
the same way the production jar does.

### Frontend

React 18 / TypeScript / Vite, built with Yarn.

```bash
cd tdt-webapp
yarn
yarn dev               # dev server at http://localhost:5173
yarn lint              # ESLint
yarn build             # production build into dist/ (build.sh copies it into the server jar)
```

Dev server runs at `http://localhost:5173` and proxies `/api` requests to the backend on port 8080. There is no
frontend test suite.

---

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 18, TypeScript 5, Vite 5, styled-components 6 |
| Backend | Spring Boot 3.3, Java 21, Gradle |
| Real-time | WebSocket (Spring) |
| Audio | Web Audio API (fully synthesized) |
| Container | Docker multi-stage build, Eclipse Temurin JRE 21 |
| Storage | Flat files per game (JSON state, PNG drawings, uploaded photos, `.replay.json` timelapses) under `tdt.storage-dir`, plus `config.yml` — all in one Docker volume |
| Configuration | Spring `@ConfigurationProperties` (`tdt.*`), validated at startup; external `config.yml` via `TDT_CONFIG_FILE` |

---

## Credits

Original game by **Hermann Czedik-Eysenberg** — [github.com/Bronkoknorb](https://github.com/Bronkoknorb)

Forked and rewritten by **[lucariki](https://github.com/LucaBarbaLata)**

License: [GNU Affero General Public License](LICENSE)
