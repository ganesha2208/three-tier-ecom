# ---- Build stage: compile the Vite app to static files ----
FROM node:20-alpine AS build
WORKDIR /app

# Copy manifest first so the npm layer is cached when only source changes
COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

# Vite bakes VITE_* variables in at BUILD time, not run time.
# Default "/api/v1" => browser calls same-origin, Ingress routes it to backend.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npx vite build         # bundle only (skips tsc type-check); outputs to /app/dist

# ---- Production stage: serve static files with non-root nginx ----
# nginx-unprivileged runs as the non-root "nginx" user (uid 101) and
# listens on 8080 — a non-root user cannot bind ports below 1024.
FROM nginxinc/nginx-unprivileged:alpine

# Pull latest Alpine security patches (openssl, libcrypto3, libssl3) so
# Trivy's fixable-HIGH/CRITICAL scan stays clean. Base image sets USER 101;
# switch to root for apk, then back.
USER root
RUN apk update && apk upgrade --no-cache
USER 101

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
