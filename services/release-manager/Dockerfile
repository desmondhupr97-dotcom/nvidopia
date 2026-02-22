FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY platform/ platform/
COPY services/release-manager/ services/release-manager/

RUN mkdir -p apps/bff-gateway apps/frontend \
    services/fleet-manager services/issue-workflow \
    services/kpi-engine services/traceability && \
    for d in apps/bff-gateway apps/frontend \
             services/fleet-manager services/issue-workflow \
             services/kpi-engine services/traceability; do \
      printf '{"name":"stub-%s","private":true}' "$(echo $d | tr / -)" > "$d/package.json"; \
    done

RUN npm install

WORKDIR /app/services/release-manager
EXPOSE 3001
CMD ["npx", "tsx", "src/index.ts"]
