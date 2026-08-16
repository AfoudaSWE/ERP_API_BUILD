#!/bin/sh
set -eu
: "${BASE_URL:?set BASE_URL, for example https://erp.example.com}"
curl --fail --silent --show-error "$BASE_URL/api/health" >/dev/null
curl --fail --silent --show-error "$BASE_URL/api/ready" >/dev/null
status=$(curl --silent --output /dev/null --write-out '%{http_code}' "$BASE_URL/api/products")
test "$status" = 401
printf 'Smoke checks passed for %s\n' "$BASE_URL"
