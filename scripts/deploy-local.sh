#!/usr/bin/env bash
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GCP_REGION:-us-central1}"
AR_REPO="${AR_REPO:-cloud-run-source-deploy}"
SERVICE_NAME="nvitopia"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${SERVICE_NAME}"
TAG="${1:-latest}"

echo "╔══════════════════════════════════════════════════╗"
echo "║  Nvidopia — Local Build & Deploy to Cloud Run    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Project : ${PROJECT_ID}"
echo "  Region  : ${REGION}"
echo "  Image   : ${IMAGE}:${TAG}"
echo ""

# ── Step 0: Ensure Artifact Registry repo exists ─────────────────
echo "▸ Ensuring Artifact Registry repository exists..."
gcloud artifacts repositories describe "${AR_REPO}" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" >/dev/null 2>&1 || \
gcloud artifacts repositories create "${AR_REPO}" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --repository-format=docker \
  --description="Nvidopia container images"

# ── Step 1: Configure Docker auth ────────────────────────────────
echo "▸ Configuring Docker authentication..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# ── Step 2: Check Docker memory ──────────────────────────────────
DOCKER_MEM_MB=$(docker system info --format '{{.MemTotal}}' 2>/dev/null | awk '{printf "%.0f", $1/1048576}')
if [ "${DOCKER_MEM_MB:-0}" -lt 4000 ]; then
  echo "⚠  Docker memory is ${DOCKER_MEM_MB}MB. Vite build needs ≥4GB."
  echo "   Please increase in Docker Desktop → Settings → Resources → Memory."
  exit 1
fi

# ── Step 3: Build locally (with full layer cache) ────────────────
echo "▸ Building Docker image locally..."
SECONDS=0
docker build -t "${IMAGE}:${TAG}" .
echo "  ✓ Build completed in ${SECONDS}s"

# ── Step 4: Push to Artifact Registry ────────────────────────────
echo "▸ Pushing image to Artifact Registry..."
SECONDS=0
docker push "${IMAGE}:${TAG}"
echo "  ✓ Push completed in ${SECONDS}s"

# ── Step 5: Deploy to Cloud Run ──────────────────────────────────
echo "▸ Deploying to Cloud Run..."
SECONDS=0
gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE}:${TAG}" \
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
