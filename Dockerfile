FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV VITE_SERVER_GENERATION=1
RUN npx tsc -p tsconfig.production.json && npx vite build --outDir web-dist

# Compile portable TS/web on the builder CPU; install runtime dependencies for
# the TARGET architecture so tsx/esbuild binaries match ARM64 at execution.
FROM node:24-bookworm-slim AS runtime-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS api
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4311
WORKDIR /app
COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src
COPY --from=build /app/scripts/backup-sqlite.mjs ./scripts/backup-sqlite.mjs
COPY --from=build /app/scripts/production-backup.mjs /app/scripts/restore-production-backup.mjs /app/scripts/s3-backup.mjs ./scripts/
RUN mkdir /data /backups /privacy && chown node:node /data /backups /privacy
USER node
EXPOSE 4311
CMD ["node","--import","tsx","server/index.ts"]

FROM caddy:2 AS web
COPY --from=build /app/web-dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
