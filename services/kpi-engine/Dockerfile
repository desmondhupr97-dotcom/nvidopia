FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY platform/ platform/
COPY services/kpi-engine/ services/kpi-engine/

RUN mkdir -p apps/bff-gateway apps/frontend \
    services/release-manager services/fleet-manager \
    services/issue-workflow services/traceability && \
    for d in apps/bff-gateway apps/frontend \
             services/release-manager services/fleet-manager \
             services/issue-workflow services/traceability; do \
      printf '{"name":"stub-%s","private":true}' "$(echo $d | tr / -)" > "$d/package.json"; \
    done

RUN npm install

WORKDIR /app/services/kpi-engine
EXPOSE 3005
CMD ["npx", "tsx", "src/index.ts"]
