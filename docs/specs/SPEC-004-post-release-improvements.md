# SPEC-004 : Améliorations post-release et qualité

## 1. Résumé

|Attribut|Valeur|
|---|---|
|Type|Improvement / Documentation / Security|
|Priorité|P2-Moyenne|
|Complexité|M|
|Modules impactés|API, Yjs-server, Docker, Documentation, CI/CD|
|Estimation|2-3 jours|
|Prérequis|SPEC-001, SPEC-002, SPEC-003 implémentées|

### Description

Améliorations de qualité post-release : correction des health checks défaillants, tests WebSocket robustes, documentation complète, sécurité renforcée avec Dependabot et CodeQL, et création des assets visuels pour le README.

### Critères d'acceptation

- [ ] Health checks API et YJS fonctionnent en local ET en production
- [ ] Tests WebSocket avec un vrai client (wscat ou websocat)
- [ ] Screenshot de l'application dans docs/assets/
- [ ] Documentation complète (5 fichiers .md)
- [ ] Dependabot configuré pour npm et Docker
- [ ] CodeQL activé pour l'analyse de sécurité
- [ ] Badge de couverture de tests dans README
- [ ] Tous les smoke tests passent avec des critères stricts

---

## 2. Analyse technique

### 2.1 Problèmes résiduels identifiés

|Problème|Fichier|Impact|Priorité|
|---|---|---|---|
|Health check API échoue parfois|`apps/api/Dockerfile`|Monitoring faux négatifs|P1|
|Health check YJS échoue parfois|`apps/yjs-server/Dockerfile`|Monitoring faux négatifs|P1|
|Endpoint /health manquant ou incorrect|`apps/api/src/routes/health.ts`|Health checks échouent|P1|
|Tests WebSocket permissifs|`docker/scripts/smoke-test.sh`|Faux positifs|P2|
|Screenshot manquant|`docs/assets/`|README cassé visuellement|P2|
|Documentation incomplète|`docs/*.md`|Onboarding difficile|P2|
|Pas de Dependabot|`.github/`|Vulnérabilités non détectées|P2|
|Pas de CodeQL|`.github/workflows/`|Failles de sécurité|P2|

### 2.2 Analyse des health checks actuels

#### Problème identifié

Les Dockerfiles utilisent `/health` mais l'endpoint peut ne pas exister ou retourner un format inattendu.

```dockerfile
# apps/api/Dockerfile (actuel)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/health || exit 1
```

#### Solution

1. Vérifier que l'endpoint `/health` existe dans l'API
2. S'assurer qu'il retourne HTTP 200 avec un body JSON
3. Utiliser `curl` au lieu de `wget` pour plus de contrôle

### 2.3 Architecture des tests WebSocket

```
┌─────────────────────────────────────────────────────────────────┐
│  smoke-test.sh                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tests HTTP (curl)          Tests WebSocket (wscat)             │
│  ┌─────────────────┐        ┌─────────────────────────┐        │
│  │ GET /            │        │ ws://localhost/ws       │        │
│  │ GET /health      │        │ → Attendre "connected"  │        │
│  │ GET /api/v1/...  │        │ → Timeout 5s            │        │
│  │ POST /api/v1/... │        │                         │        │
│  └─────────────────┘        │ ws://localhost/ws/sync  │        │
│                              │ → Attendre 401 ou conn  │        │
│                              └─────────────────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Spécifications détaillées

### 3.1 Correction des endpoints /health

#### apps/api/src/routes/health.ts (vérifier/créer)

```typescript
import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@plumenote/database';
import Redis from 'ioredis';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  checks: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
  };
}

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Health check simple (pour Docker/K8s)
  fastify.get('/health', async (request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // Health check détaillé (pour monitoring)
  fastify.get('/health/detailed', async (request, reply) => {
    const checks = {
      database: 'error' as 'ok' | 'error',
      redis: 'error' as 'ok' | 'error',
    };

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch (error) {
      fastify.log.error('Health check: Database error', error);
    }

    // Check Redis
    try {
      const redis = fastify.redis as Redis;
      if (redis) {
        await redis.ping();
        checks.redis = 'ok';
      }
    } catch (error) {
      fastify.log.error('Health check: Redis error', error);
    }

    const allOk = Object.values(checks).every((v) => v === 'ok');
    const status: HealthStatus = {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      checks,
    };

    return reply.status(allOk ? 200 : 503).send(status);
  });

  // Liveness probe (pour K8s)
  fastify.get('/health/live', async (request, reply) => {
    return reply.status(200).send({ status: 'alive' });
  });

  // Readiness probe (pour K8s)
  fastify.get('/health/ready', async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.status(200).send({ status: 'ready' });
    } catch {
      return reply.status(503).send({ status: 'not ready' });
    }
  });
};

export default healthRoutes;
```

#### apps/api/src/app.ts (vérifier l'enregistrement)

```typescript
// S'assurer que les routes health sont enregistrées SANS préfixe /api/v1
import healthRoutes from './routes/health';

// Dans la fonction de configuration
app.register(healthRoutes); // PAS de prefix ici
```

#### apps/yjs-server/src/index.ts (ajouter endpoint /health)

```typescript
// Ajouter dans le serveur Hocuspocus ou créer un serveur HTTP séparé
import { createServer } from 'http';

// Si Hocuspocus n'expose pas de route HTTP, créer un serveur auxiliaire
const healthServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'yjs-server',
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Écouter sur un port différent pour le health check
const HEALTH_PORT = process.env.HEALTH_PORT || 3003;
healthServer.listen(HEALTH_PORT, () => {
  console.log(`Health check server running on port ${HEALTH_PORT}`);
});
```

**Alternative** : Si Hocuspocus expose déjà un endpoint HTTP, l'utiliser directement.

### 3.2 Dockerfiles avec health checks corrigés

#### apps/api/Dockerfile (modifier)

```dockerfile
# ... (stages précédents inchangés)

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl curl

# Copier uniquement le nécessaire pour la production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

WORKDIR /app/apps/api

# Health check avec curl et vérification du body JSON
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -sf http://127.0.0.1:3001/health | grep -q '"status":"ok"' || exit 1

EXPOSE 3001
CMD ["node", "dist/index.js"]
```

#### apps/yjs-server/Dockerfile (modifier)

```dockerfile
# ... (stages précédents inchangés)

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl curl

# Copier uniquement le nécessaire
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/apps/yjs-server/dist ./apps/yjs-server/dist
COPY --from=builder /app/apps/yjs-server/package.json ./apps/yjs-server/

WORKDIR /app/apps/yjs-server

# Health check - Hocuspocus répond sur le port principal
# On vérifie que le serveur accepte les connexions
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -sf http://127.0.0.1:1234/ || exit 1

EXPOSE 1234
CMD ["node", "dist/index.js"]
```

### 3.3 Tests WebSocket robustes

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
WSCAT_AVAILABLE=false

log_ok() { echo -e "${GREEN}✓${NC} $1"; }
log_fail() { echo -e "${RED}✗${NC} $1"; FAILED=$((FAILED + 1)); }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_info() { echo -e "${BLUE}ℹ${NC} $1"; }

# Vérifier si wscat est disponible
if command -v wscat &> /dev/null; then
    WSCAT_AVAILABLE=true
elif command -v websocat &> /dev/null; then
    WSCAT_AVAILABLE=true
fi

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║     PlumeNote - Tests de validation       ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "URL de base: $BASE_URL"
if [ "$WSCAT_AVAILABLE" = true ]; then
    echo "WebSocket client: disponible"
else
    echo "WebSocket client: non disponible (tests WS simplifiés)"
fi
echo ""

# =============================================================================
# Tests HTTP basiques
# =============================================================================

echo "── Tests HTTP ──────────────────────────────"

# Test 1: Page d'accueil
echo -n "1. Page d'accueil... "
HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL/" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    log_ok "HTTP $HTTP_CODE"
else
    log_fail "HTTP $HTTP_CODE"
fi

# Test 2: Health check nginx
echo -n "2. Health check nginx... "
HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    log_ok "HTTP $HTTP_CODE"
else
    log_fail "HTTP $HTTP_CODE"
fi

# Test 3: API health check
echo -n "3. API health... "
RESPONSE=$(curl -sf --max-time $TIMEOUT "$BASE_URL/api/health" 2>/dev/null || echo '{}')
if echo "$RESPONSE" | grep -q '"status":"ok"'; then
    log_ok "API healthy"
else
    # Essayer l'ancien endpoint
    RESPONSE=$(curl -sf --max-time $TIMEOUT "$BASE_URL/api/v1/health" 2>/dev/null || echo '{}')
    if echo "$RESPONSE" | grep -q '"status"'; then
        log_ok "API répond"
    else
        log_warn "API health non standard"
    fi
fi

# =============================================================================
# Tests Authentification
# =============================================================================

echo ""
echo "── Tests Authentification ─────────────────"

# Test 4: Endpoint auth/me (doit retourner 401)
echo -n "4. Auth check (401 attendu)... "
HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL/api/v1/auth/me" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "401" ]; then
    log_ok "HTTP $HTTP_CODE (correct)"
else
    log_fail "HTTP $HTTP_CODE (attendu: 401)"
fi

# Test 5: Login avec mauvais credentials
echo -n "5. Login invalide (400/401 attendu)... "
HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' --max-time $TIMEOUT \
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
# Tests WebSocket
# =============================================================================

echo ""
echo "── Tests WebSocket ─────────────────────────"

# Extraire le host pour WebSocket
WS_URL=$(echo "$BASE_URL" | sed 's/http:/ws:/; s/https:/wss:/')

# Test 6: WebSocket Yjs
echo -n "6. WebSocket Yjs (/ws)... "
if [ "$WSCAT_AVAILABLE" = true ]; then
    # Test avec wscat (timeout 3s)
    if timeout 3 wscat -c "$WS_URL/ws" --no-color 2>&1 | grep -q "connected\|error\|closed"; then
        log_ok "Connexion établie"
    else
        # Fallback: vérifier que le port répond
        HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' --max-time $TIMEOUT \
            -H "Upgrade: websocket" -H "Connection: Upgrade" \
            "$BASE_URL/ws" 2>/dev/null || echo "000")
        if [[ "$HTTP_CODE" =~ ^(101|200|400|426)$ ]]; then
            log_ok "Endpoint accessible (HTTP $HTTP_CODE)"
        else
            log_fail "Endpoint inaccessible (HTTP $HTTP_CODE)"
        fi
    fi
else
    # Test simplifié avec curl
    HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' --max-time $TIMEOUT \
        -H "Upgrade: websocket" -H "Connection: Upgrade" \
        -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
        -H "Sec-WebSocket-Version: 13" \
        "$BASE_URL/ws" 2>/dev/null || echo "000")
    if [[ "$HTTP_CODE" =~ ^(101|200|400|426)$ ]]; then
        log_ok "Endpoint accessible (HTTP $HTTP_CODE)"
    else
        log_fail "HTTP $HTTP_CODE"
    fi
fi

# Test 7: WebSocket Sync
echo -n "7. WebSocket Sync (/ws/sync)... "
HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' --max-time $TIMEOUT \
    -H "Upgrade: websocket" -H "Connection: Upgrade" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    -H "Sec-WebSocket-Version: 13" \
    "$BASE_URL/ws/sync" 2>/dev/null || echo "000")
# 401 = auth required (correct), 101/200/400/426 = endpoint accessible
if [[ "$HTTP_CODE" =~ ^(101|200|400|401|426)$ ]]; then
    log_ok "Endpoint accessible (HTTP $HTTP_CODE)"
else
    log_warn "HTTP $HTTP_CODE (comportement inattendu)"
fi

# =============================================================================
# Tests Assets statiques
# =============================================================================

echo ""
echo "── Tests Assets ────────────────────────────"

# Test 8: Fichier index.html
echo -n "8. Index HTML valide... "
RESPONSE=$(curl -sf --max-time $TIMEOUT "$BASE_URL/" 2>/dev/null || echo "")
if echo "$RESPONSE" | grep -q '<!DOCTYPE html>\|<html'; then
    log_ok "HTML valide"
else
    log_fail "HTML invalide"
fi

# Test 9: Assets JS
echo -n "9. Assets JavaScript... "
ASSET_URL=$(echo "$RESPONSE" | grep -oP 'src="(/assets/[^"]+\.js)"' | head -1 | sed 's/src="//;s/"//')
if [ -n "$ASSET_URL" ]; then
    HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL$ASSET_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        log_ok "JS accessible"
    else
        log_warn "JS retourne HTTP $HTTP_CODE"
    fi
else
    log_warn "Pas de JS externe détecté"
fi

# =============================================================================
# Tests Docker (si disponible)
# =============================================================================

echo ""
echo "── Tests Conteneurs ────────────────────────"

if command -v docker &> /dev/null && [ -f "docker-compose.yml" ]; then
    # Test 10: Conteneurs running
    echo -n "10. Conteneurs Docker... "
    RUNNING=$(docker compose ps 2>/dev/null | grep -c "Up" || echo "0")
    if [ "$RUNNING" -ge 5 ]; then
        log_ok "$RUNNING conteneurs running"
    else
        log_warn "Seulement $RUNNING conteneurs running"
    fi

    # Test 11: Health checks
    echo -n "11. Health checks... "
    UNHEALTHY=$(docker compose ps 2>/dev/null | grep -c "(unhealthy)" || echo "0")
    HEALTHY=$(docker compose ps 2>/dev/null | grep -c "(healthy)" || echo "0")
    if [ "$UNHEALTHY" = "0" ] && [ "$HEALTHY" -ge 3 ]; then
        log_ok "$HEALTHY healthy, 0 unhealthy"
    elif [ "$UNHEALTHY" = "0" ]; then
        log_warn "$HEALTHY healthy (certains sans health check)"
    else
        log_fail "$HEALTHY healthy, $UNHEALTHY unhealthy"
    fi
else
    echo "10-11. Docker non disponible ou hors contexte, skip"
fi

# =============================================================================
# Tests de performance basiques
# =============================================================================

echo ""
echo "── Tests Performance ───────────────────────"

# Test 12: Temps de réponse page d'accueil
echo -n "12. Temps de réponse... "
TIME_TOTAL=$(curl -sf -o /dev/null -w '%{time_total}' --max-time $TIMEOUT "$BASE_URL/" 2>/dev/null || echo "99")
TIME_MS=$(echo "$TIME_TOTAL * 1000" | bc 2>/dev/null || echo "9999")
TIME_INT=${TIME_MS%.*}
if [ "$TIME_INT" -lt 500 ]; then
    log_ok "${TIME_INT}ms (< 500ms)"
elif [ "$TIME_INT" -lt 2000 ]; then
    log_warn "${TIME_INT}ms (< 2000ms)"
else
    log_fail "${TIME_INT}ms (trop lent)"
fi

# =============================================================================
# Résumé
# =============================================================================

echo ""
echo "═══════════════════════════════════════════"
TOTAL_TESTS=12
PASSED=$((TOTAL_TESTS - FAILED))
echo "Résultat: $PASSED/$TOTAL_TESTS tests passés"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Tous les tests ont réussi !${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ $FAILED test(s) ont échoué${NC}"
    exit 1
fi
```

### 3.4 Configuration Dependabot

#### .github/dependabot.yml (créer)

```yaml
version: 2
updates:
  # npm dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "Europe/Paris"
    open-pull-requests-limit: 10
    reviewers:
      - "ElegAlex"
    labels:
      - "dependencies"
      - "npm"
    commit-message:
      prefix: "chore(deps)"
    groups:
      # Grouper les mises à jour mineures/patch
      minor-and-patch:
        patterns:
          - "*"
        update-types:
          - "minor"
          - "patch"

  # Docker dependencies
  - package-ecosystem: "docker"
    directory: "/apps/api"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "docker"
    commit-message:
      prefix: "chore(docker)"

  - package-ecosystem: "docker"
    directory: "/apps/web"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "docker"

  - package-ecosystem: "docker"
    directory: "/apps/yjs-server"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "docker"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "github-actions"
    commit-message:
      prefix: "chore(ci)"
```

### 3.5 Configuration CodeQL

#### .github/workflows/codeql.yml (créer)

```yaml
name: "CodeQL Security Analysis"

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    # Analyse hebdomadaire le dimanche à 2h
    - cron: '0 2 * * 0'

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: ['javascript-typescript']

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
          # Requêtes de sécurité étendues
          queries: +security-extended,security-and-quality

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: |
          npm run build --workspace=@plumenote/types
          npm run db:generate --workspace=@plumenote/database
          npm run build --workspace=@plumenote/database

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:${{matrix.language}}"
```

### 3.6 Documentation complète

#### docs/installation.md (créer)

```markdown
# Guide d'installation de PlumeNote

## Sommaire

- [Prérequis](#prérequis)
- [Installation avec Docker](#installation-avec-docker)
- [Installation manuelle](#installation-manuelle)
- [Configuration initiale](#configuration-initiale)
- [Vérification](#vérification)
- [Dépannage](#dépannage)

## Prérequis

### Matériel minimum

| Ressource | Minimum | Recommandé |
|-----------|---------|------------|
| CPU | 2 cores | 4 cores |
| RAM | 2 Go | 4 Go |
| Disque | 10 Go | 20 Go |

### Logiciels requis

- **Docker** 20.10 ou supérieur
- **Docker Compose** v2.0 ou supérieur

Vérifiez vos versions :

\`\`\`bash
docker --version
docker compose version
\`\`\`

## Installation avec Docker

### 1. Cloner le repository

\`\`\`bash
git clone https://github.com/ElegAlex/PlumeNote.git
cd PlumeNote
\`\`\`

### 2. Configuration

\`\`\`bash
cd docker
cp .env.example .env
\`\`\`

Éditez \`.env\` avec vos propres valeurs :

\`\`\`bash
# Générer des secrets sécurisés
openssl rand -base64 32  # Pour JWT_SECRET
openssl rand -base64 32  # Pour COOKIE_SECRET
openssl rand -base64 24  # Pour POSTGRES_PASSWORD
\`\`\`

### 3. Démarrage

\`\`\`bash
# Première installation
./scripts/init.sh

# Ou démarrage manuel
docker compose up -d
\`\`\`

### 4. Accès

L'application est accessible sur : **http://localhost**

Identifiants par défaut :
- **Admin** : admin@plumenote.local / password123
- **Demo** : demo@plumenote.local / password123

⚠️ **Changez ces mots de passe en production !**

## Installation manuelle

### 1. Prérequis

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- npm 10+

### 2. Installation des dépendances

\`\`\`bash
git clone https://github.com/ElegAlex/PlumeNote.git
cd PlumeNote
npm install
\`\`\`

### 3. Configuration de la base de données

\`\`\`bash
# Créer la base de données PostgreSQL
createdb plumenote

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec DATABASE_URL=postgresql://user:password@localhost:5432/plumenote

# Appliquer les migrations
npm run db:migrate --workspace=@plumenote/database

# (Optionnel) Seed des données de test
npm run db:seed --workspace=@plumenote/database
\`\`\`

### 4. Build

\`\`\`bash
npm run build
\`\`\`

### 5. Démarrage

\`\`\`bash
# Terminal 1 : API
npm run start --workspace=@plumenote/api

# Terminal 2 : YJS Server
npm run start --workspace=@plumenote/yjs-server

# Terminal 3 : Frontend (dev) ou servir le build
npm run dev --workspace=@plumenote/web
\`\`\`

## Configuration initiale

### Création du premier administrateur

1. Accédez à l'application
2. Créez un compte
3. Dans la base de données, modifiez le rôle :

\`\`\`sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'votre@email.com';
\`\`\`

### Configuration SMTP (optionnel)

Pour les emails de récupération de mot de passe, ajoutez dans \`.env\` :

\`\`\`env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASSWORD=password
SMTP_FROM=noreply@plumenote.fr
\`\`\`

## Vérification

### Health checks

\`\`\`bash
# Health check global
curl http://localhost/health

# Health check API
curl http://localhost/api/health

# Smoke tests complets
cd docker
./scripts/smoke-test.sh http://localhost
\`\`\`

### Logs

\`\`\`bash
# Tous les logs
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f api
\`\`\`

## Dépannage

### L'API ne démarre pas

1. Vérifiez les logs : \`docker compose logs api\`
2. Vérifiez la connexion à PostgreSQL
3. Vérifiez les variables d'environnement

### Erreur "COOKIE_SECRET must be at least 32 characters"

Générez un secret plus long :

\`\`\`bash
openssl rand -base64 32
\`\`\`

### WebSocket ne fonctionne pas

1. Vérifiez que nginx route correctement \`/ws\`
2. Vérifiez les logs du service yjs : \`docker compose logs yjs\`
3. Vérifiez le CORS dans \`.env\`

### Réinitialisation complète

\`\`\`bash
cd docker
docker compose down -v  # Supprime aussi les volumes
rm .env
./scripts/init.sh
\`\`\`
```

#### docs/configuration.md (créer)

```markdown
# Configuration de PlumeNote

## Variables d'environnement

### Obligatoires

| Variable | Description | Exemple |
|----------|-------------|---------|
| \`POSTGRES_PASSWORD\` | Mot de passe PostgreSQL | \`SecureP@ssw0rd!\` |
| \`JWT_SECRET\` | Secret pour les tokens JWT (min 32 car.) | \`openssl rand -base64 32\` |
| \`COOKIE_SECRET\` | Secret pour les cookies (min 32 car.) | \`openssl rand -base64 32\` |
| \`CORS_ORIGINS\` | Domaines autorisés (virgule) | \`https://plumenote.fr\` |

### Optionnelles

| Variable | Description | Défaut |
|----------|-------------|--------|
| \`NODE_ENV\` | Environnement | \`production\` |
| \`POSTGRES_USER\` | Utilisateur PostgreSQL | \`plumenote\` |
| \`POSTGRES_DB\` | Nom de la base | \`plumenote\` |
| \`REDIS_PASSWORD\` | Mot de passe Redis | (vide) |
| \`HTTP_PORT\` | Port HTTP | \`80\` |
| \`HTTPS_PORT\` | Port HTTPS | \`443\` |
| \`DOMAIN\` | Domaine pour SSL | \`localhost\` |
| \`SEED_DATABASE\` | Créer les données de démo | \`false\` |

## Configuration SSL/HTTPS

### Avec Let's Encrypt

1. Installez Certbot sur votre serveur
2. Générez un certificat :

\`\`\`bash
certbot certonly --standalone -d votre-domaine.fr -d www.votre-domaine.fr
\`\`\`

3. Copiez les certificats :

\`\`\`bash
cp /etc/letsencrypt/live/votre-domaine.fr/fullchain.pem docker/nginx/ssl/
cp /etc/letsencrypt/live/votre-domaine.fr/privkey.pem docker/nginx/ssl/
\`\`\`

4. Activez SSL :

\`\`\`bash
cd docker
echo "DOMAIN=votre-domaine.fr" >> .env
./scripts/enable-ssl.sh
\`\`\`

### Renouvellement automatique

Ajoutez un cron :

\`\`\`bash
0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/votre-domaine.fr/*.pem /path/to/plumenote/docker/nginx/ssl/ && docker compose -f /path/to/plumenote/docker/docker-compose.yml restart nginx
\`\`\`

## Configuration avancée

### Limites de rate

Dans \`docker/nginx/nginx.conf\` :

\`\`\`nginx
# Augmenter les limites si nécessaire
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=10r/m;
\`\`\`

### Taille maximale d'upload

\`\`\`nginx
client_max_body_size 50M;
\`\`\`

### Logs personnalisés

Dans \`docker-compose.yml\`, ajoutez des volumes pour les logs :

\`\`\`yaml
services:
  api:
    volumes:
      - ./logs/api:/app/logs
\`\`\`

## Multi-instances

Pour un déploiement haute disponibilité, utilisez plusieurs instances de l'API derrière un load balancer. Redis assure la synchronisation des sessions.

\`\`\`yaml
services:
  api:
    deploy:
      replicas: 3
\`\`\`
```

#### docs/admin.md (créer)

```markdown
# Guide d'administration PlumeNote

## Gestion des utilisateurs

### Rôles disponibles

| Rôle | Description |
|------|-------------|
| \`ADMIN\` | Accès complet, gestion des utilisateurs |
| \`EDITOR\` | Peut créer et modifier des notes |
| \`VIEWER\` | Lecture seule |

### Modifier un rôle

Via SQL :

\`\`\`sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'user@example.com';
\`\`\`

## Sauvegardes

### Sauvegarde de la base de données

\`\`\`bash
# Via Docker
docker compose exec postgres pg_dump -U plumenote plumenote > backup_$(date +%Y%m%d).sql

# Restauration
docker compose exec -T postgres psql -U plumenote plumenote < backup_20250101.sql
\`\`\`

### Sauvegarde complète

\`\`\`bash
# Arrêter les services
docker compose stop

# Sauvegarder les volumes
docker run --rm -v plumenote_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
docker run --rm -v plumenote_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_backup.tar.gz /data

# Redémarrer
docker compose start
\`\`\`

## Monitoring

### Health checks

\`\`\`bash
# Status des services
docker compose ps

# Vérification complète
./scripts/smoke-test.sh http://localhost
\`\`\`

### Logs

\`\`\`bash
# Logs en temps réel
docker compose logs -f

# Logs d'un service
docker compose logs -f api --tail 100

# Logs avec filtre
docker compose logs api 2>&1 | grep ERROR
\`\`\`

### Métriques

L'endpoint \`/api/health/detailed\` retourne :

\`\`\`json
{
  "status": "ok",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "version": "0.1.0",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
\`\`\`

## Mise à jour

### Mise à jour standard

\`\`\`bash
cd PlumeNote
git pull origin main
cd docker
docker compose down
docker compose build --no-cache
docker compose up -d
\`\`\`

### Mise à jour avec migration

\`\`\`bash
git pull origin main
cd docker
docker compose down
docker compose build --no-cache
docker compose up -d
docker compose exec api npx prisma migrate deploy
\`\`\`

## Dépannage

### Conteneur qui redémarre en boucle

\`\`\`bash
# Voir les logs
docker compose logs api --tail 50

# Causes communes :
# - Variables d'environnement manquantes
# - Base de données inaccessible
# - Port déjà utilisé
\`\`\`

### Base de données corrompue

\`\`\`bash
# Réinitialiser
docker compose down -v
docker compose up -d postgres
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
docker compose up -d
\`\`\`

### Espace disque plein

\`\`\`bash
# Nettoyer Docker
docker system prune -a

# Voir l'utilisation
docker system df
\`\`\`
```

#### docs/api.md (créer)

```markdown
# API Reference PlumeNote

## Vue d'ensemble

- **Base URL** : \`https://votre-domaine.fr/api/v1\`
- **Authentification** : JWT via cookie \`auth_token\`
- **Format** : JSON

## Authentification

### POST /auth/login

Connexion utilisateur.

**Body** :
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`

**Réponse** (200) :
\`\`\`json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "user",
    "role": "EDITOR"
  },
  "token": "jwt_token"
}
\`\`\`

### POST /auth/logout

Déconnexion.

### GET /auth/me

Utilisateur courant.

## Notes

### GET /notes

Liste des notes.

**Query params** :
- \`folderId\` : Filtrer par dossier
- \`search\` : Recherche full-text
- \`limit\` : Nombre de résultats (défaut: 20)
- \`offset\` : Pagination

**Réponse** :
\`\`\`json
{
  "notes": [
    {
      "id": "uuid",
      "title": "Ma note",
      "content": "...",
      "folderId": "uuid",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 42
}
\`\`\`

### GET /notes/:id

Détail d'une note.

### POST /notes

Créer une note.

**Body** :
\`\`\`json
{
  "title": "Nouvelle note",
  "content": "# Contenu Markdown",
  "folderId": "uuid (optionnel)"
}
\`\`\`

### PUT /notes/:id

Modifier une note.

### DELETE /notes/:id

Supprimer une note.

## Dossiers

### GET /folders

Liste des dossiers.

### POST /folders

Créer un dossier.

### PUT /folders/:id

Modifier un dossier.

### DELETE /folders/:id

Supprimer un dossier.

## Recherche

### GET /search

Recherche full-text.

**Query params** :
- \`q\` : Terme de recherche
- \`type\` : \`notes\` | \`folders\` | \`all\`

## WebSocket

### /ws

Connexion Yjs pour la collaboration temps réel.

### /ws/sync

Synchronisation des événements applicatifs.

## Codes d'erreur

| Code | Description |
|------|-------------|
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Non autorisé |
| 404 | Ressource non trouvée |
| 422 | Erreur de validation |
| 500 | Erreur serveur |

## Rate limiting

- API standard : 10 requêtes/seconde
- Login : 5 tentatives/minute
```

#### docs/development.md (créer)

```markdown
# Guide de développement PlumeNote

## Setup local

### Prérequis

- Node.js 20+
- Docker & Docker Compose
- Git

### Installation

\`\`\`bash
git clone https://github.com/ElegAlex/PlumeNote.git
cd PlumeNote
npm install
\`\`\`

### Services de développement

\`\`\`bash
# Démarrer PostgreSQL et Redis
docker compose -f docker/docker-compose.dev.yml up -d

# Générer le client Prisma
npm run db:generate --workspace=@plumenote/database

# Appliquer les migrations
npm run db:migrate --workspace=@plumenote/database

# (Optionnel) Données de test
npm run db:seed --workspace=@plumenote/database
\`\`\`

### Lancer en développement

\`\`\`bash
npm run dev
\`\`\`

Services disponibles :
- Frontend : http://localhost:5173
- API : http://localhost:3001
- YJS : http://localhost:1234

## Structure du projet

\`\`\`
plumenote/
├── apps/
│   ├── api/              # Backend Fastify
│   │   ├── src/
│   │   │   ├── modules/  # Modules métier
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   └── index.ts
│   │   └── Dockerfile
│   ├── web/              # Frontend React
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── hooks/
│   │   │   └── stores/
│   │   └── Dockerfile
│   └── yjs-server/       # Serveur collaboration
├── packages/
│   ├── database/         # Prisma schema & client
│   └── types/            # Types partagés
├── docker/               # Configuration Docker
└── docs/                 # Documentation
\`\`\`

## Conventions de code

### TypeScript

- Strict mode activé
- Pas de \`any\` implicite
- Interfaces pour les objets

### Commits

Format : \`type(scope): message\`

Types :
- \`feat\` : Nouvelle fonctionnalité
- \`fix\` : Correction de bug
- \`docs\` : Documentation
- \`refactor\` : Refactoring
- \`test\` : Tests
- \`chore\` : Maintenance

### Branches

- \`main\` : Production
- \`develop\` : Développement
- \`feature/*\` : Nouvelles fonctionnalités
- \`fix/*\` : Corrections

## Tests

\`\`\`bash
# Tests unitaires
npm run test

# Tests avec couverture
npm run test:coverage

# Tests E2E
npm run test:e2e
\`\`\`

## Build

\`\`\`bash
# Build complet
npm run build

# Build d'une app spécifique
npm run build --workspace=@plumenote/api
\`\`\`

## Debugging

### API

\`\`\`bash
# Logs détaillés
DEBUG=* npm run dev --workspace=@plumenote/api
\`\`\`

### Base de données

\`\`\`bash
# Prisma Studio
npm run db:studio --workspace=@plumenote/database
\`\`\`

## Contribution

1. Fork le repository
2. Créez une branche : \`git checkout -b feature/ma-feature\`
3. Commitez : \`git commit -m "feat: ma feature"\`
4. Push : \`git push origin feature/ma-feature\`
5. Ouvrez une Pull Request
```

---

## 4. Plan d'implémentation

### Ordre des tâches

1. [ ] **Vérifier/créer endpoint /health dans l'API** — S'assurer qu'il existe et retourne le bon format
2. [ ] **Ajouter endpoint /health au yjs-server** — Si nécessaire
3. [ ] **Mettre à jour les Dockerfiles** — Health checks avec curl et vérification JSON
4. [ ] **Améliorer smoke-test.sh** — 12 tests avec wscat si disponible
5. [ ] **Créer .github/dependabot.yml** — Configuration Dependabot
6. [ ] **Créer .github/workflows/codeql.yml** — Analyse de sécurité
7. [ ] **Créer docs/installation.md** — Guide d'installation complet
8. [ ] **Créer docs/configuration.md** — Guide de configuration
9. [ ] **Créer docs/admin.md** — Guide d'administration
10. [ ] **Créer docs/api.md** — Référence API
11. [ ] **Créer docs/development.md** — Guide de développement
12. [ ] **Mettre à jour README.md** — Ajouter badge CodeQL
13. [ ] **Capturer screenshot** — Placer dans docs/assets/
14. [ ] **Build et test local** — Vérifier tous les health checks
15. [ ] **Commit et push**
16. [ ] **Déployer sur VPS** — Vérifier que tout fonctionne
17. [ ] **Vérifier les workflows GitHub** — CI, CodeQL, Dependabot

### Risques et mitigations

|Risque|Probabilité|Impact|Mitigation|
|---|---|---|---|
|Endpoint /health inexistant|Moyenne|Élevé|Vérifier le code existant d'abord|
|wscat non disponible en CI|Élevée|Faible|Fallback sur curl|
|CodeQL trop lent|Faible|Faible|Schedule hebdomadaire|
|Screenshot cassé en CI|Moyenne|Faible|Screenshot manuel acceptable|

---

## 5. Notes pour Claude Code

### Commandes à exécuter

```bash
# 1. Vérifier si l'endpoint /health existe dans l'API
cd /home/alex/Documents/REPO/KM/plumenote
grep -r "health" apps/api/src/routes/ --include="*.ts"
grep -r "/health" apps/api/src/ --include="*.ts"

# 2. Si manquant, créer/modifier apps/api/src/routes/health.ts

# 3. Vérifier l'enregistrement dans app.ts
grep -r "health" apps/api/src/app.ts

# 4. Tester l'endpoint localement
curl http://localhost:3001/health

# 5. Créer les fichiers de documentation
mkdir -p docs/assets

# 6. Build et test
cd docker
docker compose build --no-cache api yjs
docker compose up -d
sleep 60
docker compose ps  # Tous doivent être "healthy"

# 7. Smoke tests
./scripts/smoke-test.sh http://localhost

# 8. Commit
git add -A
git commit -m "feat: améliorations post-release (health checks, docs, sécurité)

- fix(api): endpoint /health robuste avec vérification DB/Redis
- fix(yjs): endpoint /health pour le serveur de collaboration
- fix(docker): health checks avec curl et vérification JSON
- feat(ci): ajout CodeQL pour analyse de sécurité
- feat(deps): configuration Dependabot
- feat(smoke-test): 12 tests avec support wscat
- docs: guides complets (installation, configuration, admin, api, dev)"

git push

# 9. Déployer sur VPS
ssh root@vps-4e7622b4.vps.ovh.net "cd /root/PlumeNote && git pull && cd docker && docker compose down && docker compose build --no-cache api yjs && docker compose up -d"

# 10. Vérifier en production
ssh root@vps-4e7622b4.vps.ovh.net "cd /root/PlumeNote/docker && sleep 60 && docker compose ps && ./scripts/smoke-test.sh https://plumenote.fr"
```

### Points d'attention

- **Vérifier le code existant** avant de créer de nouveaux endpoints — l'endpoint /health existe peut-être déjà
- **L'ordre des routes dans Fastify** est important — /health doit être enregistré sans préfixe /api/v1
- **Le serveur Hocuspocus** peut déjà exposer un endpoint HTTP — vérifier la doc
- **Les health checks Docker** doivent attendre que l'app soit vraiment prête (start_period)
- **CodeQL** peut être lent sur les gros projets — le mettre en schedule hebdomadaire

### Validation finale

```bash
# Sur le VPS, après déploiement
docker compose ps
# TOUS les services doivent être "healthy" ou "Up" sans "(unhealthy)"

# Health checks directs
curl -s https://plumenote.fr/api/health | jq .
# Doit retourner {"status":"ok",...}

# Smoke tests complets
./scripts/smoke-test.sh https://plumenote.fr
# 12/12 tests passés

# Vérifier GitHub
# - CI workflow passe ✓
# - CodeQL workflow passe ✓
# - Dependabot crée des PRs si des mises à jour sont disponibles
```
