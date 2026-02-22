FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend/ apps/frontend/

RUN mkdir -p apps/bff-gateway \
    platform/data-models platform/eventing platform/observability platform/service-toolkit \
    services/release-manager services/fleet-manager \
    services/issue-workflow services/kpi-engine services/traceability && \
    for d in apps/bff-gateway \
             platform/data-models platform/eventing platform/observability platform/service-toolkit \
             services/release-manager services/fleet-manager \
             services/issue-workflow services/kpi-engine services/traceability; do \
      printf '{"name":"stub-%s","private":true}' "$(echo $d | tr / -)" > "$d/package.json"; \
    done

RUN npm install

WORKDIR /app/apps/frontend
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
