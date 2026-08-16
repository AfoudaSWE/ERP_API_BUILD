FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx nx run-many -t build --projects=erp_api,worker,erp_interface

FROM build AS prod-deps
RUN npm prune --omit=dev

FROM node:22-alpine AS erp_api
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S erp && adduser -S -G erp erp
COPY --from=prod-deps --chown=erp:erp /app/node_modules ./node_modules
COPY --from=build /app/dist/apps/api/erp-api ./dist/apps/api/erp-api
COPY --from=build /app/apps/api/erp-api/src/db/migrations ./apps/api/erp-api/src/db/migrations
USER erp
EXPOSE 3333
CMD ["node", "dist/apps/api/erp-api/main.js"]

FROM node:22-alpine AS worker
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S erp && adduser -S -G erp erp
COPY --from=prod-deps --chown=erp:erp /app/node_modules ./node_modules
COPY --from=build --chown=erp:erp /app/dist/apps/workers/jobs-worker ./dist/apps/workers/jobs-worker
USER erp
CMD ["node", "dist/apps/workers/jobs-worker/main.js"]

FROM nginxinc/nginx-unprivileged:1.29-alpine AS erp_web
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/apps/web/erp-interface /usr/share/nginx/html
EXPOSE 8080
