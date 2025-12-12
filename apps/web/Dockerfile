FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* package-lock.json* tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN pnpm install || npm install
RUN cd packages/types && npm run build
RUN cd apps/web && npm run build

FROM nginx:alpine

# Copy custom nginx config for SPA routing (fixes 404 on refresh)
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
