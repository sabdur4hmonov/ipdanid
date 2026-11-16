#!/usr/bin/env bash
# Run only inside a disposable container with /work tmpfs and /source read-only.
set -euo pipefail
[[ -d /source && -d /work ]] || exit 90
mkdir -p /work/scripts /work/bin
cp /source/deploy.sh /work/scripts/deploy.sh
printf 'APP_DOMAIN=synthetic.invalid\n' > /work/.env
docker() {
case "$*" in
  'compose version') ;;
  'compose --env-file .env config --quiet') echo config >> /work/events ;;
  'compose --env-file .env build') echo build >> /work/events ;;
  'volume inspect iprasm_sqlite') ;;
  'compose --env-file .env ps -aq api') [[ "${P1_API_EXISTS:-1}" == 0 ]] || echo existing-test-api ;;
  'compose --env-file .env run --rm --no-deps backup node scripts/production-backup.mjs --predeploy')
    echo backup >> /work/events
    [[ "${P1_FAIL_BACKUP:-0}" == 0 ]] ;;
  'compose --env-file .env up -d --wait') echo up >> /work/events ;;
  *) echo 'Unexpected mock invocation' >&2; return 91 ;;
esac
}
export -f docker
bash /work/scripts/deploy.sh > /work/stdout
[[ "$(cat /work/events)" == $'config\nbuild\nbackup\nup' ]]
: > /work/events
if P1_FAIL_BACKUP=1 bash /work/scripts/deploy.sh > /work/stdout 2>&1; then exit 92; fi
[[ "$(cat /work/events)" == $'config\nbuild\nbackup' ]]
: > /work/events
IP_RASM_FIRST_DEPLOY=1 bash /work/scripts/deploy.sh > /work/stdout
[[ "$(cat /work/events)" == $'config\nbuild\nbackup\nup' ]]
: > /work/events
P1_API_EXISTS=0 IP_RASM_FIRST_DEPLOY=1 bash /work/scripts/deploy.sh > /work/stdout
[[ "$(cat /work/events)" == $'config\nbuild\nup' ]]
printf '{"mockDocker":true,"backupBeforeDeploy":true,"failureStopsDeploy":true,"existingApiCannotUseFirstDeployException":true,"explicitFirstCleanImport":true}\n'
