#!/bin/sh
set -eu
npm ci
npm audit --omit=dev
npx nx run-many -t lint --projects=erp_api,erp_interface,worker,jobs-core,jobs-producers,jobs-processors,commerce-catalog-contracts,commerce-catalog-application
npx nx run-many -t typecheck --all
npx nx run-many -t build --projects=erp_api,erp_interface,worker
docker compose --env-file .env.production -f compose.production.yml config --quiet
docker compose --env-file .env.production -f compose.production.yml --profile test up --build --abort-on-container-exit --exit-code-from test test
