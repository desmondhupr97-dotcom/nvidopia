#!/usr/bin/env bash
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GCP_REGION:-us-central1}"
AR_REPO="${AR_REPO:-cloud-run-source-deploy}"
SERVICE_NAME="nvitopia"

echo "╔══════════════════════════════════════════════════╗"
echo "║  Nvidopia — Cloud Build (kaniko) & Deploy        ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Project : ${PROJECT_ID}"
echo "  Region  : ${REGION}"
echo "  Builder : kaniko (cached, E2_HIGHCPU_8)"
echo ""

# ── Step 0: Ensure Artifact Registry repo exists ─────────────────
echo "▸ Ensuring Artifact Registry repository exists..."
if ! gcloud artifacts repositories describe "${AR_REPO}" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${AR_REPO}" \
    --project="${PROJECT_ID}" \
    --location="${REGION}" \
    --repository-format=docker \
    --description="Nvidopia container images"
fi

# ── Step 1: Submit build with kaniko cache ───────────────────────
echo "▸ Submitting build to Cloud Build (kaniko + cache)..."
SECONDS=0
gcloud builds submit . \
  --config=cloudbuild.yaml \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --substitutions="_AR_REGION=${REGION},_AR_REPO=${AR_REPO}"

BUILD_ID=$(gcloud builds list --project="${PROJECT_ID}" --region="${REGION}" \
  --limit=1 --format='value(id)' 2>/dev/null)
echo "  ✓ Build completed in ${SECONDS}s (build: ${BUILD_ID})"

# ── Step 2: Deploy to Cloud Run ──────────────────────────────────
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${SERVICE_NAME}:latest"
echo "▸ Deploying ${IMAGE} to Cloud Run..."
SECONDS=0
gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE}" \
  --region="${REGION}" \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=2 \
  --timeout=300

echo "  ✓ Deploy completed in ${SECONDS}s"
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Deployment finished successfully!"
echo "═══════════════════════════════════════════════════"
