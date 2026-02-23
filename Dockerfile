FROM node:20-alpine

RUN apk add --no-cache nginx gettext

WORKDIR /app

COPY package.json package-lock.json ./
COPY platform/ platform/
COPY apps/ apps/
COPY services/ services/
COPY contracts/ contracts/

RUN npm ci

WORKDIR /app/apps/frontend
RUN npx vite build
WORKDIR /app

RUN mkdir -p /usr/share/nginx/html && \
    cp -r apps/frontend/dist/* /usr/share/nginx/html/

COPY nginx.cloudrun.conf /etc/nginx/http.d/default.conf.template
COPY scripts/start-all.sh scripts/start-all.sh
RUN chmod +x scripts/start-all.sh && \
    rm -f /etc/nginx/http.d/default.conf

EXPOSE 8080

CMD ["scripts/start-all.sh"]
