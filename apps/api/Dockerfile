# Stage 1: Build (uniquement pour les packages)
FROM node:20-alpine AS builder
WORKDIR /app

# Installer les outils necessaires
RUN apk add --no-cache openssl python3 make g++

# Copier les fichiers de dependances du monorepo complet
COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Installer toutes les dependances
RUN npm ci

# Build dans l'ordre des dependances (workspaces)
RUN npm run build --workspace=@plumenote/types
RUN npm run db:generate --workspace=@plumenote/database
RUN npm run build --workspace=@plumenote/database

# Stage 2: Production - utiliser tsx avec les sources directement
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl

# Copier tout le necessaire
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/tsconfig.base.json ./

WORKDIR /app/apps/api

# Installer tsx globalement pour execution
RUN npm install -g tsx

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

EXPOSE 3001
CMD ["tsx", "src/index.ts"]
