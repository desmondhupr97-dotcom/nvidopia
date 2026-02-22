FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY platform/ platform/
COPY apps/bff-gateway/ apps/bff-gateway/

RUN mkdir -p apps/frontend \
    services/release-manager services/fleet-manager \
    services/issue-workflow services/kpi-engine services/traceability && \
    for d in apps/frontend \
             services/release-manager services/fleet-manager \
             services/issue-workflow services/kpi-engine services/traceability; do \
      printf '{"name":"stub-%s","private":true}' "$(echo $d | tr / -)" > "$d/package.json"; \
    done

RUN npm install

WORKDIR /app/apps/bff-gateway
EXPOSE 3000
CMD ["npx", "tsx", "src/index.ts"]
