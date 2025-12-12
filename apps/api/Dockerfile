FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl openssl-dev
RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* package-lock.json* tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install || npm install
RUN cd packages/types && npm run build
RUN cd packages/database && npx prisma generate && npm run build

FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
RUN npm install -g pnpm
COPY --from=builder /app ./
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["npx", "tsx", "src/index.ts"]
