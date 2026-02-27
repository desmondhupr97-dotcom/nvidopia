#!/bin/sh
set -e

PORT="${PORT:-8080}"
export PORT

MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/nvidopia}"
export MONGO_URI

export GATEWAY_PORT=3000
export RELEASE_MANAGER_PORT=3001
export FLEET_MANAGER_PORT=3002
export ISSUE_WORKFLOW_PORT=3003
export TRACEABILITY_PORT=3004
export KPI_ENGINE_PORT=3005
export FLEET_SIMULATOR_PORT=3006
export PTC_SERVICE_PORT=3007

export RELEASE_MANAGER_URL="http://localhost:${RELEASE_MANAGER_PORT}"
export FLEET_MANAGER_URL="http://localhost:${FLEET_MANAGER_PORT}"
export ISSUE_WORKFLOW_URL="http://localhost:${ISSUE_WORKFLOW_PORT}"
export TRACEABILITY_URL="http://localhost:${TRACEABILITY_PORT}"
export KPI_ENGINE_URL="http://localhost:${KPI_ENGINE_PORT}"
export FLEET_SIMULATOR_URL="http://localhost:${FLEET_SIMULATOR_PORT}"
export PTC_SERVICE_URL="http://localhost:${PTC_SERVICE_PORT}"
export BFF_URL="http://localhost:${GATEWAY_PORT}"

TSX="/app/node_modules/.bin/tsx"

mkdir -p /run/nginx
envsubst '$PORT' < /etc/nginx/http.d/default.conf.template > /etc/nginx/http.d/default.conf

echo "[start-all] Starting microservices..."

cd /app

$TSX services/release-manager/src/index.ts 2>&1 &
$TSX services/fleet-manager/src/index.ts 2>&1 &
$TSX services/issue-workflow/src/index.ts 2>&1 &
$TSX services/traceability/src/index.ts 2>&1 &
$TSX services/kpi-engine/src/index.ts 2>&1 &
$TSX services/fleet-simulator/src/index.ts 2>&1 &
$TSX services/ptc-service/src/index.ts 2>&1 &
$TSX apps/bff-gateway/src/index.ts 2>&1 &

echo "[start-all] Waiting for services to connect to MongoDB..."

TRIES=0
MAX_TRIES=30
while [ $TRIES -lt $MAX_TRIES ]; do
  if wget -q -O /dev/null http://localhost:3000/health 2>/dev/null; then
    echo "[start-all] BFF gateway is ready on port 3000"
    break
  fi
  TRIES=$((TRIES + 1))
  sleep 2
done

if [ $TRIES -ge $MAX_TRIES ]; then
  echo "[start-all] WARNING: BFF gateway not ready after ${MAX_TRIES} attempts, starting Nginx anyway"
fi

if [ "${SEED_ON_STARTUP}" = "true" ]; then
  echo "[start-all] SEED_ON_STARTUP=true — running seed script..."
  $TSX platform/data-models/src/seed.ts 2>&1 || echo "[start-all] Seed script failed (non-fatal)"
  echo "[start-all] Seed complete"
fi

echo "[start-all] Launching Nginx on port ${PORT}"
exec nginx -g "daemon off;"
