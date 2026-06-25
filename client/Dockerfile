# ---- Build stage ----
FROM node:20-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Build-time API URL is baked into the static bundle — must be passed at
# `docker build --build-arg VITE_API_BASE_URL=...`, not set at runtime.
ARG VITE_API_BASE_URL
ARG VITE_APP_NAME=CareerSync
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
RUN npm run build

# ---- Serve stage ----
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
