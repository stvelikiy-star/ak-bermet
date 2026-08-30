#!/usr/bin/env bash

# Operator-run, read-only logical backup for the AK BERMET Supabase database.
#
# Required environment (values must be supplied by the approved operator):
#   AK_BERMET_BACKUP_APPROVED=YES
#   AK_BERMET_DATABASE_URL=postgresql://...
#   SUPABASE_DB_PASSWORD=...
#
# Optional, non-secret environment:
#   AK_BERMET_POSTGRES_IMAGE=postgres:17-alpine
#   AK_BERMET_BACKUP_ROOT=/absolute/private/backup/path
#
# The PostgreSQL image must already exist locally. This script never pulls an
# image, applies migrations, restores a dump, or contacts Supabase tooling.

set -Eeuo pipefail

# Bash xtrace would expose secrets when they are read or piped. Refuse it
# before either credential value is copied into a local variable.
if [[ $- == *x* ]]; then
  set +x
  printf '%s\n' '[ak-bermet-backup] Refusing to run with shell tracing enabled.' >&2
  exit 64
fi

readonly DEFAULT_BACKUP_ROOT='/home/agent/ai-prof-backups/ak-bermet'
readonly DEFAULT_POSTGRES_IMAGE='postgres:17-alpine'

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

[[ -n ${SUPABASE_DB_PASSWORD:-} ]] ||
  fail 'SUPABASE_DB_PASSWORD is required.' 64
database_password=${SUPABASE_DB_PASSWORD}
unset SUPABASE_DB_PASSWORD
[[ $database_password != *$'\n'* && $database_password != *$'\r'* ]] ||
  fail 'The database password contains an invalid line break.' 64

backup_root=${AK_BERMET_BACKUP_ROOT:-$DEFAULT_BACKUP_ROOT}
unset AK_BERMET_BACKUP_ROOT
[[ -n $backup_root ]] || fail 'AK_BERMET_BACKUP_ROOT must not be empty.' 64
[[ $backup_root != *$'\n'* && $backup_root != *$'\r'* ]] ||
  fail 'AK_BERMET_BACKUP_ROOT contains an invalid line break.' 64
case "$backup_root" in
  /*) ;;
  *) fail 'AK_BERMET_BACKUP_ROOT must be an absolute path.' 64 ;;
esac
[[ $backup_root != '/' ]] || fail 'AK_BERMET_BACKUP_ROOT must not be filesystem root.' 64
command -v realpath >/dev/null 2>&1 || fail 'realpath is not available.' 69
canonical_backup_root=$(realpath -m -- "$backup_root") ||
  fail 'AK_BERMET_BACKUP_ROOT cannot be canonicalized.' 64
[[ $canonical_backup_root == "$backup_root" ]] ||
  fail 'AK_BERMET_BACKUP_ROOT must be canonical and must not traverse symlink components.' 64
readonly BACKUP_ROOT=$canonical_backup_root
readonly LOCK_DIR="${BACKUP_ROOT}/.backup.lock"
backup_root=''
canonical_backup_root=''

# Parse only the non-secret connection identity from the URI. The password in
# the URI is intentionally ignored: the raw password is delivered separately
# over stdin and written only to an ephemeral 0600 pgpass file inside /tmp.
uri_rest=${database_url#*://}
[[ $uri_rest == *@*/* ]] || fail 'The database URL is missing user, host, or database components.' 64
userinfo=${uri_rest%%@*}
host_and_path=${uri_rest#*@}
hostport=${host_and_path%%/*}
database_name=${host_and_path#*/}
[[ $userinfo == *:* ]] || fail 'The database URL must contain a user and password placeholder.' 64
database_user=${userinfo%%:*}
[[ -n $database_user && -n $hostport && -n $database_name && $database_name != "$host_and_path" ]] ||
  fail 'The database URL is missing user, host, or database components.' 64

case "$hostport" in
  \[*\]:*)
    database_host=${hostport%:*}
    database_host=${database_host#[}
    database_host=${database_host%]}
    database_port=${hostport##*:}
    ;;
  *:*)
    database_host=${hostport%:*}
    database_port=${hostport##*:}
    ;;
  *)
    fail 'The database URL must include an explicit TCP port.' 64
    ;;
esac
[[ -n $database_host && $database_port =~ ^[0-9]+$ ]] ||
  fail 'The database URL host or port is invalid.' 64
[[ $database_name != */* ]] || fail 'The database URL database name is invalid.' 64

database_url=''

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
[[ $(realpath -e -- "$BACKUP_ROOT") == "$BACKUP_ROOT" ]] ||
  fail 'The backup root resolved through a symbolic link.' 73
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
  database_password=''

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

# The secret is delivered over stdin, never in Docker argv/container metadata
# or the pg_dump command line. Inside the read-only container it is written to
# an ephemeral 0600 pgpass file on tmpfs. Non-secret connection identity is
# passed separately so Session Pooler URIs work without relying on PGDATABASE
# URI expansion. PGOPTIONS makes every server transaction read-only before
# pg_dump starts its own transaction.
if ! printf '%s\n' "$database_password" | docker run \
  --rm \
  --interactive \
  --read-only \
  --cap-drop=ALL \
  --security-opt=no-new-privileges \
  --user "$(id -u):$(id -g)" \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m,mode=1777 \
  --mount "type=bind,src=${staging_dir},dst=/backup" \
  --env "PGHOST=${database_host}" \
  --env "PGPORT=${database_port}" \
  --env "PGUSER=${database_user}" \
  --env "PGDATABASE=${database_name}" \
  --env 'PGOPTIONS=-c default_transaction_read_only=on' \
  --env 'PGSSLMODE=require' \
  --env 'PGCONNECT_TIMEOUT=20' \
  --env 'PGAPPNAME=ak-bermet-production-backup' \
  "$postgres_image" \
  sh -ceu '
    IFS= read -r database_password
    [ -n "$database_password" ] || exit 64

    passfile=/tmp/ak-bermet.pgpass
    escaped_password=$(printf "%s" "$database_password" | sed "s/\\\\/\\\\\\\\/g; s/:/\\\\:/g")
    database_password=
    umask 077
    printf "%s:%s:%s:%s:%s\n" "$PGHOST" "$PGPORT" "$PGDATABASE" "$PGUSER" "$escaped_password" > "$passfile"
    escaped_password=
    chmod 0600 "$passfile"
    export PGPASSFILE="$passfile"

    dump_file="/backup/$1"
    error_file=/tmp/pg_dump.stderr

    if ! pg_dump \
      --format=custom \
      --compress=9 \
      --no-owner \
      --no-privileges \
      --file="$dump_file" \
      2>"$error_file"; then
      rm -f -- "$error_file" "$passfile"
      exit 70
    fi
    rm -f -- "$error_file" "$passfile"

    pg_restore --list "$dump_file" >/dev/null 2>&1
    cd /backup
    sha256sum "$1" > SHA256SUMS
    sha256sum -c SHA256SUMS >/dev/null
    chmod 0600 -- "$1" SHA256SUMS
  ' sh "$dump_name"; then
  fail 'Backup or archive validation failed; no backup was published.' 70
fi

database_password=''
mv --no-target-directory -- "$staging_dir" "$final_dir" ||
  fail 'Cannot publish the validated backup.' 73
log "Backup validated and published at ${final_dir}."
