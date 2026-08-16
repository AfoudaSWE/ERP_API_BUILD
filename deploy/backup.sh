#!/bin/sh
set -eu
: "${POSTGRES_DB:?required}" "${POSTGRES_USER:?required}" "${BACKUP_DIR:?required}"
mkdir -p "$BACKUP_DIR"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$BACKUP_DIR/${POSTGRES_DB}_${stamp}.dump"
umask 077
docker compose -f compose.production.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner > "$target"
test -s "$target"
sha256sum "$target" > "$target.sha256"
printf '%s\n' "$target"
