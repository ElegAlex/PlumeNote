# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Installer les outils necessaires
RUN apk add --no-cache openssl python3 make g++

# Copier les fichiers de dependances du monorepo complet
COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Installer toutes les dependances
RUN npm install --legacy-peer-deps

# Build dans l'ordre des dependances (workspaces)
RUN npm run build --workspace=@plumenote/types
RUN npm run db:generate --workspace=@plumenote/database
RUN npm run build --workspace=@plumenote/database
RUN npm run build --workspace=@plumenote/api

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl curl

# Copier uniquement le necessaire pour la production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
# Copier le seed.js pour l'execution en production
COPY --from=builder /app/packages/database/prisma/seed.js ./packages/database/prisma/seed.js
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

WORKDIR /app/apps/api

# Health check avec curl et vérification du body JSON (SPEC-004)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -sf http://127.0.0.1:3001/health | grep -q '"status":"ok"' || exit 1

EXPOSE 3001
CMD ["node", "dist/index.js"]
