FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* package-lock.json* tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN pnpm install || npm install
RUN cd packages/types && npm run build
RUN cd packages/types/dist && mv index.js index.mjs 2>/dev/null || true
RUN cd apps/web && npm run build

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
