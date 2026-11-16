#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
command -v docker >/dev/null || { echo 'Docker Engine + Compose kerak. docs/DEPLOY_ORACLE_UZ.md'; exit 1; }
docker compose version >/dev/null
if [[ -f .env ]]; then private_env=.env
elif [[ -f .env.production ]]; then private_env=.env.production
else bash scripts/setup-production-env; private_env=.env
fi
chmod 600 "$private_env"
compose=(docker compose --env-file "$private_env")
"${compose[@]}" config --quiet
# Build first; a failed image build never modifies the existing application DB.
"${compose[@]}" build
# Fixed Compose project name makes orphaned existing volumes detectable too.
# Refuse a deploy if its consistent encrypted backup/upload fails.
if docker volume inspect iprasm_sqlite >/dev/null 2>&1; then
  if [[ -z "$("${compose[@]}" ps -aq api)" && "${IP_RASM_FIRST_DEPLOY:-0}" == 1 ]]; then
    echo 'First clean import acknowledged; preserve its off-server original. Startup will create the first encrypted archive.'
  else
    "${compose[@]}" run --rm --no-deps backup node scripts/production-backup.mjs --predeploy
  fi
fi
"${compose[@]}" up -d --wait
echo 'Ip Rasm xizmatlari ishga tushdi. Domen orqali /api/health va Admin kirishini tekshiring.'
