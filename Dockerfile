FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY turbo.json ./
COPY .npmrc ./
COPY apps/mobile/package.json ./apps/mobile/
COPY apps/desktop/package.json ./apps/desktop/
COPY packages/ui/package.json ./packages/ui/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --no-frozen-lockfile

FROM deps AS dev
WORKDIR /app
COPY . .
EXPOSE 5173 8081
CMD ["pnpm", "dev"]

FROM deps AS builder
WORKDIR /app
COPY . .
RUN pnpm build:packages
RUN pnpm build:desktop

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/apps/desktop/dist ./dist
EXPOSE 4173
CMD ["serve", "-s", "dist", "-p", "4173", "-n"]
