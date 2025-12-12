# Industrialisation Docker & Préparation Open Source PlumeNote

## 1. Résumé

|Attribut|Valeur|
|---|---|
|Type|Improvement / Refactor|
|Priorité|P1-Haute|
|Complexité|L|
|Modules impactés|Infrastructure (Docker, Nginx), Documentation, CI/CD|
|Estimation|3-4 jours|

### Description

Refonte complète de la stack Docker pour garantir un déploiement "one-click" fiable, reproductible et documenté. L'objectif est qu'un utilisateur puisse cloner le repo, configurer un `.env` et lancer `docker compose up` sans friction.

### Critères d'acceptation

- [ ] `docker compose up` fonctionne sans modification sur une machine vierge (Docker + Docker Compose uniquement)
- [ ] Fichier `.env.example` complet et commenté
- [ ] README.md avec guide de démarrage rapide (<5 min)
- [ ] Tous les chemins de fichiers résolus correctement dans les Dockerfiles
- [ ] Configuration SSL/HTTPS optionnelle et documentée
- [ ] Health checks fonctionnels sur tous les services
- [ ] Aucun secret hardcodé dans le code source
- [ ] Script d'initialisation idempotent (peut être relancé sans casser l'existant)

---

## 2. Analyse technique

### 2.1 Problèmes identifiés dans le déploiement actuel

|Problème|Fichier|Impact|Correction nécessaire|
|---|---|---|---|
|Chemin nginx.conf incorrect|`apps/web/Dockerfile`|Build échoue|Contexte Docker vs chemin relatif|
|Extensions .mjs vs .js|`packages/database/package.json`|API ne démarre pas|Aligner tsup output avec package.json|
|CORS hardcodé "votredomaine.fr"|`docker/.env` généré|Auth échoue|Template .env.example avec placeholder|
|Route WebSocket mal configurée|`docker/nginx/nginx.conf`|Sync temps réel KO|Séparer routes /ws/sync et /ws|
|Pas de .env.example|Racine projet|Config manuelle obligatoire|Créer template complet|
|deploy.sh peu robuste|`docker/deploy.sh`|Erreurs silencieuses|Améliorer gestion erreurs|

### 2.2 Architecture cible

```
docker/
├── .env.example              # Template de configuration
├── docker-compose.yml        # Composition principale
├── docker-compose.dev.yml    # Override pour développement
├── docker-compose.ssl.yml    # Override pour HTTPS
├── nginx/
│   ├── nginx.conf           # Config HTTP simple
│   ├── nginx-ssl.conf       # Config HTTPS (template)
│   └── ssl/                 # Certificats (gitignored)
├── scripts/
│   ├── init.sh              # Initialisation première fois
│   ├── deploy.sh            # Déploiement/mise à jour
│   └── backup.sh            # Sauvegarde données
└── README.md                # Documentation Docker spécifique
```

### 2.3 Flux de déploiement cible

```
┌─────────────────────────────────────────────────────────────┐
│  Utilisateur                                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  1. git clone https://github.com/ElegAlex/PlumeNote.git     │
│  2. cd PlumeNote/docker                                     │
│  3. cp .env.example .env && nano .env                       │
│  4. docker compose up -d                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  ✓ PostgreSQL initialisé avec schema                        │
│  ✓ Redis démarré                                            │
│  ✓ API connectée à la BDD                                   │
│  ✓ Yjs Server opérationnel                                  │
│  ✓ Frontend buildé et servi                                 │
│  ✓ Nginx reverse proxy actif                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Spécifications détaillées

### 3.1 Correction des Dockerfiles

#### apps/web/Dockerfile

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/

# Installer pnpm et les dépendances
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copier le code source
COPY packages/types ./packages/types
COPY apps/web ./apps/web

# Build des packages puis de l'app
RUN cd packages/types && pnpm build
RUN cd apps/web && pnpm build

# Stage 2: Production
FROM nginx:alpine

# Copier la config nginx DEPUIS LE CONTEXTE DE BUILD (racine projet)
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copier l'application buildée
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### apps/api/Dockerfile

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Installer les outils nécessaires
RUN apk add --no-cache openssl python3 make g++

# Copier les fichiers de dépendances (ordre important pour le cache)
COPY package.json pnpm-lock.yaml* ./
COPY packages/types/package.json ./packages/types/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

# Installer pnpm et dépendances
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copier le code source
COPY packages/types ./packages/types
COPY packages/database ./packages/database
COPY apps/api ./apps/api
COPY prisma ./prisma

# Build dans l'ordre des dépendances
RUN cd packages/types && pnpm build
RUN cd packages/database && npx prisma generate && pnpm build
RUN cd apps/api && pnpm build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl

# Copier uniquement le nécessaire pour la production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/prisma ./prisma

WORKDIR /app/apps/api

# Health check
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

COPY package.json pnpm-lock.yaml* ./
COPY packages/types/package.json ./packages/types/
COPY packages/database/package.json ./packages/database/
COPY apps/yjs-server/package.json ./apps/yjs-server/

RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY packages/types ./packages/types
COPY packages/database ./packages/database
COPY apps/yjs-server ./apps/yjs-server
COPY prisma ./prisma

RUN cd packages/types && pnpm build
RUN cd packages/database && npx prisma generate && pnpm build
RUN cd apps/yjs-server && pnpm build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/yjs-server/dist ./apps/yjs-server/dist
COPY --from=builder /app/apps/yjs-server/package.json ./apps/yjs-server/
COPY --from=builder /app/prisma ./prisma

WORKDIR /app/apps/yjs-server

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

EXPOSE 3002
CMD ["node", "dist/index.js"]
```

### 3.2 Correction packages/database/package.json

```json
{
  "name": "@plumenote/database",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./client": {
      "import": "./dist/client.js",
      "types": "./dist/client.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts src/client.ts --format esm --dts --clean",
    "generate": "prisma generate",
    "migrate": "prisma migrate deploy",
    "seed": "tsx prisma/seed.ts"
  }
}
```

### 3.3 Configuration docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: plumenote-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-plumenote}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
      POSTGRES_DB: ${POSTGRES_DB:-plumenote}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-plumenote} -d ${POSTGRES_DB:-plumenote}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks:
      - plumenote-network

  redis:
    image: redis:7-alpine
    container_name: plumenote-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - plumenote-network

  api:
    build:
      context: ..
      dockerfile: apps/api/Dockerfile
    container_name: plumenote-api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER:-plumenote}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-plumenote}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET:?JWT_SECRET is required}
      COOKIE_SECRET: ${COOKIE_SECRET:?COOKIE_SECRET is required}
      CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost}
      PORT: 3001
    networks:
      - plumenote-network

  yjs:
    build:
      context: ..
      dockerfile: apps/yjs-server/Dockerfile
    container_name: plumenote-yjs
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER:-plumenote}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-plumenote}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      PORT: 3002
    networks:
      - plumenote-network

  web:
    build:
      context: ..
      dockerfile: apps/web/Dockerfile
    container_name: plumenote-web
    restart: unless-stopped
    networks:
      - plumenote-network

  nginx:
    image: nginx:alpine
    container_name: plumenote-nginx
    restart: unless-stopped
    ports:
      - "${HTTP_PORT:-80}:80"
      - "${HTTPS_PORT:-443}:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
      - yjs
      - web
    networks:
      - plumenote-network

volumes:
  postgres_data:
  redis_data:

networks:
  plumenote-network:
    driver: bridge
```

### 3.4 Configuration Nginx corrigée

#### docker/nginx/nginx.conf

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
        server yjs:3002;
    }

    upstream web {
        server web:80;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

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
        }

        # Login rate limiting plus strict
        location /api/v1/auth/login {
            limit_req zone=login_limit burst=3 nodelay;
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
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

### 3.5 Fichier .env.example

```bash
# =============================================================================
# PlumeNote - Configuration de déploiement
# =============================================================================
# Copiez ce fichier vers .env et adaptez les valeurs
# cp .env.example .env
# =============================================================================

# -----------------------------------------------------------------------------
# Mode d'exécution
# -----------------------------------------------------------------------------
NODE_ENV=production

# -----------------------------------------------------------------------------
# Base de données PostgreSQL
# -----------------------------------------------------------------------------
POSTGRES_USER=plumenote
POSTGRES_PASSWORD=CHANGEZ_MOI_mot_de_passe_securise
POSTGRES_DB=plumenote

# -----------------------------------------------------------------------------
# Sécurité - IMPORTANT: Générez des secrets uniques !
# Commande pour générer: openssl rand -base64 32
# -----------------------------------------------------------------------------
JWT_SECRET=CHANGEZ_MOI_secret_jwt_minimum_32_caracteres
COOKIE_SECRET=CHANGEZ_MOI_secret_cookie_minimum_32_caracteres

# -----------------------------------------------------------------------------
# CORS - Domaines autorisés (séparés par des virgules)
# En local: http://localhost,http://localhost:5173
# En production: https://votre-domaine.fr
# -----------------------------------------------------------------------------
CORS_ORIGINS=http://localhost

# -----------------------------------------------------------------------------
# Ports exposés (optionnel)
# -----------------------------------------------------------------------------
HTTP_PORT=80
HTTPS_PORT=443

# -----------------------------------------------------------------------------
# Configuration SSL (optionnel - pour HTTPS)
# Décommenter si vous avez des certificats SSL
# -----------------------------------------------------------------------------
# SSL_CERT_PATH=./nginx/ssl/fullchain.pem
# SSL_KEY_PATH=./nginx/ssl/privkey.pem

# -----------------------------------------------------------------------------
# Initialisation de la base de données
# Mettre à 'true' pour créer les utilisateurs de démo au premier lancement
# -----------------------------------------------------------------------------
SEED_DATABASE=true
```

### 3.6 Script d'initialisation amélioré

#### docker/scripts/init.sh

```bash
#!/bin/bash
set -e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║     PlumeNote - Initialisation            ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "docker-compose.yml" ]; then
    log_error "Ce script doit être exécuté depuis le dossier docker/"
    exit 1
fi

# Vérifier les prérequis
log_info "Vérification des prérequis..."

if ! command -v docker &> /dev/null; then
    log_error "Docker n'est pas installé"
    exit 1
fi
log_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"

if ! docker compose version &> /dev/null; then
    log_error "Docker Compose n'est pas installé"
    exit 1
fi
log_success "Docker Compose $(docker compose version --short)"

# Vérifier/créer le fichier .env
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        log_warn "Fichier .env non trouvé, création depuis .env.example"
        cp .env.example .env
        
        # Générer des secrets aléatoires
        JWT_SECRET=$(openssl rand -base64 32)
        COOKIE_SECRET=$(openssl rand -base64 32)
        POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
        
        # Remplacer les placeholders
        sed -i "s/CHANGEZ_MOI_secret_jwt_minimum_32_caracteres/$JWT_SECRET/" .env
        sed -i "s/CHANGEZ_MOI_secret_cookie_minimum_32_caracteres/$COOKIE_SECRET/" .env
        sed -i "s/CHANGEZ_MOI_mot_de_passe_securise/$POSTGRES_PASSWORD/" .env
        
        log_success "Fichier .env créé avec des secrets générés automatiquement"
        log_warn "IMPORTANT: Vérifiez et adaptez CORS_ORIGINS dans .env pour votre domaine"
    else
        log_error "Fichier .env.example manquant"
        exit 1
    fi
else
    log_success "Fichier .env existant"
fi

# Valider les variables critiques
source .env
ERRORS=0

if [[ "$JWT_SECRET" == *"CHANGEZ_MOI"* ]]; then
    log_error "JWT_SECRET doit être modifié dans .env"
    ERRORS=1
fi

if [[ "$COOKIE_SECRET" == *"CHANGEZ_MOI"* ]]; then
    log_error "COOKIE_SECRET doit être modifié dans .env"
    ERRORS=1
fi

if [[ "$POSTGRES_PASSWORD" == *"CHANGEZ_MOI"* ]]; then
    log_error "POSTGRES_PASSWORD doit être modifié dans .env"
    ERRORS=1
fi

if [ $ERRORS -eq 1 ]; then
    log_error "Configuration invalide, corrigez les erreurs ci-dessus"
    exit 1
fi

# Créer les dossiers nécessaires
mkdir -p nginx/ssl
log_success "Dossiers créés"

# Build et démarrage
log_info "Construction des images Docker (peut prendre plusieurs minutes)..."
docker compose build --no-cache

log_info "Démarrage des services..."
docker compose up -d

# Attendre que PostgreSQL soit prêt
log_info "Attente de PostgreSQL..."
RETRIES=30
until docker compose exec -T postgres pg_isready -U ${POSTGRES_USER:-plumenote} > /dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
    RETRIES=$((RETRIES-1))
    sleep 2
done

if [ $RETRIES -eq 0 ]; then
    log_error "PostgreSQL n'a pas démarré à temps"
    docker compose logs postgres
    exit 1
fi
log_success "PostgreSQL prêt"

# Exécuter les migrations Prisma
log_info "Exécution des migrations de base de données..."
docker compose exec -T api npx prisma migrate deploy

# Seed si demandé
if [ "${SEED_DATABASE:-false}" = "true" ]; then
    log_info "Initialisation des données de démo..."
    docker compose exec -T api npx prisma db seed || log_warn "Seed déjà effectué ou erreur"
fi

# Vérification finale
log_info "Vérification des services..."
sleep 5

SERVICES_OK=true
for service in postgres redis api yjs web nginx; do
    STATUS=$(docker compose ps --format json $service 2>/dev/null | jq -r '.State' 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "running" ]; then
        log_success "$service: running"
    else
        log_error "$service: $STATUS"
        SERVICES_OK=false
    fi
done

echo ""
if [ "$SERVICES_OK" = true ]; then
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║  ✓ PlumeNote est prêt !                                   ║"
    echo "╠═══════════════════════════════════════════════════════════╣"
    echo "║  URL: http://localhost (ou votre domaine configuré)       ║"
    echo "║                                                           ║"
    echo "║  Comptes de démo:                                         ║"
    echo "║    - admin@plumenote.local / password123                  ║"
    echo "║    - demo@plumenote.local / password123                   ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
else
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║  ✗ Certains services ont échoué                          ║"
    echo "║  Consultez les logs: docker compose logs                  ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    exit 1
fi
```

### 3.7 Documentation README principal

#### docker/README.md

````markdown
# Déploiement Docker de PlumeNote

## Prérequis

- Docker 20.10+
- Docker Compose v2.0+
- 2 Go RAM minimum
- 10 Go d'espace disque

## Démarrage rapide

```bash
# 1. Cloner le repository
git clone https://github.com/ElegAlex/PlumeNote.git
cd PlumeNote/docker

# 2. Initialiser (crée .env avec secrets auto-générés)
chmod +x scripts/init.sh
./scripts/init.sh

# L'application est accessible sur http://localhost
````

## Configuration

### Variables d'environnement

Copiez `.env.example` vers `.env` et adaptez les valeurs :

|Variable|Description|Requis|
|---|---|---|
|`POSTGRES_PASSWORD`|Mot de passe PostgreSQL|✅|
|`JWT_SECRET`|Secret pour les tokens JWT (min 32 car.)|✅|
|`COOKIE_SECRET`|Secret pour les cookies de session|✅|
|`CORS_ORIGINS`|Domaines autorisés (ex: https://mondomaine.fr)|✅|
|`HTTP_PORT`|Port HTTP (défaut: 80)|❌|
|`HTTPS_PORT`|Port HTTPS (défaut: 443)|❌|

### Activer HTTPS

1. Placez vos certificats dans `nginx/ssl/` :
    
    - `fullchain.pem`
    - `privkey.pem`
2. Remplacez la config nginx :
    

```bash
cp nginx/nginx-ssl.conf nginx/nginx.conf
```

3. Redémarrez :

```bash
docker compose restart nginx
```

## Commandes utiles

```bash
# Voir les logs
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f api

# Redémarrer un service
docker compose restart api

# Arrêter tout
docker compose down

# Arrêter et supprimer les données
docker compose down -v

# Mise à jour
git pull
docker compose build --no-cache
docker compose up -d
```

## Architecture

```
┌─────────────┐     ┌─────────────┐
│   Client    │────▶│    Nginx    │
└─────────────┘     └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Frontend     │  │     API       │  │  Yjs Server   │
│  (React/Vite) │  │   (Fastify)   │  │  (Hocuspocus) │
└───────────────┘  └───────┬───────┘  └───────┬───────┘
                           │                  │
                    ┌──────┴──────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│  PostgreSQL   │       │     Redis     │
└───────────────┘       └───────────────┘
```

## Ports

|Service|Port interne|Port exposé|
|---|---|---|
|Nginx|80/443|80/443|
|API|3001|-|
|Yjs|3002|-|
|PostgreSQL|5432|-|
|Redis|6379|-|

## Troubleshooting

### L'API ne démarre pas

```bash
docker compose logs api
# Vérifier la connexion BDD
docker compose exec api npx prisma db push
```

### Erreur WebSocket

Vérifiez que CORS_ORIGINS correspond à votre domaine dans `.env`

### Réinitialiser complètement

```bash
docker compose down -v
rm .env
./scripts/init.sh
```

````

---

## 4. Plan d'implémentation

### Ordre des tâches

1. [ ] **Corriger packages/database/package.json** - Aligner extensions .js avec la sortie tsup
2. [ ] **Refactorer apps/web/Dockerfile** - Chemins corrects pour le contexte de build
3. [ ] **Refactorer apps/api/Dockerfile** - Build propre des packages internes
4. [ ] **Refactorer apps/yjs-server/Dockerfile** - Idem API
5. [ ] **Créer docker/.env.example** - Template complet avec documentation
6. [ ] **Corriger docker/nginx/nginx.conf** - Routes WebSocket distinctes
7. [ ] **Créer docker/scripts/init.sh** - Script d'initialisation robuste
8. [ ] **Créer docker/README.md** - Documentation utilisateur
9. [ ] **Mettre à jour docker-compose.yml** - Health checks, variables requises
10. [ ] **Tester le déploiement from scratch** - Valider le flux complet
11. [ ] **Mettre à jour .gitignore** - Exclure .env, ssl/, volumes

### Risques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Breaking change pour installations existantes | Moyenne | Élevé | Documenter la migration, garder rétrocompatibilité .env |
| Temps de build Docker long | Faible | Faible | Optimiser le cache avec ordre des COPY |
| Secrets exposés par erreur | Moyenne | Élevé | Vérifier .gitignore, validation au démarrage |

---

## 5. Notes pour Claude Code

### Commandes à exécuter

```bash
# 1. D'abord corriger les fichiers localement
cd /home/alex/Documents/REPO/KM/plumenote

# 2. Vérifier que les modifications sont correctes
cat packages/database/package.json | grep -A5 '"exports"'

# 3. Tester le build Docker en local avant push
cd docker
docker compose build --no-cache

# 4. Si OK, commit et push
git add -A
git commit -m "refactor(docker): industrialisation déploiement pour open source

- Fix: chemins Dockerfile pour contexte de build racine
- Fix: extensions .js dans packages/database exports
- Fix: routes nginx /ws/sync distinctes de /ws
- Add: .env.example complet avec génération secrets
- Add: script init.sh pour déploiement one-click
- Add: documentation README docker/
- Add: health checks sur tous les services"

git push

# 5. Déployer sur VPS
ssh root@vps-4e7622b4.vps.ovh.net "cd /root/PlumeNote && git pull && cd docker && ./scripts/init.sh"
````

### Points d'attention

- **NE PAS modifier l'ordre des `location` dans nginx** : `/ws/sync` DOIT être avant `/ws`
- **Toujours tester `docker compose build` localement** avant de push
- **Le fichier `.env` ne doit JAMAIS être commité** - vérifier qu'il est dans `.gitignore`
- **Les migrations Prisma doivent être exécutées** après le premier démarrage de PostgreSQL
- **CORS_ORIGINS** doit correspondre EXACTEMENT au domaine (avec https:// si SSL actif)

### Fichiers à ajouter au .gitignore

```gitignore
# Docker
docker/.env
docker/nginx/ssl/*.pem
docker/nginx/ssl/*.key
docker/nginx/ssl/*.crt
```
