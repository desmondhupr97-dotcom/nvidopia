FROM node:20-alpine

RUN apk add --no-cache nginx gettext

WORKDIR /app

# --- Layer 1: dependency manifests only (changes rarely) ---
COPY package.json package-lock.json ./
COPY platform/data-models/package.json       platform/data-models/
COPY platform/observability/package.json      platform/observability/
COPY platform/eventing/package.json           platform/eventing/
COPY platform/service-toolkit/package.json    platform/service-toolkit/
COPY apps/bff-gateway/package.json            apps/bff-gateway/
COPY apps/frontend/package.json               apps/frontend/
COPY services/ptc-service/package.json        services/ptc-service/
COPY services/kpi-engine/package.json         services/kpi-engine/
COPY services/issue-workflow/package.json     services/issue-workflow/
COPY services/fleet-simulator/package.json    services/fleet-simulator/
COPY services/traceability/package.json       services/traceability/
COPY services/release-manager/package.json    services/release-manager/
COPY services/fleet-manager/package.json      services/fleet-manager/
COPY contracts/package.json                   contracts/

RUN npm ci

# --- Layer 2: source code (changes frequently) ---
COPY platform/ platform/
COPY apps/bff-gateway/ apps/bff-gateway/
COPY apps/frontend/ apps/frontend/
COPY services/ services/
COPY contracts/ contracts/

RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build -w @nvidopia/frontend && \
    mkdir -p /usr/share/nginx/html && \
    cp -r apps/frontend/dist/* /usr/share/nginx/html/

COPY nginx.cloudrun.conf /etc/nginx/http.d/default.conf.template
COPY scripts/start-all.sh scripts/start-all.sh
RUN chmod +x scripts/start-all.sh && \
    rm -f /etc/nginx/http.d/default.conf

EXPOSE 8080

CMD ["scripts/start-all.sh"]
