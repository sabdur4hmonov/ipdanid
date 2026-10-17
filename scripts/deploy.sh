#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
command -v docker >/dev/null || { echo 'Docker Engine + Compose kerak. docs/DEPLOY_VPS_UZ.md'; exit 1; }
docker compose version >/dev/null
if [[ ! -f .env.production ]]; then
  docker run --rm -it --mount "type=bind,source=$PWD,target=/work" --workdir /work node:24-bookworm-slim node scripts/setup-production.mjs
fi
chmod 600 .env.production
docker compose --env-file .env.production config --quiet
docker compose --env-file .env.production up -d --build --wait
echo 'Ip Rasm xizmatlari ishga tushdi. Domen orqali /api/health va Admin kirishini tekshiring.'
