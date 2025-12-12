# SPEC-003 : Finalisation Open Source & CI/CD

## 1. Résumé

|Attribut|Valeur|
|---|---|
|Type|Improvement / Documentation|
|Priorité|P1-Haute|
|Complexité|M|
|Modules impactés|Docker, CI/CD, Documentation, Tests|
|Estimation|1-2 jours|
|Prérequis|SPEC-001 et SPEC-002 implémentées|

### Description

Finalisation du projet PlumeNote pour une release open source publique : correction des derniers problèmes techniques, mise en place d'une CI/CD GitHub Actions, et création de la documentation communautaire standard.

### Critères d'acceptation

- [ ] Health check du conteneur web fonctionnel (status "healthy")
- [ ] Test WebSocket robuste dans smoke-test.sh (pas de faux positifs)
- [ ] GitHub Actions : build + test automatique sur push/PR
- [ ] README.md principal complet et attractif
- [ ] CONTRIBUTING.md avec guide de contribution
- [ ] LICENSE (MIT ou Apache 2.0)
- [ ] CHANGELOG.md initialisé
- [ ] Issue templates GitHub
- [ ] Badges de statut dans le README

---

## 2. Analyse technique

### 2.1 Problèmes résiduels identifiés

|Problème|Impact|Priorité|
|---|---|---|
|Conteneur web "unhealthy"|Confusion monitoring|P1|
|Test WebSocket accepte 404|Faux positifs|P2|
|Pas de CI/CD|Régression possible|P1|
|Documentation incomplète|Frein à l'adoption|P1|

### 2.2 État actuel du conteneur web

Le Dockerfile web utilise nginx:alpine qui n'a pas de health check configuré par défaut. Le docker-compose.yml ne définit pas non plus de health check pour ce service.

### 2.3 Architecture CI/CD cible

```
┌─────────────────────────────────────────────────────────────────┐
│  GitHub Actions                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Lint      │───▶│   Build     │───▶│   Test      │         │
│  │  (ESLint)   │    │  (TypeScript)│    │  (Vitest)   │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │              Docker Build & Test                     │       │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │       │
│  │  │  API    │  │  YJS    │  │  Web    │  │ Smoke  │ │       │
│  │  │  Build  │  │  Build  │  │  Build  │  │ Tests  │ │       │
│  │  └─────────┘  └─────────┘  └─────────┘  └────────┘ │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Spécifications détaillées

### 3.1 Correction Health Check Web

#### apps/web/Dockerfile (modifier)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN npm ci

RUN npm run build --workspace=@plumenote/types
RUN npm run build --workspace=@plumenote/web

# Stage 2: Production
FROM nginx:alpine

# Installer curl pour le health check
RUN apk add --no-cache curl

# Copier la config nginx
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copier l'application buildée
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:80/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### docker/docker-compose.yml (vérifier/ajouter health check web)

```yaml
  web:
    build:
      context: ..
      dockerfile: apps/web/Dockerfile
    container_name: plumenote-web
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://127.0.0.1:80/"]
      interval: 30s
      timeout: 10s
      start_period: 10s
      retries: 3
    networks:
      - plumenote-network
```

### 3.2 Test WebSocket robuste

#### docker/scripts/smoke-test.sh (remplacer)

```bash
#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_URL="${1:-http://localhost}"
TIMEOUT=10
FAILED=0

log_ok() { echo -e "${GREEN}✓${NC} $1"; }
log_fail() { echo -e "${RED}✗${NC} $1"; FAILED=1; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_info() { echo -e "${BLUE}ℹ${NC} $1"; }

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║     PlumeNote - Tests de validation       ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "URL de base: $BASE_URL"
echo ""

# =============================================================================
# Tests HTTP basiques
# =============================================================================

echo "── Tests HTTP ──────────────────────────────"

# Test 1: Page d'accueil
echo -n "1. Page d'accueil... "
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL/" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    log_ok "HTTP $HTTP_CODE"
else
    log_fail "HTTP $HTTP_CODE"
fi

# Test 2: Health check nginx
echo -n "2. Health check global... "
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    log_ok "HTTP $HTTP_CODE"
else
    log_fail "HTTP $HTTP_CODE"
fi

# Test 3: API health
echo -n "3. API health... "
RESPONSE=$(curl -s --max-time $TIMEOUT "$BASE_URL/api/v1/health" 2>/dev/null || echo '{"error":"timeout"}')
if echo "$RESPONSE" | grep -q '"status".*ok\|"status".*healthy'; then
    log_ok "API healthy"
elif echo "$RESPONSE" | grep -q "timeout"; then
    log_fail "Timeout"
else
    # Essayer l'ancien endpoint
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL/api/health" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        log_ok "API répond (HTTP $HTTP_CODE)"
    else
        log_fail "API inaccessible"
    fi
fi

# =============================================================================
# Tests Authentification
# =============================================================================

echo ""
echo "── Tests Authentification ─────────────────"

# Test 4: Endpoint auth/me (doit retourner 401)
echo -n "4. Auth check (401 attendu)... "
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL/api/v1/auth/me" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "401" ]; then
    log_ok "HTTP $HTTP_CODE (correct)"
else
    log_fail "HTTP $HTTP_CODE (attendu: 401)"
fi

# Test 5: Login avec mauvais credentials (doit retourner 400 ou 401)
echo -n "5. Login invalide (400/401 attendu)... "
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"invalid@test.com","password":"wrongpassword"}' \
    "$BASE_URL/api/v1/auth/login" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ]; then
    log_ok "HTTP $HTTP_CODE (correct)"
else
    log_fail "HTTP $HTTP_CODE (attendu: 400 ou 401)"
fi

# =============================================================================
# Tests WebSocket (via upgrade headers)
# =============================================================================

echo ""
echo "── Tests WebSocket ─────────────────────────"

# Test 6: WebSocket Yjs endpoint existe
echo -n "6. WebSocket Yjs (/ws)... "
# Un serveur WebSocket répond généralement 400 ou 426 à une requête HTTP normale
# ou 101 si l'upgrade est accepté (mais curl ne peut pas faire ça)
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT \
    -H "Upgrade: websocket" \
    -H "Connection: Upgrade" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    -H "Sec-WebSocket-Version: 13" \
    "$BASE_URL/ws" 2>/dev/null || echo "000")
# 400 = requête mal formée (normal avec curl)
# 426 = upgrade required
# 101 = switching protocols (upgrade accepté)
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "426" ] || [ "$HTTP_CODE" = "101" ]; then
    log_ok "Endpoint accessible (HTTP $HTTP_CODE)"
else
    log_fail "HTTP $HTTP_CODE (attendu: 400, 426 ou 101)"
fi

# Test 7: WebSocket Sync endpoint existe
echo -n "7. WebSocket Sync (/ws/sync)... "
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT \
    -H "Upgrade: websocket" \
    -H "Connection: Upgrade" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    -H "Sec-WebSocket-Version: 13" \
    "$BASE_URL/ws/sync" 2>/dev/null || echo "000")
# Pour /ws/sync, on peut avoir 401 (auth required) ce qui est OK
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "426" ] || [ "$HTTP_CODE" = "101" ] || [ "$HTTP_CODE" = "401" ]; then
    log_ok "Endpoint accessible (HTTP $HTTP_CODE)"
else
    log_fail "HTTP $HTTP_CODE (attendu: 400, 426, 101 ou 401)"
fi

# =============================================================================
# Tests Assets statiques
# =============================================================================

echo ""
echo "── Tests Assets ────────────────────────────"

# Test 8: Fichier index.html accessible
echo -n "8. Index HTML... "
RESPONSE=$(curl -s --max-time $TIMEOUT "$BASE_URL/" 2>/dev/null || echo "")
if echo "$RESPONSE" | grep -q '<!DOCTYPE html>\|<html'; then
    log_ok "HTML valide"
else
    log_fail "HTML invalide ou absent"
fi

# Test 9: Assets JS/CSS (vérifier qu'ils sont servis)
echo -n "9. Assets statiques... "
# Chercher un lien vers un asset dans le HTML
ASSET_URL=$(echo "$RESPONSE" | grep -oP 'src="[^"]+\.js"' | head -1 | sed 's/src="//;s/"//')
if [ -n "$ASSET_URL" ]; then
    # Tester l'accès à l'asset
    if [[ "$ASSET_URL" == /* ]]; then
        FULL_URL="$BASE_URL$ASSET_URL"
    else
        FULL_URL="$BASE_URL/$ASSET_URL"
    fi
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$FULL_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        log_ok "JS accessible"
    else
        log_warn "JS retourne HTTP $HTTP_CODE"
    fi
else
    log_warn "Pas de JS trouvé dans le HTML"
fi

# =============================================================================
# Tests Docker (si disponible)
# =============================================================================

echo ""
echo "── Tests Conteneurs ────────────────────────"

if command -v docker &> /dev/null; then
    # Test 10: Tous les conteneurs sont up
    echo -n "10. Conteneurs Docker... "
    CONTAINERS=$(docker compose ps --format json 2>/dev/null | jq -r '.State' 2>/dev/null | sort | uniq -c || echo "")
    RUNNING=$(echo "$CONTAINERS" | grep -c "running" || echo "0")
    if [ "$RUNNING" -ge 5 ]; then
        log_ok "$RUNNING conteneurs running"
    else
        log_warn "Seulement $RUNNING conteneurs running"
    fi

    # Test 11: Health status des conteneurs
    echo -n "11. Health checks... "
    UNHEALTHY=$(docker compose ps 2>/dev/null | grep -c "unhealthy" || echo "0")
    HEALTHY=$(docker compose ps 2>/dev/null | grep -c "healthy" || echo "0")
    if [ "$UNHEALTHY" = "0" ]; then
        log_ok "$HEALTHY healthy, 0 unhealthy"
    else
        log_warn "$HEALTHY healthy, $UNHEALTHY unhealthy"
    fi
else
    echo "10-11. Docker non disponible, skip"
fi

# =============================================================================
# Résumé
# =============================================================================

echo ""
echo "═══════════════════════════════════════════"
TOTAL_TESTS=11
PASSED=$((TOTAL_TESTS - FAILED))
echo "Résultat: $PASSED/$TOTAL_TESTS tests passés"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Tous les tests ont réussi !${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Certains tests ont échoué ou sont en warning${NC}"
    exit 1
fi
```

### 3.3 GitHub Actions CI/CD

#### .github/workflows/ci.yml (créer)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  # ==========================================================================
  # Lint & Type Check
  # ==========================================================================
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build packages
        run: |
          npm run build --workspace=@plumenote/types
          npm run db:generate --workspace=@plumenote/database
          npm run build --workspace=@plumenote/database

      - name: Lint
        run: npm run lint --workspaces --if-present

      - name: Type check
        run: npm run typecheck --workspaces --if-present

  # ==========================================================================
  # Unit Tests
  # ==========================================================================
  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build packages
        run: |
          npm run build --workspace=@plumenote/types
          npm run db:generate --workspace=@plumenote/database
          npm run build --workspace=@plumenote/database

      - name: Run tests
        run: npm run test --workspaces --if-present

  # ==========================================================================
  # Build Applications
  # ==========================================================================
  build:
    name: Build Applications
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build all
        run: |
          npm run build --workspace=@plumenote/types
          npm run db:generate --workspace=@plumenote/database
          npm run build --workspace=@plumenote/database
          npm run build --workspace=@plumenote/api
          npm run build --workspace=@plumenote/yjs-server
          npm run build --workspace=@plumenote/web

      - name: Verify builds
        run: |
          test -f apps/api/dist/index.js || exit 1
          test -f apps/yjs-server/dist/index.js || exit 1
          test -d apps/web/dist || exit 1
          echo "✓ All builds successful"

  # ==========================================================================
  # Docker Build
  # ==========================================================================
  docker:
    name: Docker Build
    runs-on: ubuntu-latest
    needs: [lint, build]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build API image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./apps/api/Dockerfile
          push: false
          tags: plumenote-api:test
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build YJS image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./apps/yjs-server/Dockerfile
          push: false
          tags: plumenote-yjs:test
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build Web image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./apps/web/Dockerfile
          push: false
          tags: plumenote-web:test
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ==========================================================================
  # Integration Tests (Docker Compose)
  # ==========================================================================
  integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: docker
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Create .env file
        run: |
          cat > docker/.env << 'EOF'
          NODE_ENV=production
          DOMAIN=localhost
          POSTGRES_USER=plumenote
          POSTGRES_PASSWORD=testpassword123
          POSTGRES_DB=plumenote
          REDIS_PASSWORD=testredispassword123
          JWT_SECRET=JwtTestSecretForCI32CharactersMinimum
          COOKIE_SECRET=CookieTestSecretForCI32CharactersMin
          CORS_ORIGINS=http://localhost
          HTTP_PORT=80
          HTTPS_PORT=443
          ENABLE_SSL=false
          SEED_DATABASE=true
          EOF

      - name: Start services
        run: |
          cd docker
          docker compose up -d --build
          sleep 60  # Attendre que tous les services démarrent

      - name: Check services health
        run: |
          cd docker
          docker compose ps
          # Vérifier que les services critiques sont up
          docker compose ps | grep -q "plumenote-api.*Up" || exit 1
          docker compose ps | grep -q "plumenote-yjs.*Up" || exit 1
          docker compose ps | grep -q "plumenote-web.*Up" || exit 1
          docker compose ps | grep -q "plumenote-postgres.*Up" || exit 1
          docker compose ps | grep -q "plumenote-redis.*Up" || exit 1

      - name: Run smoke tests
        run: |
          cd docker
          chmod +x scripts/smoke-test.sh
          ./scripts/smoke-test.sh http://localhost

      - name: Show logs on failure
        if: failure()
        run: |
          cd docker
          docker compose logs

      - name: Cleanup
        if: always()
        run: |
          cd docker
          docker compose down -v
```

#### .github/workflows/release.yml (créer)

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  release:
    name: Create Release
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract version
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT

      - name: Build and push API image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./apps/api/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/api:${{ steps.version.outputs.VERSION }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/api:latest

      - name: Build and push YJS image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./apps/yjs-server/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/yjs:${{ steps.version.outputs.VERSION }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/yjs:latest

      - name: Build and push Web image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./apps/web/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/web:${{ steps.version.outputs.VERSION }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/web:latest

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
          files: |
            docker/docker-compose.yml
            docker/.env.example
```

### 3.4 Documentation Open Source

#### README.md (racine du projet - remplacer)

````markdown
<div align="center">

# 🪶 PlumeNote

**Application de prise de notes collaborative en temps réel pour équipes IT**

[![CI](https://github.com/ElegAlex/PlumeNote/actions/workflows/ci.yml/badge.svg)](https://github.com/ElegAlex/PlumeNote/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://github.com/ElegAlex/PlumeNote/pkgs/container/plumenote)

[Démo](https://plumenote.fr) • [Documentation](./docs/) • [Installation](#-installation) • [Contribuer](./CONTRIBUTING.md)

</div>

---

## ✨ Fonctionnalités

- 📝 **Édition Markdown WYSIWYG** — Éditeur riche basé sur TipTap/ProseMirror
- 🔄 **Collaboration temps réel** — Synchronisation via CRDT (Yjs/Hocuspocus)
- 🔗 **Wikilinks** — Liens entre notes avec rétroliens automatiques
- 🔍 **Recherche full-text** — Recherche instantanée dans toutes vos notes
- 🏷️ **Tags et dossiers** — Organisation flexible de vos notes
- 🔐 **Permissions RBAC** — Contrôle d'accès granulaire par note/dossier
- 📊 **Tableaux dynamiques** — Requêtes type Dataview sur vos notes
- 🏠 **On-premise** — Hébergez sur votre propre infrastructure

## 🖼️ Aperçu

<div align="center">
<img src="docs/assets/screenshot.png" alt="PlumeNote Screenshot" width="800">
</div>

## 🚀 Installation

### Prérequis

- Docker 20.10+
- Docker Compose v2.0+
- 2 Go RAM minimum
- 10 Go d'espace disque

### Démarrage rapide

```bash
# 1. Cloner le repository
git clone https://github.com/ElegAlex/PlumeNote.git
cd PlumeNote/docker

# 2. Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos propres secrets

# 3. Lancer l'application
docker compose up -d

# L'application est accessible sur http://localhost
````

### Configuration

Copiez `.env.example` vers `.env` et configurez les variables :

|Variable|Description|Requis|
|---|---|---|
|`POSTGRES_PASSWORD`|Mot de passe PostgreSQL|✅|
|`JWT_SECRET`|Secret JWT (min 32 car.)|✅|
|`COOKIE_SECRET`|Secret cookies (min 32 car.)|✅|
|`CORS_ORIGINS`|Domaines autorisés|✅|
|`DOMAIN`|Votre domaine (pour SSL)|Pour HTTPS|

> 💡 Générez des secrets sécurisés avec : `openssl rand -base64 32`

### Activer HTTPS

```bash
# 1. Placez vos certificats dans docker/nginx/ssl/
#    - fullchain.pem
#    - privkey.pem

# 2. Configurez votre domaine dans .env
DOMAIN=votre-domaine.fr

# 3. Activez SSL
./scripts/enable-ssl.sh
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Nginx (Reverse Proxy)                   │
│                    HTTP/HTTPS • WebSocket • SSL                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│  Frontend │  │    API    │  │    Yjs    │
│   React   │  │  Fastify  │  │ Hocuspocus│
│  TipTap   │  │  REST API │  │   CRDT    │
└───────────┘  └─────┬─────┘  └─────┬─────┘
                     │              │
              ┌──────┴──────────────┘
              │
        ┌─────┴─────┐
        ▼           ▼
┌───────────┐  ┌───────────┐
│ PostgreSQL│  │   Redis   │
│   Data    │  │   Cache   │
└───────────┘  └───────────┘
```

### Stack technique

|Composant|Technologie|
|---|---|
|Frontend|React 18, TypeScript, Vite, Zustand|
|UI|Radix UI, Tailwind CSS|
|Éditeur|TipTap (ProseMirror)|
|Backend|Node.js, Fastify, TypeScript|
|CRDT|Yjs, Hocuspocus|
|Base de données|PostgreSQL 16, Prisma ORM|
|Cache|Redis 7|
|Infrastructure|Docker, Docker Compose, Nginx|

## 📖 Documentation

- [Guide d'installation détaillé](https://claude.ai/chat/docs/installation.md)
- [Configuration avancée](https://claude.ai/chat/docs/configuration.md)
- [Guide d'administration](https://claude.ai/chat/docs/admin.md)
- [API Reference](https://claude.ai/chat/docs/api.md)
- [Guide de développement](https://claude.ai/chat/docs/development.md)

## 🤝 Contribuer

Les contributions sont les bienvenues ! Consultez [CONTRIBUTING.md](https://claude.ai/chat/CONTRIBUTING.md) pour commencer.

### Développement local

```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev

# Lancer les tests
npm run test

# Linter
npm run lint
```

## 📄 License

Ce projet est sous licence [MIT](https://claude.ai/chat/LICENSE).

## 🙏 Remerciements

- [TipTap](https://tiptap.dev/) — Éditeur riche
- [Yjs](https://yjs.dev/) — CRDT pour la collaboration
- [Hocuspocus](https://hocuspocus.dev/) — Serveur WebSocket Yjs
- [Fastify](https://fastify.dev/) — Framework Node.js
- [Prisma](https://prisma.io/) — ORM TypeScript

---

<div align="center">

Fait avec ❤️ par [Alexandre Music Music Music Music Music Music Music Music Music Music Music](https://github.com/ElegAlex)

</div> ```

#### CONTRIBUTING.md (créer)

````markdown
# Guide de contribution

Merci de votre intérêt pour contribuer à PlumeNote ! Ce document vous guidera dans le processus de contribution.

## 📋 Table des matières

- [Code de conduite](#code-de-conduite)
- [Comment contribuer](#comment-contribuer)
- [Configuration de l'environnement](#configuration-de-lenvironnement)
- [Standards de code](#standards-de-code)
- [Process de Pull Request](#process-de-pull-request)

## Code de conduite

Ce projet adhère au [Contributor Covenant](https://www.contributor-covenant.org/). En participant, vous vous engagez à respecter ce code.

## Comment contribuer

### Signaler un bug

1. Vérifiez que le bug n'a pas déjà été signalé dans les [Issues](https://github.com/ElegAlex/PlumeNote/issues)
2. Créez une nouvelle issue en utilisant le template "Bug Report"
3. Incluez un maximum de détails : étapes de reproduction, comportement attendu vs observé, logs

### Proposer une fonctionnalité

1. Ouvrez une issue avec le template "Feature Request"
2. Décrivez le besoin et la solution envisagée
3. Attendez la validation avant de commencer le développement

### Soumettre du code

1. Forkez le repository
2. Créez une branche descriptive (`feature/ma-fonctionnalite` ou `fix/mon-bug`)
3. Développez en suivant les [standards de code](#standards-de-code)
4. Testez vos modifications
5. Soumettez une Pull Request

## Configuration de l'environnement

### Prérequis

- Node.js 20+
- npm 10+
- Docker & Docker Compose (pour les tests d'intégration)
- Git

### Installation

```bash
# Cloner votre fork
git clone https://github.com/VOTRE_USERNAME/PlumeNote.git
cd PlumeNote

# Ajouter le remote upstream
git remote add upstream https://github.com/ElegAlex/PlumeNote.git

# Installer les dépendances
npm install

# Configurer l'environnement de développement
cp .env.example .env.local
````

### Commandes utiles

```bash
# Lancer en développement
npm run dev

# Build complet
npm run build

# Tests unitaires
npm run test

# Tests avec couverture
npm run test:coverage

# Linter
npm run lint

# Formatter
npm run format

# Type check
npm run typecheck
```

### Base de données locale

```bash
# Démarrer PostgreSQL et Redis
docker compose -f docker/docker-compose.dev.yml up -d postgres redis

# Appliquer les migrations
npm run db:migrate --workspace=@plumenote/database

# Seed des données de test
npm run db:seed --workspace=@plumenote/database
```

## Standards de code

### TypeScript

- Strict mode activé
- Pas de `any` explicite (sauf cas exceptionnels documentés)
- Interfaces préférées aux types pour les objets
- JSDoc pour les fonctions exportées

### Style de code

Le projet utilise ESLint et Prettier. La configuration est dans les fichiers racine.

```bash
# Vérifier le style
npm run lint

# Corriger automatiquement
npm run lint:fix

# Formatter
npm run format
```

### Commits

Nous suivons [Conventional Commits](https://www.conventionalcommits.org/) :

```
type(scope): description

[body optionnel]

[footer optionnel]
```

Types autorisés :

- `feat` : Nouvelle fonctionnalité
- `fix` : Correction de bug
- `docs` : Documentation
- `style` : Formatage (pas de changement de code)
- `refactor` : Refactoring
- `test` : Ajout/modification de tests
- `chore` : Maintenance

Exemples :

```
feat(editor): ajouter le support des tableaux
fix(auth): corriger l'expiration des tokens JWT
docs(readme): mettre à jour les instructions d'installation
```

### Structure des fichiers

```
apps/
├── api/src/
│   ├── modules/          # Modules métier (notes, auth, etc.)
│   │   └── [module]/
│   │       ├── controller.ts
│   │       ├── service.ts
│   │       ├── repository.ts
│   │       └── schema.ts
│   ├── middleware/       # Middleware Express/Fastify
│   ├── infrastructure/   # Database, cache, etc.
│   └── shared/           # Utilitaires partagés
├── web/src/
│   ├── components/       # Composants React
│   ├── features/         # Logique métier
│   ├── hooks/            # Custom hooks
│   ├── stores/           # Zustand stores
│   └── services/         # API clients
└── yjs-server/src/       # Serveur Hocuspocus
```

### Tests

- Tests unitaires pour la logique métier
- Tests d'intégration pour les endpoints API
- Couverture minimale : 70%

```bash
# Lancer les tests
npm run test

# Avec couverture
npm run test:coverage

# Tests spécifiques
npm run test -- --grep "NoteService"
```

## Process de Pull Request

### Avant de soumettre

- [ ] Le code compile sans erreur (`npm run build`)
- [ ] Les tests passent (`npm run test`)
- [ ] Le linter ne signale pas d'erreur (`npm run lint`)
- [ ] La branche est à jour avec `main`
- [ ] Les commits suivent la convention

### Template de PR

```markdown
## Description

[Description claire des changements]

## Type de changement

- [ ] Bug fix
- [ ] Nouvelle fonctionnalité
- [ ] Breaking change
- [ ] Documentation

## Checklist

- [ ] J'ai testé mes changements localement
- [ ] J'ai ajouté des tests si nécessaire
- [ ] J'ai mis à jour la documentation si nécessaire
- [ ] Mes commits suivent la convention

## Screenshots (si applicable)

[Screenshots ou GIFs]
```

### Review process

1. Un mainteneur reviewera votre PR
2. Des modifications peuvent être demandées
3. Une fois approuvée, la PR sera mergée
4. La branche sera supprimée automatiquement

## 🙏 Merci !

Votre contribution fait vivre ce projet. Merci de prendre le temps d'améliorer PlumeNote !

```

#### LICENSE (créer - MIT)
```

MIT License

Copyright (c) 2025 Alexandre Music Music Music Music Music Music Music Music Music Music Music

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

````

#### CHANGELOG.md (créer)
```markdown
# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

### Ajouté
- Configuration CI/CD GitHub Actions
- Documentation open source (README, CONTRIBUTING, LICENSE)
- Scripts de déploiement automatisés

### Modifié
- Optimisation du build Docker (node au lieu de tsx)
- Health checks améliorés pour tous les conteneurs

### Corrigé
- Health check du conteneur web
- Tests WebSocket dans smoke-test.sh

## [0.1.0] - 2025-12-12

### Ajouté
- Éditeur Markdown WYSIWYG avec TipTap
- Collaboration temps réel via Yjs/Hocuspocus
- Système d'authentification JWT
- Gestion des notes et dossiers
- Wikilinks et rétroliens
- Recherche full-text PostgreSQL
- Permissions RBAC
- Déploiement Docker

[Unreleased]: https://github.com/ElegAlex/PlumeNote/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ElegAlex/PlumeNote/releases/tag/v0.1.0
````

### 3.5 Issue Templates GitHub

#### .github/ISSUE_TEMPLATE/bug_report.md (créer)

```markdown
---
name: Bug Report
about: Signaler un bug pour nous aider à améliorer PlumeNote
title: '[BUG] '
labels: bug
assignees: ''
---

## Description du bug

Une description claire et concise du bug.

## Étapes de reproduction

1. Aller sur '...'
2. Cliquer sur '...'
3. Faire défiler jusqu'à '...'
4. Voir l'erreur

## Comportement attendu

Une description claire de ce qui devrait se passer.

## Comportement observé

Une description de ce qui se passe réellement.

## Screenshots

Si applicable, ajoutez des captures d'écran.

## Environnement

- OS: [ex: Ubuntu 22.04, Windows 11, macOS 14]
- Navigateur: [ex: Chrome 120, Firefox 121]
- Version PlumeNote: [ex: 0.1.0]
- Docker: [ex: 24.0.7]

## Logs

```

Collez ici les logs pertinents

```

## Informations supplémentaires

Tout autre contexte utile.
```

#### .github/ISSUE_TEMPLATE/feature_request.md (créer)

```markdown
---
name: Feature Request
about: Proposer une nouvelle fonctionnalité
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## Problème à résoudre

Une description claire du problème. Ex: "Je suis frustré quand..."

## Solution proposée

Une description claire de ce que vous aimeriez voir.

## Alternatives considérées

Une description des alternatives ou fonctionnalités que vous avez envisagées.

## Contexte supplémentaire

Tout autre contexte, mockups ou screenshots.

## Checklist

- [ ] J'ai vérifié que cette fonctionnalité n'existe pas déjà
- [ ] J'ai vérifié qu'une issue similaire n'existe pas déjà
```

#### .github/PULL_REQUEST_TEMPLATE.md (créer)

```markdown
## Description

<!-- Décrivez vos changements en détail -->

## Motivation et contexte

<!-- Pourquoi ce changement est-il nécessaire ? Quel problème résout-il ? -->
<!-- S'il y a une issue liée, mentionnez-la : Fixes #123 -->

## Type de changement

<!-- Cochez les cases pertinentes -->

- [ ] 🐛 Bug fix (changement non-breaking qui corrige un problème)
- [ ] ✨ Nouvelle fonctionnalité (changement non-breaking qui ajoute une fonctionnalité)
- [ ] 💥 Breaking change (fix ou feature qui changerait le comportement existant)
- [ ] 📚 Documentation (changements de documentation uniquement)
- [ ] 🔧 Chore (maintenance, refactoring, etc.)

## Comment cela a-t-il été testé ?

<!-- Décrivez les tests que vous avez effectués -->

- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Tests manuels

## Checklist

- [ ] Mon code suit les conventions du projet
- [ ] J'ai effectué une self-review de mon code
- [ ] J'ai commenté mon code, particulièrement les parties complexes
- [ ] J'ai mis à jour la documentation si nécessaire
- [ ] Mes changements ne génèrent pas de nouveaux warnings
- [ ] J'ai ajouté des tests qui prouvent que ma fix/feature fonctionne
- [ ] Les tests existants passent avec mes changements

## Screenshots (si applicable)

<!-- Ajoutez des screenshots si pertinent -->
```

---

## 4. Plan d'implémentation

### Ordre des tâches

1. [ ] **Corriger le health check web** — Modifier Dockerfile et docker-compose.yml
2. [ ] **Améliorer smoke-test.sh** — Tests plus robustes et informatifs
3. [ ] **Créer .github/workflows/ci.yml** — CI pipeline
4. [ ] **Créer .github/workflows/release.yml** — Release pipeline
5. [ ] **Créer README.md** — Documentation principale
6. [ ] **Créer CONTRIBUTING.md** — Guide de contribution
7. [ ] **Créer LICENSE** — Licence MIT
8. [ ] **Créer CHANGELOG.md** — Historique des versions
9. [ ] **Créer les issue templates** — Bug report et feature request
10. [ ] **Créer le PR template** — Template de pull request
11. [ ] **Tester la CI localement** — Simuler le workflow
12. [ ] **Commit et push** — Avec message descriptif
13. [ ] **Déployer sur VPS** — Mettre à jour avec les corrections
14. [ ] **Vérifier les badges** — CI status dans README

### Risques et mitigations

|Risque|Probabilité|Impact|Mitigation|
|---|---|---|---|
|CI échoue sur GitHub|Moyenne|Moyen|Tester localement avec `act`|
|Health check web casse le déploiement|Faible|Moyen|Tester en local d'abord|
|Secrets manquants dans CI|Faible|Faible|Utiliser uniquement des variables publiques pour CI|

---

## 5. Notes pour Claude Code

### Commandes à exécuter

```bash
# 1. Modifier le Dockerfile web
cd /home/alex/Documents/REPO/KM/plumenote

# 2. Créer la structure .github
mkdir -p .github/workflows .github/ISSUE_TEMPLATE

# 3. Créer tous les fichiers (voir spec)

# 4. Tester le build Docker local
cd docker
docker compose build --no-cache web
docker compose up -d
sleep 30
docker compose ps  # Vérifier que web est "healthy"

# 5. Tester smoke-test.sh
./scripts/smoke-test.sh http://localhost

# 6. Commit
git add -A
git commit -m "feat: finalisation open source avec CI/CD et documentation

- fix(docker): health check pour le conteneur web
- feat(ci): GitHub Actions pour build, test et release
- feat(smoke-test): tests plus robustes et informatifs
- docs: README, CONTRIBUTING, LICENSE, CHANGELOG
- docs: issue templates et PR template"

git push

# 7. Déployer sur VPS
ssh root@vps-4e7622b4.vps.ovh.net "cd /root/PlumeNote && git pull && cd docker && docker compose build web && docker compose up -d"

# 8. Vérifier sur GitHub que la CI passe
```

### Points d'attention

- **Le README.md contient "Alexandre Music Music Music Music Music Music Music Music Music Music Music"** — Remplacer par ton vrai nom (Alexandre Berge)
- **Les badges dans le README** ne fonctionneront qu'après le premier push avec la CI
- **Le workflow release.yml** utilise `secrets.GITHUB_TOKEN` qui est automatiquement fourni par GitHub
- **Créer un dossier `docs/assets/`** et y placer un screenshot pour le README (ou commenter la ligne)

### Structure finale des fichiers à créer

```
.github/
├── workflows/
│   ├── ci.yml
│   └── release.yml
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   └── feature_request.md
└── PULL_REQUEST_TEMPLATE.md

README.md (remplacer)
CONTRIBUTING.md (créer)
LICENSE (créer)
CHANGELOG.md (créer)

apps/web/Dockerfile (modifier)
docker/docker-compose.yml (vérifier health check web)
docker/scripts/smoke-test.sh (remplacer)
```

---

## 6. Validation finale

Une fois SPEC-003 implémentée, vérifier :

```bash
# 1. Health checks tous healthy
docker compose ps
# Tous les services doivent être "healthy" ou "Up" sans "(unhealthy)"

# 2. Smoke tests passent
./scripts/smoke-test.sh http://localhost
# Résultat: 11/11 tests passés

# 3. CI GitHub passe
# Vérifier https://github.com/ElegAlex/PlumeNote/actions

# 4. Documentation accessible
# Vérifier que README.md s'affiche correctement sur GitHub

# 5. Issue templates fonctionnels
# Créer une issue de test et vérifier les templates
```

---

## 7. Prompt autonome pour Claude Code

```
Tu es en mode autonome. Lis et implémente intégralement docs/specs/SPEC-003-opensource-finalization.md.

CONTEXTE :
- SPEC-001 et SPEC-002 ont été implémentées avec succès
- Le projet est fonctionnel mais manque de polish pour l'open source
- Le conteneur web a un health check défaillant
- Il n'y a pas de CI/CD ni de documentation communautaire

INSTRUCTIONS :
1. Lis d'abord le document complet
2. Corrige le health check du conteneur web (Dockerfile + docker-compose.yml)
3. Remplace smoke-test.sh par la version améliorée
4. Crée la structure .github/ avec les workflows CI et release
5. Crée les fichiers de documentation (README, CONTRIBUTING, LICENSE, CHANGELOG)
6. Crée les issue templates et PR template
7. IMPORTANT : Dans README.md, remplace "Alexandre Music Music Music Music Music Music Music Music Music Music Music" par "Alexandre Berge"
8. Teste le build Docker local : docker compose build web && docker compose up -d
9. Vérifie que tous les conteneurs sont healthy après 60 secondes
10. Exécute smoke-test.sh et vérifie que tous les tests passent
11. Commit avec un message descriptif et push
12. Déploie sur le VPS : ssh root@vps-4e7622b4.vps.ovh.net
13. Vérifie que https://plumenote.fr fonctionne avec tous les health checks OK

CONTRAINTES :
- Ne me pose aucune question, prends les décisions toi-même
- Si un test échoue, analyse et corrige avant de continuer
- Crée un dossier docs/assets/ vide avec un .gitkeep pour le screenshot du README
- Les workflows GitHub utilisent uniquement des variables/secrets standard (pas de config manuelle requise)

VALIDATION FINALE :
Avant de terminer, vérifie :
- docker compose ps → tous les services "healthy" ou "Up"
- ./scripts/smoke-test.sh → tous les tests passent
- Les fichiers .github/ existent et sont correctement formatés
- README.md s'affiche correctement (pas de markdown cassé)

À la fin, fais un résumé de tout ce qui a été fait.

GO.
```

---

Tu veux que je génère le fichier `SPEC-003-opensource-finalization.md` prêt à télécharger ?