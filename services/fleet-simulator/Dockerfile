FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY platform/ platform/
COPY services/fleet-simulator/ services/fleet-simulator/

RUN mkdir -p apps/bff-gateway apps/frontend \
    services/release-manager services/fleet-manager \
    services/issue-workflow services/kpi-engine services/traceability && \
    for d in apps/bff-gateway apps/frontend \
             services/release-manager services/fleet-manager \
             services/issue-workflow services/kpi-engine services/traceability; do \
      printf '{"name":"stub-%s","private":true}' "$(echo $d | tr / -)" > "$d/package.json"; \
    done

RUN npm install

WORKDIR /app/services/fleet-simulator
EXPOSE 3006
CMD ["npx", "tsx", "src/index.ts"]
