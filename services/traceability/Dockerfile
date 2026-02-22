FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY platform/ platform/
COPY services/traceability/ services/traceability/

RUN mkdir -p apps/bff-gateway apps/frontend \
    services/release-manager services/fleet-manager \
    services/issue-workflow services/kpi-engine && \
    for d in apps/bff-gateway apps/frontend \
             services/release-manager services/fleet-manager \
             services/issue-workflow services/kpi-engine; do \
      printf '{"name":"stub-%s","private":true}' "$(echo $d | tr / -)" > "$d/package.json"; \
    done

RUN npm install

WORKDIR /app/services/traceability
EXPOSE 3004
CMD ["npx", "tsx", "src/index.ts"]
