# SPEC-002 : Optimisation build API et finalisation industrialisation

## 1. Résumé

|Attribut|Valeur|
|---|---|
|Type|Improvement / Bugfix|
|Priorité|P1-Haute|
|Complexité|M|
|Modules impactés|API, Yjs-server, Docker, Nginx|
|Estimation|1-2 jours|
|Prérequis|SPEC-001 implémentée|

### Description

Correction des compromis techniques introduits lors de SPEC-001, notamment le remplacement de `tsx` en production par un build compilé propre, et finalisation de la configuration pour un projet open source prêt à être cloné et déployé par n'importe qui.

### Critères d'acceptation

- [ ] L'API s'exécute avec `node dist/index.js` (pas tsx)
- [ ] Le yjs-server s'exécute avec `node dist/index.js` (pas tsx)
- [ ] Les health checks Docker fonctionnent sans variables d'environnement
- [ ] Le domaine est paramétrable via `.env` (pas hardcodé)
- [ ] Le script `init.sh` fonctionne sur une machine vierge
- [ ] Les fichiers du repo sont synchronisés avec le VPS
- [ ] Les images Docker sont optimisées (< 500 MB chacune)
- [ ] Un test de smoke post-déploiement existe

---

## 2. Analyse technique

### 2.1 Problèmes identifiés

|Problème|Fichier|Impact|Priorité|
|---|---|---|---|
|tsx en production (API)|`apps/api/Dockerfile`|Performance, fiabilité|P1|
|tsx en production (Yjs)|`apps/yjs-server/Dockerfile`|Performance, fiabilité|P1|
|Variable env dans HEALTHCHECK|Dockerfiles|Health check échoue|P1|
|Domaine hardcodé nginx|`docker/nginx/nginx.conf`|Non portable|P2|
|init.sh non testé|`docker/scripts/init.sh`|Fiabilité|P2|
|Désync repo/VPS|`docker/nginx/nginx.conf`|Confusion|P2|
|Images Docker volumineuses|Dockerfiles|Temps de build/deploy|P3|

### 2.2 Cause racine : Build ESM incompatible

Le problème principal vient de la configuration tsup qui génère du code ESM avec des shims `require()` dynamiques incompatibles avec Node.js en mode ESM pur.

**Configuration actuelle (problématique) :**

```typescript
// packages/database/tsup.config.ts (implicite)
// Génère du ESM avec des require() dynamiques pour Prisma
```

**Solution :** Compiler en CommonJS pour l'exécution Node.js, ou configurer correctement le bundling ESM.

### 2.3 Architecture cible

```
apps/api/
├── src/                    # Sources TypeScript
├── dist/                   # Build compilé (CJS)
│   ├── index.js
│   └── ...
├── Dockerfile              # CMD ["node", "dist/index.js"]
├── tsconfig.json           # outDir: "./dist", module: "commonjs"
└── tsup.config.ts          # format: ["cjs"]
```

---

## 3. Spécifications détaillées

### 3.1 Configuration build API

#### apps/api/tsup.config.ts (créer)

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  dts: false,
  // Externaliser les dépendances node_modules
  external: [
    '@prisma/client',
    '@plumenote/database',
    '@plumenote/types',
    'fastify',
    'ws',
    // Ajouter autres dépendances externes
  ],
  // Ne pas bundler, juste transpiler
  noExternal: [],
  esbuildOptions(options) {
    options.platform = 'node';
  },
});
```

#### apps/api/tsconfig.json (modifier)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "CommonJS",
    "moduleResolution": "node",
    "target": "ES2022",
    "esModuleInterop": true,
    "noEmit": false,
    "declaration": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

#### apps/api/package.json (modifier scripts)

```json
{
  "scripts": {
    "build": "tsup",
    "build:tsc": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  }
}
```

### 3.2 Configuration build Yjs-server

#### apps/yjs-server/tsup.config.ts (créer)

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  dts: false,
  external: [
    '@prisma/client',
    '@plumenote/database',
    '@plumenote/types',
    '@hocuspocus/server',
    'ws',
    'y-protocols',
    'yjs',
  ],
  esbuildOptions(options) {
    options.platform = 'node';
  },
});
```

#### apps/yjs-server/tsconfig.json (modifier)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "CommonJS",
    "moduleResolution": "node",
    "target": "ES2022",
    "esModuleInterop": true,
    "noEmit": false,
    "declaration": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### apps/yjs-server/package.json (modifier scripts)

```json
{
  "scripts": {
    "build": "tsup",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  }
}
```

### 3.3 Dockerfiles corrigés

#### apps/api/Dockerfile

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl python3 make g++

# Copier les fichiers de configuration
COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Installer les dépendances
RUN npm ci

# Build des packages dans l'ordre
RUN npm run build --workspace=@plumenote/types
RUN npm run db:generate --workspace=@plumenote/database
RUN npm run build --workspace=@plumenote/database
RUN npm run build --workspace=@plumenote/api

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl

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

# Health check avec port fixe
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

EXPOSE 3001
CMD ["node", "dist/index.js"]
```

#### apps/yjs-server/Dockerfile

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl python3 make g++

COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages ./packages
COPY apps/yjs-server ./apps/yjs-server

RUN npm ci

RUN npm run build --workspace=@plumenote/types
RUN npm run db:generate --workspace=@plumenote/database
RUN npm run build --workspace=@plumenote/database
RUN npm run build --workspace=@plumenote/yjs-server

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/apps/yjs-server/dist ./apps/yjs-server/dist
COPY --from=builder /app/apps/yjs-server/package.json ./apps/yjs-server/

WORKDIR /app/apps/yjs-server

# Health check avec port fixe (1234 = port par défaut Hocuspocus)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:1234/health || exit 1

EXPOSE 1234
CMD ["node", "dist/index.js"]
```

### 3.4 Configuration Nginx paramétrable

#### docker/nginx/nginx.conf (version paramétrable)

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Upstreams
    upstream api {
        server api:3001;
    }

    upstream yjs {
        server yjs:1234;
    }

    upstream web {
        server web:80;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

    # HTTP Server (utilisé seul ou pour redirection HTTPS)
    server {
        listen 80;
        server_name _;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # API routes
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Cookie $http_cookie;
            proxy_pass_header Set-Cookie;
        }

        # Login rate limiting
        location /api/v1/auth/login {
            limit_req zone=login_limit burst=3 nodelay;
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Cookie $http_cookie;
            proxy_pass_header Set-Cookie;
        }

        # WebSocket Sync (API) - DOIT ÊTRE AVANT /ws
        location /ws/sync {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_read_timeout 86400;
        }

        # WebSocket Yjs (Collaboration)
        location /ws {
            proxy_pass http://yjs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_read_timeout 86400;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 'OK';
            add_header Content-Type text/plain;
        }

        # Frontend (SPA)
        location / {
            proxy_pass http://web;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

#### docker/nginx/nginx-ssl.conf.template (créer)

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    upstream api {
        server api:3001;
    }

    upstream yjs {
        server yjs:1234;
    }

    upstream web {
        server web:80;
    }

    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name ${DOMAIN} www.${DOMAIN};
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name ${DOMAIN} www.${DOMAIN};

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 1d;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # API routes
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Cookie $http_cookie;
            proxy_pass_header Set-Cookie;
        }

        location /api/v1/auth/login {
            limit_req zone=login_limit burst=3 nodelay;
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Cookie $http_cookie;
            proxy_pass_header Set-Cookie;
        }

        location /ws/sync {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_read_timeout 86400;
        }

        location /ws {
            proxy_pass http://yjs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_read_timeout 86400;
        }

        location /health {
            access_log off;
            return 200 'OK';
            add_header Content-Type text/plain;
        }

        location / {
            proxy_pass http://web;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

### 3.5 Mise à jour .env.example

```bash
# =============================================================================
# PlumeNote - Configuration de deploiement
# =============================================================================
# Copiez ce fichier vers .env et adaptez les valeurs
# cp .env.example .env
# =============================================================================

# -----------------------------------------------------------------------------
# Mode d'execution
# -----------------------------------------------------------------------------
NODE_ENV=production

# -----------------------------------------------------------------------------
# Domaine (pour la configuration SSL)
# -----------------------------------------------------------------------------
DOMAIN=localhost

# -----------------------------------------------------------------------------
# Base de donnees PostgreSQL
# -----------------------------------------------------------------------------
POSTGRES_USER=plumenote
POSTGRES_PASSWORD=CHANGEZ_MOI_mot_de_passe_securise
POSTGRES_DB=plumenote

# -----------------------------------------------------------------------------
# Redis (cache et sessions)
# -----------------------------------------------------------------------------
REDIS_PASSWORD=CHANGEZ_MOI_redis_password

# -----------------------------------------------------------------------------
# Securite - IMPORTANT: Generez des secrets uniques !
# Commande pour generer: openssl rand -base64 32
# -----------------------------------------------------------------------------
JWT_SECRET=CHANGEZ_MOI_secret_jwt_minimum_32_caracteres
COOKIE_SECRET=CHANGEZ_MOI_secret_cookie_minimum_32_caracteres

# -----------------------------------------------------------------------------
# CORS - Domaines autorises (separes par des virgules)
# En local: http://localhost,http://localhost:5173
# En production: https://votre-domaine.fr
# -----------------------------------------------------------------------------
CORS_ORIGINS=http://localhost

# -----------------------------------------------------------------------------
# Ports exposes (optionnel)
# -----------------------------------------------------------------------------
HTTP_PORT=80
HTTPS_PORT=443

# -----------------------------------------------------------------------------
# SSL/HTTPS (optionnel)
# Mettre a 'true' pour activer HTTPS
# Assurez-vous d'avoir les certificats dans docker/nginx/ssl/
# -----------------------------------------------------------------------------
ENABLE_SSL=false

# -----------------------------------------------------------------------------
# Initialisation de la base de donnees
# Mettre a 'true' pour creer les utilisateurs de demo au premier lancement
# -----------------------------------------------------------------------------
SEED_DATABASE=false
```

### 3.6 Script d'activation SSL

#### docker/scripts/enable-ssl.sh (créer)

```bash
#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "docker-compose.yml" ]; then
    log_error "Ce script doit être exécuté depuis le dossier docker/"
    exit 1
fi

# Charger les variables d'environnement
if [ -f ".env" ]; then
    source .env
else
    log_error "Fichier .env non trouvé"
    exit 1
fi

# Vérifier le domaine
if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "localhost" ]; then
    log_error "Configurez DOMAIN dans .env (ex: DOMAIN=monsite.fr)"
    exit 1
fi

log_info "Configuration SSL pour: $DOMAIN"

# Vérifier les certificats
if [ ! -f "nginx/ssl/fullchain.pem" ] || [ ! -f "nginx/ssl/privkey.pem" ]; then
    log_warn "Certificats SSL non trouvés dans nginx/ssl/"
    log_info "Options:"
    echo "  1. Copiez vos certificats Let's Encrypt:"
    echo "     cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/"
    echo "     cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/"
    echo ""
    echo "  2. Générez des certificats avec certbot:"
    echo "     certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN"
    exit 1
fi

log_info "Certificats trouvés"

# Générer la config nginx avec le domaine
log_info "Génération de la configuration nginx SSL..."
envsubst '${DOMAIN}' < nginx/nginx-ssl.conf.template > nginx/nginx.conf

# Mettre à jour CORS_ORIGINS si nécessaire
if [[ "$CORS_ORIGINS" != *"https://$DOMAIN"* ]]; then
    log_warn "Mise à jour de CORS_ORIGINS dans .env"
    sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN|" .env
fi

# Redémarrer nginx
log_info "Redémarrage de nginx..."
docker compose restart nginx

log_info "SSL activé pour https://$DOMAIN"
echo ""
echo "Vérifiez avec: curl -I https://$DOMAIN"
```

### 3.7 Script de test smoke

#### docker/scripts/smoke-test.sh (créer)

```bash
#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BASE_URL="${1:-http://localhost}"
TIMEOUT=10

log_ok() { echo -e "${GREEN}✓${NC} $1"; }
log_fail() { echo -e "${RED}✗${NC} $1"; FAILED=1; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }

FAILED=0

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║     PlumeNote - Test de smoke             ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "URL de base: $BASE_URL"
echo ""

# Test 1: Page d'accueil
echo "1. Test page d'accueil..."
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL/" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    log_ok "Page d'accueil accessible (HTTP $HTTP_CODE)"
else
    log_fail "Page d'accueil inaccessible (HTTP $HTTP_CODE)"
fi

# Test 2: Health check global
echo "2. Test health check..."
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    log_ok "Health check OK (HTTP $HTTP_CODE)"
else
    log_fail "Health check échoué (HTTP $HTTP_CODE)"
fi

# Test 3: API disponible
echo "3. Test API..."
RESPONSE=$(curl -s --max-time $TIMEOUT "$BASE_URL/api/v1/auth/me" 2>/dev/null || echo '{"error":"timeout"}')
if echo "$RESPONSE" | grep -q "UNAUTHORIZED\|Invalid"; then
    log_ok "API répond correctement (auth requise)"
elif echo "$RESPONSE" | grep -q "timeout"; then
    log_fail "API timeout"
else
    log_warn "Réponse API inattendue: $RESPONSE"
fi

# Test 4: Login endpoint
echo "4. Test endpoint login..."
RESPONSE=$(curl -s -X POST --max-time $TIMEOUT \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    "$BASE_URL/api/v1/auth/login" 2>/dev/null || echo '{"error":"timeout"}')
if echo "$RESPONSE" | grep -q "validation\|Invalid\|401\|400"; then
    log_ok "Endpoint login fonctionnel"
elif echo "$RESPONSE" | grep -q "timeout"; then
    log_fail "Login endpoint timeout"
else
    log_warn "Réponse login inattendue: $RESPONSE"
fi

# Test 5: WebSocket Yjs
echo "5. Test WebSocket Yjs..."
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT \
    -H "Upgrade: websocket" -H "Connection: Upgrade" \
    "$BASE_URL/ws" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "101" ] || [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "426" ]; then
    log_ok "WebSocket Yjs accessible (HTTP $HTTP_CODE)"
else
    log_fail "WebSocket Yjs inaccessible (HTTP $HTTP_CODE)"
fi

# Test 6: WebSocket Sync
echo "6. Test WebSocket Sync..."
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT \
    -H "Upgrade: websocket" -H "Connection: Upgrade" \
    "$BASE_URL/ws/sync" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "101" ] || [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "426" ] || [ "$HTTP_CODE" = "401" ]; then
    log_ok "WebSocket Sync accessible (HTTP $HTTP_CODE)"
else
    log_fail "WebSocket Sync inaccessible (HTTP $HTTP_CODE)"
fi

# Test 7: Assets statiques
echo "7. Test assets statiques..."
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL/assets/" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "403" ]; then
    log_ok "Assets statiques configurés (HTTP $HTTP_CODE)"
else
    log_warn "Assets statiques: HTTP $HTTP_CODE"
fi

# Résumé
echo ""
echo "═══════════════════════════════════════════"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}Tous les tests ont réussi !${NC}"
    exit 0
else
    echo -e "${RED}Certains tests ont échoué${NC}"
    exit 1
fi
```

---

## 4. Tests

### 4.1 Test build local

```bash
# Test que le build fonctionne sans tsx
cd apps/api && npm run build && node dist/index.js &
# Devrait démarrer sans erreur

# Test yjs-server
cd apps/yjs-server && npm run build && node dist/index.js &
# Devrait démarrer sur le port 1234
```

### 4.2 Test Docker complet

```bash
# Build et test
cd docker
cp .env.example .env
# Configurer les secrets dans .env
docker compose build --no-cache
docker compose up -d

# Attendre le démarrage
sleep 30

# Exécuter les smoke tests
./scripts/smoke-test.sh http://localhost
```

### 4.3 Test SSL

```bash
# Sur le VPS avec un domaine configuré
cd docker
./scripts/enable-ssl.sh
./scripts/smoke-test.sh https://plumenote.fr
```

---

## 5. Plan d'implémentation

### Ordre des tâches

1. [ ] **Installer tsup** dans api et yjs-server
2. [ ] **Créer tsup.config.ts** pour api
3. [ ] **Modifier tsconfig.json** de api (module: CommonJS)
4. [ ] **Modifier package.json** de api (scripts build/start)
5. [ ] **Créer tsup.config.ts** pour yjs-server
6. [ ] **Modifier tsconfig.json** de yjs-server
7. [ ] **Modifier package.json** de yjs-server
8. [ ] **Tester build local** (npm run build && node dist/index.js)
9. [ ] **Mettre à jour Dockerfile api** (retirer tsx, CMD node)
10. [ ] **Mettre à jour Dockerfile yjs-server** (retirer tsx, CMD node)
11. [ ] **Créer nginx-ssl.conf.template**
12. [ ] **Mettre à jour nginx.conf** (version HTTP simple)
13. [ ] **Créer enable-ssl.sh**
14. [ ] **Créer smoke-test.sh**
15. [ ] **Mettre à jour .env.example** (DOMAIN, ENABLE_SSL)
16. [ ] **Build Docker local** et valider
17. [ ] **Commit et push**
18. [ ] **Déployer sur VPS** avec smoke-test
19. [ ] **Activer SSL** avec enable-ssl.sh

### Risques et mitigations

|Risque|Probabilité|Impact|Mitigation|
|---|---|---|---|
|Build CJS casse les imports ESM|Moyenne|Élevé|Tester localement d'abord, fallback tsx si nécessaire|
|Prisma incompatible avec CJS|Faible|Élevé|Utiliser `external` dans tsup pour ne pas bundler Prisma|
|Certificats SSL expirés|Faible|Moyen|Documenter renouvellement Let's Encrypt|

---

## 6. Notes pour Claude Code

### Commandes à exécuter

```bash
# 1. Installer tsup dans les workspaces
cd /home/alex/Documents/REPO/KM/plumenote
npm install -D tsup --workspace=@plumenote/api
npm install -D tsup --workspace=@plumenote/yjs-server

# 2. Créer les fichiers de config (voir spec)

# 3. Tester le build local AVANT de modifier les Dockerfiles
cd apps/api && npm run build
node dist/index.js  # Doit démarrer sans erreur
# Ctrl+C pour arrêter

cd ../yjs-server && npm run build
node dist/index.js  # Doit démarrer sur 1234
# Ctrl+C

# 4. Si build OK, modifier les Dockerfiles

# 5. Build Docker
cd docker
docker compose build --no-cache

# 6. Test local
docker compose up -d
sleep 30
./scripts/smoke-test.sh http://localhost

# 7. Si OK, commit
git add -A
git commit -m "refactor(build): remplacer tsx par build CJS compilé pour production

- Ajout tsup.config.ts pour api et yjs-server
- Configuration tsconfig.json en CommonJS
- Dockerfiles optimisés avec node dist/index.js
- Scripts enable-ssl.sh et smoke-test.sh
- nginx-ssl.conf.template paramétrable"

git push

# 8. Déployer sur VPS
ssh root@vps-4e7622b4.vps.ovh.net "cd /root/PlumeNote && git pull && cd docker && docker compose down && docker compose build --no-cache && docker compose up -d"

# 9. Smoke test VPS
ssh root@vps-4e7622b4.vps.ovh.net "cd /root/PlumeNote/docker && chmod +x scripts/*.sh && ./scripts/smoke-test.sh http://localhost"

# 10. Activer SSL
ssh root@vps-4e7622b4.vps.ovh.net "cd /root/PlumeNote/docker && sed -i 's/DOMAIN=localhost/DOMAIN=plumenote.fr/' .env && ./scripts/enable-ssl.sh"

# 11. Smoke test HTTPS
./scripts/smoke-test.sh https://plumenote.fr
```

### Points d'attention

- **Tester le build local AVANT de modifier les Dockerfiles** - Si `node dist/index.js` échoue, le problème est dans la config tsup/tsconfig, pas Docker
- **Ne pas bundler Prisma** - Utiliser `external` dans tsup.config.ts
- **Ordre des builds workspace** - types → database → api/yjs-server
- **Le fichier nginx.conf du repo doit être la version HTTP simple** - SSL s'active via enable-ssl.sh qui utilise le template

### Si le build CJS échoue

En dernier recours, conserver tsx mais avec une image plus légère :

```dockerfile
# Alternative si CJS impossible
FROM node:20-alpine
RUN npm install -g tsx
COPY --from=builder /app ./
CMD ["tsx", "src/index.ts"]
```

Mais documenter comme dette technique à résoudre.

### Dépendances npm à installer

```bash
npm install -D tsup --workspace=@plumenote/api
npm install -D tsup --workspace=@plumenote/yjs-server
```

---

## 7. Validation finale

Une fois SPEC-002 implémentée, vérifier :

```bash
# 1. Pas de tsx dans les images de prod
docker compose exec api which tsx  # Doit retourner "not found"
docker compose exec yjs which tsx  # Doit retourner "not found"

# 2. Process node (pas tsx)
docker compose exec api ps aux | grep node  # node dist/index.js
docker compose exec yjs ps aux | grep node  # node dist/index.js

# 3. Health checks passent
docker compose ps  # Tous "healthy"

# 4. Smoke tests passent
./scripts/smoke-test.sh https://plumenote.fr

# 5. Taille des images
docker images | grep plumenote  # < 500 MB chacune idéalement
```
