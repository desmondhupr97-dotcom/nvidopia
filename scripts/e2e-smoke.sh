#!/usr/bin/env bash
#
# E2E Smoke Test — exercises the full nvidopia platform via HTTP.
#
# Prerequisites: all services running (docker-compose or local dev).
# Usage:         bash scripts/e2e-smoke.sh [BASE_URL]
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_URL="${1:-http://localhost:3000}"

# Direct service URLs (used when BFF proxy routing differs from service mount)
RELEASE_MANAGER_URL="${RELEASE_MANAGER_URL:-http://localhost:3001}"
FLEET_MANAGER_URL="${FLEET_MANAGER_URL:-http://localhost:3002}"
ISSUE_WORKFLOW_URL="${ISSUE_WORKFLOW_URL:-http://localhost:3003}"
TRACEABILITY_URL="${TRACEABILITY_URL:-http://localhost:3004}"
KPI_ENGINE_URL="${KPI_ENGINE_URL:-http://localhost:3005}"

PASS=0
FAIL=0
STEPS=()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
step_pass() {
  local name="$1"
  STEPS+=("PASS  $name")
  PASS=$((PASS + 1))
  echo "  ✓ PASS: $name"
}

step_fail() {
  local name="$1"
  local detail="${2:-}"
  STEPS+=("FAIL  $name${detail:+ — $detail}")
  FAIL=$((FAIL + 1))
  echo "  ✗ FAIL: $name${detail:+ — $detail}"
}

check_status() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" -eq "$expected" ] 2>/dev/null; then
    step_pass "$name"
    return 0
  else
    step_fail "$name" "expected HTTP $expected, got $actual"
    return 1
  fi
}

json_field() {
  # Minimal JSON field extraction (no jq dependency)
  local field="$1"
  local json="$2"
  echo "$json" | grep -oP "\"$field\"\s*:\s*\"?\K[^\",}]+" | head -1
}

echo "=============================================="
echo " nvidopia E2E Smoke Test"
echo " BFF:               $BASE_URL"
echo " release-manager:   $RELEASE_MANAGER_URL"
echo " fleet-manager:     $FLEET_MANAGER_URL"
echo " issue-workflow:    $ISSUE_WORKFLOW_URL"
echo " traceability:      $TRACEABILITY_URL"
echo " kpi-engine:        $KPI_ENGINE_URL"
echo "=============================================="
echo ""

# ---------------------------------------------------------------------------
# Step 1: Health checks
# ---------------------------------------------------------------------------
echo "--- Step 1: Health Checks ---"

for svc_url in \
  "$BASE_URL/health" \
  "$RELEASE_MANAGER_URL/health" \
  "$FLEET_MANAGER_URL/health" \
  "$ISSUE_WORKFLOW_URL/health" \
  "$TRACEABILITY_URL/health" \
  "$KPI_ENGINE_URL/health"; do
  svc_name=$(echo "$svc_url" | sed 's|.*/health||; s|.*://||; s|/.*||')
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$svc_url" 2>/dev/null || echo "000")
  check_status "Health: $svc_name" 200 "$HTTP_CODE" || true
done

echo ""

# ---------------------------------------------------------------------------
# Step 2: Create a Project
# ---------------------------------------------------------------------------
echo "--- Step 2: Create Project ---"

PROJECT_ID="SMOKE-PROJ-$(date +%s)"
PROJECT_BODY=$(cat <<EOF
{
  "project_id": "$PROJECT_ID",
  "name": "E2E Smoke Project",
  "vehicle_platform": "ORIN-X",
  "soc_architecture": "dual-orin-x",
  "sensor_suite_version": "SS-4.2",
  "software_baseline_version": "v-smoke-test",
  "target_mileage_km": 1000,
  "start_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "Active"
}
EOF
)

HTTP_CODE=$(curl -s -o /tmp/nv_project.json -w "%{http_code}" \
  -X POST "$RELEASE_MANAGER_URL/projects" \
  -H "Content-Type: application/json" \
  -d "$PROJECT_BODY" 2>/dev/null || echo "000")
check_status "Create Project ($PROJECT_ID)" 201 "$HTTP_CODE" || true

echo ""

# ---------------------------------------------------------------------------
# Step 3: Create a Smoke Task
# ---------------------------------------------------------------------------
echo "--- Step 3: Create Smoke Task ---"

TASK_ID="SMOKE-TASK-$(date +%s)"
TASK_BODY=$(cat <<EOF
{
  "task_id": "$TASK_ID",
  "project_id": "$PROJECT_ID",
  "name": "E2E Smoke Test Task",
  "task_type": "Smoke",
  "priority": "High",
  "target_vehicle_count": 1,
  "execution_region": "test-region",
  "status": "Pending"
}
EOF
)

HTTP_CODE=$(curl -s -o /tmp/nv_task.json -w "%{http_code}" \
  -X POST "$RELEASE_MANAGER_URL/tasks" \
  -H "Content-Type: application/json" \
  -d "$TASK_BODY" 2>/dev/null || echo "000")
check_status "Create Task ($TASK_ID)" 201 "$HTTP_CODE" || true

echo ""

# ---------------------------------------------------------------------------
# Step 4: Create a Vehicle
# ---------------------------------------------------------------------------
echo "--- Step 4: Register Vehicle via Ingest ---"

VEHICLE_VIN="VIN-SMOKE-$(date +%s)"

# Vehicles are created/updated through the status ingestion pipeline.
# POST to the BFF ingest endpoint which publishes to Kafka; the
# fleet-manager consumer upserts the vehicle record.
VEHICLE_BODY=$(cat <<EOF
{
  "vehicle_id": "$VEHICLE_VIN",
  "vin": "$VEHICLE_VIN",
  "vehicle_platform": "ORIN-X",
  "sensor_suite_version": "SS-4.2",
  "soc_architecture": "dual-orin-x",
  "current_status": "Idle",
  "driving_mode": "Standby",
  "fuel_or_battery_level": 95
}
EOF
)

HTTP_CODE=$(curl -s -o /tmp/nv_vehicle_ingest.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/ingest/status" \
  -H "Content-Type: application/json" \
  -d "$VEHICLE_BODY" 2>/dev/null || echo "000")
check_status "Ingest Vehicle Status ($VEHICLE_VIN)" 202 "$HTTP_CODE" || true

# Brief wait for Kafka consumer to process
sleep 2

echo ""

# ---------------------------------------------------------------------------
# Step 5: Create a Run (assign vehicle to task)
# ---------------------------------------------------------------------------
echo "--- Step 5: Create Run ---"

RUN_ID="SMOKE-RUN-$(date +%s)"
RUN_BODY=$(cat <<EOF
{
  "run_id": "$RUN_ID",
  "task_id": "$TASK_ID",
  "vehicle_vin": "$VEHICLE_VIN",
  "driver_id": "smoke-driver",
  "start_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total_auto_mileage_km": 0,
  "software_version_hash": "smoke-hash",
  "status": "Scheduled"
}
EOF
)

HTTP_CODE=$(curl -s -o /tmp/nv_run.json -w "%{http_code}" \
  -X POST "$FLEET_MANAGER_URL/runs" \
  -H "Content-Type: application/json" \
  -d "$RUN_BODY" 2>/dev/null || echo "000")
check_status "Create Run ($RUN_ID)" 201 "$HTTP_CODE" || true

echo ""

# ---------------------------------------------------------------------------
# Step 6: Simulate issue report via ingest endpoint
# ---------------------------------------------------------------------------
echo "--- Step 6: Ingest Issue Report ---"

HTTP_CODE=$(curl -s -o /tmp/nv_ingest_issue.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/ingest/issue" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"E2E Smoke: perception false positive\",
    \"description\": \"Smoke test generated issue\",
    \"run_id\": \"$RUN_ID\",
    \"category\": \"Perception\",
    \"severity\": \"Medium\"
  }" 2>/dev/null || echo "000")
check_status "Ingest Issue Report" 202 "$HTTP_CODE" || true

echo ""

# ---------------------------------------------------------------------------
# Step 7: Create issue directly & verify
# ---------------------------------------------------------------------------
echo "--- Step 7: Create & Verify Issue ---"

ISSUE_ID="SMOKE-ISS-$(date +%s)"
ISSUE_BODY=$(cat <<EOF
{
  "issue_id": "$ISSUE_ID",
  "run_id": "$RUN_ID",
  "trigger_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "category": "Perception",
  "severity": "High",
  "takeover_type": "SystemFault",
  "description": "E2E smoke test: simulated perception failure",
  "status": "New"
}
EOF
)

HTTP_CODE=$(curl -s -o /tmp/nv_issue.json -w "%{http_code}" \
  -X POST "$ISSUE_WORKFLOW_URL/api/issues" \
  -H "Content-Type: application/json" \
  -d "$ISSUE_BODY" 2>/dev/null || echo "000")
check_status "Create Issue ($ISSUE_ID)" 201 "$HTTP_CODE" || true

# Verify it was persisted
HTTP_CODE=$(curl -s -o /tmp/nv_issue_get.json -w "%{http_code}" \
  "$ISSUE_WORKFLOW_URL/api/issues/$ISSUE_ID" 2>/dev/null || echo "000")
check_status "Verify Issue GET" 200 "$HTTP_CODE" || true

echo ""

# ---------------------------------------------------------------------------
# Step 8: Transition issue through the state machine
# ---------------------------------------------------------------------------
echo "--- Step 8: Issue State Transitions ---"

# New -> Triage -> Assigned -> InProgress -> Fixed -> RegressionTracking -> Closed
TRANSITIONS=("Triage" "Assigned" "InProgress" "Fixed" "RegressionTracking" "Closed")

for TO_STATUS in "${TRANSITIONS[@]}"; do
  HTTP_CODE=$(curl -s -o /tmp/nv_transition.json -w "%{http_code}" \
    -X PUT "$ISSUE_WORKFLOW_URL/api/issues/$ISSUE_ID/transition" \
    -H "Content-Type: application/json" \
    -d "{
      \"to_status\": \"$TO_STATUS\",
      \"triggered_by\": \"e2e-smoke-test\",
      \"reason\": \"Smoke test transition\"
    }" 2>/dev/null || echo "000")
  check_status "Transition -> $TO_STATUS" 200 "$HTTP_CODE" || true
done

# For the Assigned transition, also set assignment fields
curl -s -o /dev/null \
  -X PUT "$ISSUE_WORKFLOW_URL/api/issues/$ISSUE_ID" \
  -H "Content-Type: application/json" \
  -d '{"assigned_to": "smoke-tester@nvidopia.dev", "assigned_module": "perception"}' 2>/dev/null || true

# Verify final status is Closed
FINAL_BODY=$(curl -s "$ISSUE_WORKFLOW_URL/api/issues/$ISSUE_ID" 2>/dev/null || echo "{}")
FINAL_STATUS=$(json_field "status" "$FINAL_BODY")
if [ "$FINAL_STATUS" = "Closed" ]; then
  step_pass "Final status is Closed"
else
  step_fail "Final status is Closed" "got $FINAL_STATUS"
fi

# Verify transition history
HTTP_CODE=$(curl -s -o /tmp/nv_transitions.json -w "%{http_code}" \
  "$ISSUE_WORKFLOW_URL/api/issues/$ISSUE_ID/transitions" 2>/dev/null || echo "000")
check_status "Transition History GET" 200 "$HTTP_CODE" || true

echo ""

# ---------------------------------------------------------------------------
# Step 9: Query KPI endpoints
# ---------------------------------------------------------------------------
echo "--- Step 9: KPI Queries ---"

HTTP_CODE=$(curl -s -o /tmp/nv_kpi_mpi.json -w "%{http_code}" \
  "$KPI_ENGINE_URL/kpi/mpi?project_id=$PROJECT_ID" 2>/dev/null || echo "000")
check_status "KPI: MPI" 200 "$HTTP_CODE" || true

HTTP_CODE=$(curl -s -o /tmp/nv_kpi_mttr.json -w "%{http_code}" \
  "$KPI_ENGINE_URL/kpi/mttr?project_id=$PROJECT_ID" 2>/dev/null || echo "000")
check_status "KPI: MTTR" 200 "$HTTP_CODE" || true

HTTP_CODE=$(curl -s -o /tmp/nv_kpi_fleet.json -w "%{http_code}" \
  "$KPI_ENGINE_URL/kpi/fleet-utilization?project_id=$PROJECT_ID" 2>/dev/null || echo "000")
check_status "KPI: Fleet Utilization" 200 "$HTTP_CODE" || true

HTTP_CODE=$(curl -s -o /tmp/nv_kpi_convergence.json -w "%{http_code}" \
  "$KPI_ENGINE_URL/kpi/issue-convergence?project_id=$PROJECT_ID" 2>/dev/null || echo "000")
check_status "KPI: Issue Convergence" 200 "$HTTP_CODE" || true

echo ""

# ---------------------------------------------------------------------------
# Step 10: Query Traceability endpoints
# ---------------------------------------------------------------------------
echo "--- Step 10: Traceability Queries ---"

HTTP_CODE=$(curl -s -o /tmp/nv_trace_coverage.json -w "%{http_code}" \
  "$TRACEABILITY_URL/api/trace/coverage" 2>/dev/null || echo "000")
check_status "Traceability: Coverage" 200 "$HTTP_CODE" || true

HTTP_CODE=$(curl -s -o /tmp/nv_trace_backward.json -w "%{http_code}" \
  "$TRACEABILITY_URL/api/trace/backward/$ISSUE_ID" 2>/dev/null || echo "000")
check_status "Traceability: Backward ($ISSUE_ID)" 200 "$HTTP_CODE" || true

echo ""

# ---------------------------------------------------------------------------
# Step 11: Schema Registry, Issue Snapshots, Timeseries, Custom KPI
# ---------------------------------------------------------------------------
echo "--- Step 11: Schema Registry, Snapshots, Timeseries, Custom KPI ---"

BASE="$BASE_URL"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/schema/fields" 2>/dev/null || echo "000")
check_status "Schema fields (all)" 200 "$HTTP_CODE" || true

RES=$(curl -s "$BASE/api/schema/fields/issue" 2>/dev/null || echo "{}")
if echo "$RES" | grep -q "vehicle_dynamics"; then
  step_pass "Schema issue fields include vehicle_dynamics"
else
  step_fail "Schema issue fields include vehicle_dynamics" "vehicle_dynamics not in response"
fi

SNAPSHOT='{"speed_mps":15.5,"acceleration_mps2":-1.2,"gear":"D"}'
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$SNAPSHOT" "$BASE/api/issues/$ISSUE_ID/snapshot" 2>/dev/null || echo "000")
check_status "Upload snapshot" 200 "$HTTP_CODE" || true

RES=$(curl -s "$BASE/api/issues/$ISSUE_ID/snapshot" 2>/dev/null || echo "{}")
if echo "$RES" | grep -q "speed_mps"; then
  step_pass "Snapshot query returns speed_mps"
else
  step_fail "Snapshot query returns speed_mps" "snapshot missing speed_mps"
fi

TS_DATA='{"channel":"lidar_test","channel_type":"sensor","time_range_ms":{"start":-1000,"end":1000},"data_points":[{"t":-1000,"values":{"count":100}},{"t":0,"values":{"count":120}},{"t":1000,"values":{"count":110}}]}'
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$TS_DATA" "$BASE/api/issues/$ISSUE_ID/timeseries" 2>/dev/null || echo "000")
check_status "Upload timeseries" 201 "$HTTP_CODE" || true

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/issues/$ISSUE_ID/timeseries/lidar_test" 2>/dev/null || echo "000")
check_status "Query timeseries channel" 200 "$HTTP_CODE" || true

KPI_DEF='{"name":"Test KPI","formula":"issue_count","data_source":"issue","variables":[{"name":"issue_count","source_entity":"issue","field":"issue_id","aggregation":"count"}],"visualization":{"chart_type":"stat"},"enabled":true}'
RES=$(curl -s -X POST -H "Content-Type: application/json" -d "$KPI_DEF" "$BASE/api/kpi/definitions" 2>/dev/null || echo "{}")
KPI_ID=$(echo "$RES" | grep -o '"kpi_id":"[^"]*"' | head -1 | cut -d'"' -f4)
if echo "$RES" | grep -q "kpi_id"; then
  step_pass "Create custom KPI (kpi_id=$KPI_ID)"
else
  step_fail "Create custom KPI" "KPI definition creation failed"
fi

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/kpi/custom/$KPI_ID/evaluate" 2>/dev/null || echo "000")
check_status "Evaluate custom KPI" 200 "$HTTP_CODE" || true

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/kpi/definitions/$KPI_ID" 2>/dev/null || echo "000")
check_status "Delete custom KPI" 200 "$HTTP_CODE" || true

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/kpi/mpi?project_id=$PROJECT_ID" 2>/dev/null || echo "000")
check_status "MPI regression" 200 "$HTTP_CODE" || true

echo ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo "=============================================="
echo " RESULTS: $PASS passed, $FAIL failed"
echo "=============================================="
for s in "${STEPS[@]}"; do
  echo "  $s"
done
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo "ALL STEPS PASSED"
  exit 0
else
  echo "SOME STEPS FAILED"
  exit 1
fi
