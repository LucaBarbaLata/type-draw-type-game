# Type Draw Type Game

![Type Draw Type Logo](/tdt-webapp/src/img/logo.svg?raw=true&sanitize=true)

_Type Draw Type_ is a simple and fun game for you and your friends.
It is like the telephone game (Chinese whispers), only with pictures.
Every player starts by typing a sentence.
Then the texts are passed on and you have to draw the sentence you received.
In the next round you get one of the drawings and have to describe it with another sentence (without knowing the initial sentence!).
This goes on, by alternately typing and drawing, until all players have participated in every chain (story).
In the end everybody sees all the stories and can wonder about how the initial sentences have transformed in unexpected ways!

This is an open-source Web/mobile version of the pen-and-paper game Telephone Pictionary (also known as Paper Telephone and "Eat Poop You Cat"). It can be installed on mobile phones (Android and iPhone) by using the "Add to Home Screen" functionality.

Alternative versions of the game are: [Drawception](https://drawception.com/), [Interference](https://www.playinterference.com/), [Doodle Or Die](http://doodleordie.com/), [Broken Picturephone](https://www.brokenpicturephone.com/), [Drawphone](https://github.com/tannerkrewson/drawphone), [Gartic Phone](https://garticphone.com/), Telestrations, Cranium Scribblish, Stille Post extrem, Scrawl (offline Board games).

## Installation on your own server

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

This builds the webapp and server inside Docker and extracts the JAR to `./build/server.jar`.

**3. Build the runtime image:**

```bash
docker build -f Dockerfile_prod -t tdt-game-prod .
```

**4. Run:**

```bash
docker run -d --restart always --name tdt -p 8080:8080 -v tdt-data:/tdt-data tdt-game-prod
```

The game is now available at `http://<your-server-ip>:8080/`

> `tdt-data` is a named Docker volume where game data is persisted.

**To check logs:**

```bash
docker logs tdt
```

**To stop/update:**

```bash
docker stop tdt && docker rm tdt
# pull latest changes, rebuild, then run again
```

## Development

### Backend Server

The backend is built with Spring Boot (Java) and Gradle.

Prerequisites: Java 21+

```bash
cd tdt-server
./gradlew bootRun
```

For live-reloads, run in a second terminal:

```bash
./gradlew build --continuous
```

See also [tdt-server/HELP.md](tdt-server/HELP.md).

### Frontend Web App

The frontend is a React + TypeScript app built with Vite and yarn.

Prerequisites: Node.js 20+, yarn (via `corepack enable`)

```bash
cd tdt-webapp
yarn
yarn run dev
```

This starts a dev server with hot reload and proxies API requests to the backend on port 8080.

See also [tdt-webapp/README-webapp.md](tdt-webapp/README-webapp.md).

## Build

To build everything (webapp + server) inside Docker:

```bash
./build.sh
```

Then build the production runtime image:

```bash
docker build -f Dockerfile_prod -t tdt-game-prod .
```

## Credits

Original game by **Hermann Czedik-Eysenberg** — git-dev@hermann.czedik.net

Forked and improved by **[lucariki](https://github.com/LucaBarbaLata)** — cyberpunk UI overhaul, new drawing tools (flood fill, shapes, redo), animated waiting messages, QR code lobby, auto-reconnect, and story image export.

License: [GNU AFFERO GENERAL PUBLIC LICENSE](LICENSE)
