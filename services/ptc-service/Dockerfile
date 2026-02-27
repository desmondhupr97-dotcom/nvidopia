FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY platform/ platform/
COPY services/ptc-service/ services/ptc-service/

RUN mkdir -p apps/bff-gateway apps/frontend \
    services/release-manager services/fleet-manager services/issue-workflow \
    services/kpi-engine services/traceability services/fleet-simulator && \
    for d in apps/bff-gateway apps/frontend \
             services/release-manager services/fleet-manager services/issue-workflow \
             services/kpi-engine services/traceability services/fleet-simulator; do \
      printf '{"name":"stub-%s","private":true}' "$(echo $d | tr / -)" > "$d/package.json"; \
    done

RUN npm install

WORKDIR /app/services/ptc-service
EXPOSE 3007
CMD ["npx", "tsx", "src/index.ts"]
