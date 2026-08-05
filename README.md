# RegieArt — Frontend

Management platform for musicians and bands: events, transport convoy, daysheet, repertoire, finance and inventory. Monorepo with a web app (React + Vite) and a mobile app (React Native / Expo).

## Installation

```bash
git clone git@github.com:DavidBonvin/fronted-regieArt.git
cd fronted-regieArt
cp .env.example .env
# Edit .env with your values


```

## Environment variables


Copy `.env.example` to `.env` and adjust the values for your environment.

## Run with Docker

```bash
# Create the network if it doesn't exist
docker network create regiart

# Start desktop (port 5173) + mobile (port 8081)
docker compose up
```

Desktop only:

```bash
docker compose up desktop
```
