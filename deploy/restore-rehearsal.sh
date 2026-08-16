#!/bin/sh
set -eu
: "${POSTGRES_USER:?required}" "${1:?usage: restore-rehearsal.sh backup.dump}"
backup=$1
test -s "$backup"
rehearsal="erp_restore_$(date -u +%Y%m%d%H%M%S)"
cleanup() { docker compose -f compose.production.yml exec -T postgres dropdb -U "$POSTGRES_USER" --if-exists "$rehearsal"; }
trap cleanup EXIT INT TERM
docker compose -f compose.production.yml exec -T postgres createdb -U "$POSTGRES_USER" "$rehearsal"
docker compose -f compose.production.yml exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$rehearsal" --no-owner < "$backup"
docker compose -f compose.production.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$rehearsal" -v ON_ERROR_STOP=1 -Atc \
  "select count(*) from erp.schema_migrations; select count(*) from information_schema.tables where table_schema='erp';"
