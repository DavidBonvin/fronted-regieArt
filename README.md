# RegieArt — Frontend

Management platform for musicians and bands: events, transport convoy, daysheet, repertoire, finance and inventory. Monorepo with a web app (React + Vite) and a mobile app (React Native / Expo).

## Local Setup

### Prerequisites

Install before starting:

- Node.js >= 20
- pnpm 9
- Docker Desktop
- Expo Go or a mobile emulator, only if you run the mobile app

### 1. Start the Backend

Open a terminal:

```bash
git clone https://github.com/DavidBonvin/RegieArt-Backend.git
cd RegieArt-Backend
cp .env.example .env
```

Fill the backend `.env` storage variables before starting the API:

```text
STORAGE_ENDPOINT=...
STORAGE_ACCESS_KEY_ID=...
STORAGE_SECRET_ACCESS_KEY=...
STORAGE_BUCKET_NAME=...
```

Then run:

```bash
docker compose up -d
pnpm install
pnpm db:generate
pnpm --filter api prisma:migrate
pnpm db:seed
pnpm dev:api
```

Keep this terminal open. The API should be running at:

- `http://localhost:3000/api/v1`

### 2. Start the Frontend

Open a second terminal:

```bash
git clone https://github.com/DavidBonvin/fronted-regieArt.git
cd fronted-regieArt
cp .env.example .env
```

Check `.env` and keep these values for local development:

```text
VITE_API_BASE_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
VITE_KEYCLOAK_URL=http://localhost:8090
VITE_KEYCLOAK_REALM=regieart
VITE_KEYCLOAK_CLIENT_ID=regieart-web
EXPO_PUBLIC_KEYCLOAK_URL=http://localhost:8090
EXPO_PUBLIC_KEYCLOAK_REALM=regieart
EXPO_PUBLIC_KEYCLOAK_CLIENT_ID=regieart-mobile
HOST_IP=192.168.1.100
```

If you run the mobile app on a real phone, replace `HOST_IP` with your computer's LAN IP address. On Windows, get it with `ipconfig` and use the IPv4 address of your active Wi-Fi/Ethernet adapter.

Create the shared Docker network:

```bash
docker network create regiart
```

If Docker says the network already exists, continue.

Start desktop and mobile:

```bash
docker compose up
```

Or start only desktop:

```bash
docker compose up desktop
```

Or start only mobile:

```bash
docker compose up mobile
```

## Local URLs

- API: `http://localhost:3000/api/v1`
- Keycloak: `http://localhost:8090`
- Web Desktop: `http://localhost:5173`
- Mobile / Expo Metro: `http://localhost:8081`
- PostgreSQL: `localhost:5433`
- Redis: `localhost:6379`

## Required Backend Data

Always run this in the backend before testing the app:

```bash
pnpm db:seed
```

It creates the `skill-categories` used by the user skill modal.

Finance categories are created per organization from the app or API. They are not global seed data.

## Useful Commands

```bash
pnpm install
pnpm --filter @regieart/desktop typecheck
pnpm --filter @regieart/desktop build
pnpm --filter @regieart/mobile typecheck
```

## Environment Variables

Main variables:

- `VITE_API_BASE_URL`: backend API base URL used by the desktop Vite `/api-local` proxy in development.
- `EXPO_PUBLIC_API_BASE_URL`: backend API base URL for the mobile app. For a real phone on LAN, use a reachable host IP instead of `localhost`.
- `VITE_KEYCLOAK_URL` / `EXPO_PUBLIC_KEYCLOAK_URL`: Keycloak base URL.
- `VITE_KEYCLOAK_REALM` / `EXPO_PUBLIC_KEYCLOAK_REALM`: Keycloak realm.
- `VITE_KEYCLOAK_CLIENT_ID` / `EXPO_PUBLIC_KEYCLOAK_CLIENT_ID`: Keycloak client ID.
- `HOST_IP`: local network IP used by Expo LAN mode.

## Development Notes

Workspace packages use the `@regieart/` prefix. If a command uses `@regiart/`, update it to `@regieart/`.

Do not use port `3005` unless you intentionally run the backend API with the backend `docker-api` profile.
