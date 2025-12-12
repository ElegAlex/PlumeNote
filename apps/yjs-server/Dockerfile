# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl python3 make g++

# Copier les fichiers de dependances du monorepo complet
COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages ./packages
COPY apps/yjs-server ./apps/yjs-server

# Installer toutes les dependances
RUN npm ci

# Build dans l'ordre des dependances (workspaces)
RUN npm run build --workspace=@plumenote/types
RUN npm run db:generate --workspace=@plumenote/database
RUN npm run build --workspace=@plumenote/database
RUN npm run build --workspace=@plumenote/yjs-server

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
COPY --from=builder /app/apps/yjs-server/dist ./apps/yjs-server/dist
COPY --from=builder /app/apps/yjs-server/package.json ./apps/yjs-server/

WORKDIR /app/apps/yjs-server

# Health check via serveur HTTP auxiliaire (SPEC-004)
# Port 3003 = serveur health HTTP séparé de Hocuspocus (WebSocket)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -sf http://127.0.0.1:3003/health | grep -q '"status":"ok"' || exit 1

# Port 1234 = WebSocket Hocuspocus, Port 3003 = Health check HTTP
EXPOSE 1234 3003
CMD ["node", "dist/index.js"]
