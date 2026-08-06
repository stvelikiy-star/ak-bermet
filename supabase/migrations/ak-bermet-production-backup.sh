#!/usr/bin/env bash

# Operator-run, read-only logical backup for the AK BERMET Supabase database.
#
# Required environment (values must be supplied by the approved operator):
#   AK_BERMET_BACKUP_APPROVED=YES
#   AK_BERMET_DATABASE_URL=postgresql://...
#
# Optional, non-secret environment:
#   AK_BERMET_POSTGRES_IMAGE=postgres:17-alpine
#
# The PostgreSQL image must already exist locally. This script never pulls an
# image, applies migrations, restores a dump, or contacts Supabase tooling.

set -Eeuo pipefail

# Bash xtrace would expose the database URL when it is read or piped. Refuse it
# before the secret is copied into a local variable.
if [[ $- == *x* ]]; then
  set +x
  printf '%s\n' '[ak-bermet-backup] Refusing to run with shell tracing enabled.' >&2
  exit 64
fi

readonly BACKUP_ROOT='/home/agent/ai-prof-backups/ak-bermet'
readonly DEFAULT_POSTGRES_IMAGE='postgres:17-alpine'
readonly LOCK_DIR="${BACKUP_ROOT}/.backup.lock"

log() {
  printf '[ak-bermet-backup] %s\n' "$1" >&2
}

fail() {
  log "$1"
  exit "${2:-1}"
}

[[ ${AK_BERMET_BACKUP_APPROVED:-} == 'YES' ]] ||
  fail 'Owner approval is required (AK_BERMET_BACKUP_APPROVED=YES).' 64
[[ -n ${AK_BERMET_DATABASE_URL:-} ]] ||
  fail 'AK_BERMET_DATABASE_URL is required.' 64

database_url=${AK_BERMET_DATABASE_URL}
unset AK_BERMET_DATABASE_URL

[[ $database_url != *$'\n'* && $database_url != *$'\r'* ]] ||
  fail 'The database URL contains an invalid line break.' 64
case "$database_url" in
  postgresql://* | postgres://*) ;;
  *) fail 'AK_BERMET_DATABASE_URL must be a PostgreSQL URI.' 64 ;;
esac

# URI query parameters take precedence over libpq environment values. Reject
# all of them so neither the enforced read-only setting nor TLS can be weakened.
[[ $database_url != *\?* ]] ||
  fail 'The database URL must not contain query parameters.' 64

postgres_image=${AK_BERMET_POSTGRES_IMAGE:-$DEFAULT_POSTGRES_IMAGE}
case "$postgres_image" in
  '' | -* | *[!a-zA-Z0-9_./:@-]*)
    fail 'AK_BERMET_POSTGRES_IMAGE has an invalid image reference.' 64
    ;;
esac

command -v docker >/dev/null 2>&1 || fail 'Docker is not available.' 69
docker image inspect "$postgres_image" >/dev/null 2>&1 ||
  fail 'The configured PostgreSQL image is not available locally.' 69

[[ ! -L $BACKUP_ROOT ]] || fail 'The backup root must not be a symbolic link.' 73
mkdir -p -- "$BACKUP_ROOT" || fail 'Cannot create the backup root.' 73
chmod 0700 -- "$BACKUP_ROOT" || fail 'Cannot secure the backup root.' 73

if ! mkdir -- "$LOCK_DIR" 2>/dev/null; then
  fail 'Another AK BERMET backup is already running.' 75
fi

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_name="ak-bermet-production-${timestamp}"
dump_name="${backup_name}.dump"
staging_dir="${BACKUP_ROOT}/.${backup_name}.partial"
final_dir="${BACKUP_ROOT}/${backup_name}"

cleanup() {
  local status=$?
  database_url=''

  if (( status != 0 )) && [[ -n ${staging_dir:-} && -d $staging_dir ]]; then
    case "$staging_dir" in
      "${BACKUP_ROOT}"/.*.partial) rm -rf -- "$staging_dir" ;;
    esac
  fi

  rmdir -- "$LOCK_DIR" 2>/dev/null || true
  return "$status"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

[[ ! -e $staging_dir && ! -e $final_dir ]] ||
  fail 'A backup with this timestamp already exists.' 73
mkdir -m 0700 -- "$staging_dir" || fail 'Cannot create the staging directory.' 73

log 'Starting approved read-only production backup.'

# The secret is delivered over stdin, not in Docker argv or container metadata.
# The database URI is used only inside the short-lived container. PGOPTIONS makes
# every server transaction read-only before pg_dump starts its own transaction.
if ! printf '%s\n' "$database_url" | docker run \
  --rm \
  --interactive \
  --read-only \
  --cap-drop=ALL \
  --security-opt=no-new-privileges \
  --user "$(id -u):$(id -g)" \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m,mode=1777 \
  --mount "type=bind,src=${staging_dir},dst=/backup" \
  --env 'PGOPTIONS=-c default_transaction_read_only=on' \
  --env 'PGSSLMODE=require' \
  --env 'PGCONNECT_TIMEOUT=20' \
  --env 'PGAPPNAME=ak-bermet-production-backup' \
  "$postgres_image" \
  sh -ceu '
    IFS= read -r database_url
    [ -n "$database_url" ] || exit 64

    dump_file="/backup/$1"
    error_file=/tmp/pg_dump.stderr

    if ! pg_dump \
      --format=custom \
      --compress=9 \
      --no-owner \
      --no-privileges \
      --file="$dump_file" \
      "$database_url" \
      2>"$error_file"; then
      rm -f -- "$error_file"
      exit 70
    fi
    rm -f -- "$error_file"

    pg_restore --list "$dump_file" >/dev/null 2>&1
    cd /backup
    sha256sum "$1" > SHA256SUMS
    sha256sum -c SHA256SUMS >/dev/null
    chmod 0600 -- "$1" SHA256SUMS
  ' sh "$dump_name"; then
  fail 'Backup or archive validation failed; no backup was published.' 70
fi

database_url=''
mv --no-target-directory -- "$staging_dir" "$final_dir" ||
  fail 'Cannot publish the validated backup.' 73
log "Backup validated and published at ${final_dir}."
