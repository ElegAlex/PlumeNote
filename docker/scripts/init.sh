#!/bin/bash
set -e

# Source common functions
SCRIPT_DIR="$(dirname "$0")"
if [ -f "$SCRIPT_DIR/common.sh" ]; then
    source "$SCRIPT_DIR/common.sh"
else
    RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
    log_info() { echo -e "${YELLOW}[INFO]${NC} $1"; }
    log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
    log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
    log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
fi

echo ""
echo "=========================================="
echo "     PlumeNote - Initialisation          "
echo "=========================================="
echo ""

# Verifier qu'on est dans le bon repertoire
if [ ! -f "docker-compose.yml" ]; then
    log_error "Ce script doit etre execute depuis le dossier docker/"
    exit 1
fi

# Verifier les prerequis
log_info "Verification des prerequis..."

if ! command -v docker &> /dev/null; then
    log_error "Docker n'est pas installe"
    exit 1
fi
log_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"

if ! docker compose version &> /dev/null; then
    log_error "Docker Compose n'est pas installe"
    exit 1
fi
log_success "Docker Compose $(docker compose version --short)"

# Verifier/creer le fichier .env
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        log_warn "Fichier .env non trouve, creation depuis .env.example"
        cp .env.example .env

        # Generer des secrets aleatoires (hex pour eviter les caracteres speciaux)
        JWT_SECRET=$(openssl rand -hex 32)
        COOKIE_SECRET=$(openssl rand -hex 32)
        POSTGRES_PASSWORD=$(openssl rand -hex 16)
        REDIS_PASSWORD=$(openssl rand -hex 16)

        # Remplacer les placeholders
        sed -i "s/CHANGEZ_MOI_secret_jwt_minimum_32_caracteres/$JWT_SECRET/" .env
        sed -i "s/CHANGEZ_MOI_secret_cookie_minimum_32_caracteres/$COOKIE_SECRET/" .env
        sed -i "s/CHANGEZ_MOI_mot_de_passe_securise/$POSTGRES_PASSWORD/" .env
        sed -i "s/CHANGEZ_MOI_redis_password/$REDIS_PASSWORD/" .env

        log_success "Fichier .env cree avec des secrets generes automatiquement"
        log_warn "IMPORTANT: Verifiez et adaptez CORS_ORIGINS dans .env pour votre domaine"
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
    log_error "JWT_SECRET doit etre modifie dans .env"
    ERRORS=1
fi

if [[ "$COOKIE_SECRET" == *"CHANGEZ_MOI"* ]]; then
    log_error "COOKIE_SECRET doit etre modifie dans .env"
    ERRORS=1
fi

if [[ "$POSTGRES_PASSWORD" == *"CHANGEZ_MOI"* ]]; then
    log_error "POSTGRES_PASSWORD doit etre modifie dans .env"
    ERRORS=1
fi

if [ $ERRORS -eq 1 ]; then
    log_error "Configuration invalide, corrigez les erreurs ci-dessus"
    exit 1
fi

# Creer les dossiers necessaires
mkdir -p nginx/ssl
log_success "Dossiers crees"

# Build et demarrage
log_info "Construction des images Docker (peut prendre plusieurs minutes)..."
docker compose build --no-cache

log_info "Demarrage des services..."
docker compose up -d

# Attendre que PostgreSQL soit pret
log_info "Attente de PostgreSQL..."
RETRIES=30
until docker compose exec -T postgres pg_isready -U ${POSTGRES_USER:-plumenote} > /dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
    RETRIES=$((RETRIES-1))
    sleep 2
done

if [ $RETRIES -eq 0 ]; then
    log_error "PostgreSQL n'a pas demarre a temps"
    docker compose logs postgres
    exit 1
fi
log_success "PostgreSQL pret"

# Attendre que l'API soit prete
log_info "Attente que l'API soit prete..."
for i in {1..30}; do
    if docker compose exec -T api curl -sf http://localhost:3001/health > /dev/null 2>&1; then
        log_success "API prete"
        break
    fi
    if [ $i -eq 30 ]; then
        log_error "Timeout: API non disponible apres 60s"
        docker compose logs api
        exit 1
    fi
    sleep 2
done

# Executer les migrations Prisma
log_info "Execution des migrations de base de donnees..."
if docker compose exec -T api npx prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma; then
    log_success "Migrations appliquees"
else
    log_warn "Migrations deja appliquees ou erreur"
fi

# Seed de la base de donnees (roles, utilisateurs de demo)
if [ "${SEED_DATABASE:-false}" = "true" ]; then
    log_info "Execution du seed de la base de donnees..."
    if docker compose exec -T api node /app/packages/database/prisma/seed.js; then
        log_success "Seed execute avec succes"
    else
        log_warn "Erreur lors du seed (peut-etre deja execute)"
    fi
else
    log_info "Seed ignore (SEED_DATABASE != true)"
    log_info "Pour creer les utilisateurs de demo, relancez avec SEED_DATABASE=true"
fi

# Verification finale
log_info "Verification des services..."
sleep 5

SERVICES_OK=true
for service in postgres redis api yjs web nginx; do
    if docker compose ps --format "{{.State}}" $service 2>/dev/null | grep -q "running"; then
        log_success "$service: running"
    else
        log_error "$service: not running"
        SERVICES_OK=false
    fi
done

echo ""
if [ "$SERVICES_OK" = true ]; then
    echo "=========================================="
    echo "  PlumeNote est pret !                   "
    echo "=========================================="
    echo ""
    echo "  URL: http://localhost (ou votre domaine configure)"
    echo ""
    echo "  Comptes de demo (si SEED_DATABASE=true):"
    echo "    - admin@plumenote.local / password123"
    echo "    - demo@plumenote.local / password123"
    echo ""
else
    echo "=========================================="
    echo "  Certains services ont echoue           "
    echo "  Consultez les logs: docker compose logs"
    echo "=========================================="
    exit 1
fi
