# ---- Build stage: compile the Vite app to static files ----
FROM node:20-alpine AS build
WORKDIR /app

# Copy manifest first so `npm install` is cached when only source changes
COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

# Vite bakes VITE_* variables in at BUILD time, not run time.
# Default "/api/v1" => browser calls same-origin, Ingress routes it to backend.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npx vite build         # bundle only (skips tsc type-check); outputs to /app/dist

# ---- Production stage: serve the static files with nginx ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
