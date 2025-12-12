# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copier les fichiers de dependances du monorepo complet
COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web

# Installer les dependances
RUN npm ci

# Build des packages puis de l'app (workspaces)
RUN npm run build --workspace=@plumenote/types
RUN npm run build --workspace=@plumenote/web

# Stage 2: Production
FROM nginx:alpine

# Copier la config nginx DEPUIS LE CONTEXTE DE BUILD (racine projet)
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copier l'application buildee
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
