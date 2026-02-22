FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY platform/ platform/
COPY services/fleet-manager/ services/fleet-manager/

RUN mkdir -p apps/bff-gateway apps/frontend \
    services/release-manager services/issue-workflow \
    services/kpi-engine services/traceability && \
    for d in apps/bff-gateway apps/frontend \
             services/release-manager services/issue-workflow \
             services/kpi-engine services/traceability; do \
      printf '{"name":"stub-%s","private":true}' "$(echo $d | tr / -)" > "$d/package.json"; \
    done

RUN npm install

WORKDIR /app/services/fleet-manager
EXPOSE 3002
CMD ["npx", "tsx", "src/index.ts"]
