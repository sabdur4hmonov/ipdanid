FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV VITE_SERVER_GENERATION=1
RUN npx tsc -p tsconfig.production.json && npx vite build --outDir web-dist

FROM node:24-bookworm-slim AS api
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4311
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src
COPY --from=build /app/scripts/backup-sqlite.mjs ./scripts/backup-sqlite.mjs
RUN mkdir /data /backups /privacy && chown node:node /data /backups /privacy
USER node
EXPOSE 4311
CMD ["node","--import","tsx","server/index.ts"]

FROM caddy:2 AS web
COPY --from=build /app/web-dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
