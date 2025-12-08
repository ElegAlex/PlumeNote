#!/bin/bash
set -e

# =============================================================================
# PlumeNote - Script de Deploiement Automatise
# =============================================================================

# Couleurs pour l'affichage
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Variables globales
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/deploy.log"
SKIP_BUILD=false
SKIP_SEED=false
AUTO_MODE=false
SSL_DOMAIN=""
SHOW_HELP=false

# =============================================================================
# Fonctions utilitaires
# =============================================================================

log() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] $*" >> "$LOG_FILE"
}

print_step() {
    echo -e "${BLUE}${BOLD}$1${NC}"
    log "STEP: $1"
}

print_success() {
    echo -e "   ${GREEN}✓${NC} $1"
    log "SUCCESS: $1"
}

print_error() {
    echo -e "   ${RED}✗${NC} $1"
    log "ERROR: $1"
}

print_warning() {
    echo -e "   ${YELLOW}!${NC} $1"
    log "WARNING: $1"
}

print_info() {
    echo -e "   ${CYAN}→${NC} $1"
    log "INFO: $1"
}

prompt_yes_no() {
    local question="$1"
    local default="$2"
    local response

    if [[ "$AUTO_MODE" == true ]]; then
        [[ "$default" == "Y" ]] && return 0 || return 1
    fi

    if [[ "$default" == "Y" ]]; then
        read -r -p "   ? $question [Y/n]: " response
        [[ -z "$response" || "$response" =~ ^[Yy] ]] && return 0 || return 1
    else
        read -r -p "   ? $question [y/N]: " response
        [[ "$response" =~ ^[Yy] ]] && return 0 || return 1
    fi
}

prompt_input() {
    local question="$1"
    local default="$2"
    local is_secret="$3"
    local response

    if [[ "$AUTO_MODE" == true ]]; then
        echo "$default"
        return
    fi

    if [[ "$is_secret" == true ]]; then
        read -r -s -p "   ? $question: " response
        echo
    else
        read -r -p "   ? $question [$default]: " response
    fi

    echo "${response:-$default}"
}

generate_secret() {
    openssl rand -base64 32 | tr -d '/+=' | head -c 32
}

cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        echo
        print_error "Le deploiement a echoue. Consultez ${LOG_FILE} pour plus de details."
        echo
        echo -e "${YELLOW}Pour nettoyer et recommencer :${NC}"
        echo "  docker compose down -v"
        echo "  rm -f .env"
        echo "  ./deploy.sh"
    fi
    exit $exit_code
}

trap cleanup EXIT

show_help() {
    cat << EOF
Usage: ./deploy.sh [OPTIONS]

Script de deploiement automatise pour PlumeNote.

Options:
  --skip-build      Passer l'etape de build (si images deja construites)
  --skip-seed       Ne pas demander pour le seed des donnees de demo
  --auto            Mode non-interactif (genere tout automatiquement)
  --ssl DOMAIN      Configurer SSL automatiquement pour DOMAIN
  --help            Afficher cette aide

Exemples:
  ./deploy.sh                           # Deploiement interactif
  ./deploy.sh --auto                    # Deploiement automatique
  ./deploy.sh --auto --ssl example.com  # Deploiement avec SSL
  ./deploy.sh --skip-build              # Redemarrage sans rebuild

EOF
}

# =============================================================================
# Parsing des arguments
# =============================================================================

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-seed)
                SKIP_SEED=true
                shift
                ;;
            --auto)
                AUTO_MODE=true
                shift
                ;;
            --ssl)
                if [[ -z "$2" || "$2" == --* ]]; then
                    print_error "L'option --ssl necessite un nom de domaine"
                    exit 1
                fi
                SSL_DOMAIN="$2"
                shift 2
                ;;
            --help|-h)
                SHOW_HELP=true
                shift
                ;;
            *)
                print_error "Option inconnue: $1"
                echo "Utilisez --help pour voir les options disponibles."
                exit 1
                ;;
        esac
    done
}

# =============================================================================
# Phase 1 : Verifications pre-requis
# =============================================================================

check_prerequisites() {
    print_step "Verification des prerequis..."

    # Verifier Docker
    if command -v docker &> /dev/null; then
        local docker_version
        docker_version=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        print_success "Docker ${docker_version}"
    else
        print_error "Docker n'est pas installe"
        echo
        echo "Installation : https://docs.docker.com/engine/install/"
        exit 1
    fi

    # Verifier que Docker fonctionne
    if ! docker info &> /dev/null; then
        print_error "Docker n'est pas en cours d'execution ou permissions insuffisantes"
        echo
        echo "Solutions :"
        echo "  - Demarrer Docker : sudo systemctl start docker"
        echo "  - Ajouter l'utilisateur au groupe docker : sudo usermod -aG docker \$USER"
        exit 1
    fi

    # Verifier Docker Compose
    if docker compose version &> /dev/null; then
        local compose_version
        compose_version=$(docker compose version --short 2>/dev/null || docker compose version | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+')
        print_success "Docker Compose ${compose_version}"
    else
        print_error "Docker Compose n'est pas installe"
        echo
        echo "Docker Compose v2 est inclus avec Docker Desktop."
        echo "Sur Linux : https://docs.docker.com/compose/install/"
        exit 1
    fi

    # Verifier le repertoire
    if [[ ! -f "${SCRIPT_DIR}/docker-compose.yml" ]]; then
        print_error "Fichier docker-compose.yml non trouve"
        echo
        echo "Assurez-vous d'executer ce script depuis le repertoire docker/"
        exit 1
    fi
    print_success "Repertoire docker/ detecte"

    # Verifier openssl pour la generation des secrets
    if ! command -v openssl &> /dev/null; then
        print_warning "openssl non trouve - les secrets seront generes avec /dev/urandom"
    fi

    echo
}

# =============================================================================
# Phase 2 : Configuration .env
# =============================================================================

configure_env() {
    print_step "Configuration .env..."

    cd "$SCRIPT_DIR"

    if [[ -f .env ]]; then
        print_success "Fichier .env existant detecte"
        if prompt_yes_no "Voulez-vous le conserver" "Y"; then
            print_info "Conservation du .env existant"
            echo
            return
        fi
        print_info "Recreation du fichier .env"
    fi

    # Copier le template
    if [[ ! -f .env.example ]]; then
        print_error "Fichier .env.example non trouve"
        exit 1
    fi

    cp .env.example .env

    # Generer JWT_SECRET
    local jwt_secret
    jwt_secret=$(generate_secret)
    sed -i "s/CHANGEZ_MOI_jwt_secret_32_chars_minimum/${jwt_secret}/" .env
    print_success "JWT_SECRET genere"
    log "JWT_SECRET generated (hidden)"

    # Generer COOKIE_SECRET
    local cookie_secret
    cookie_secret=$(generate_secret)
    sed -i "s/CHANGEZ_MOI_cookie_secret_32_chars/${cookie_secret}/" .env
    print_success "COOKIE_SECRET genere"
    log "COOKIE_SECRET generated (hidden)"

    # POSTGRES_PASSWORD
    local pg_password
    if [[ "$AUTO_MODE" == true ]]; then
        pg_password=$(generate_secret)
        print_success "POSTGRES_PASSWORD genere automatiquement"
    else
        local default_pg_password
        default_pg_password=$(generate_secret)
        echo -e "   ${CYAN}→${NC} POSTGRES_PASSWORD [Entree=auto-genere]"
        read -r -s -p "     Mot de passe: " pg_password
        echo
        pg_password="${pg_password:-$default_pg_password}"
        print_success "POSTGRES_PASSWORD configure"
    fi
    sed -i "s/CHANGEZ_MOI_mot_de_passe_securise/${pg_password}/" .env
    log "POSTGRES_PASSWORD configured (hidden)"

    # REDIS_PASSWORD
    local redis_password
    if [[ "$AUTO_MODE" == true ]]; then
        redis_password=$(generate_secret)
        print_success "REDIS_PASSWORD genere automatiquement"
    else
        local default_redis_password
        default_redis_password=$(generate_secret)
        echo -e "   ${CYAN}→${NC} REDIS_PASSWORD [Entree=auto-genere]"
        read -r -s -p "     Mot de passe: " redis_password
        echo
        redis_password="${redis_password:-$default_redis_password}"
        print_success "REDIS_PASSWORD configure"
    fi
    sed -i "s/CHANGEZ_MOI_redis_password/${redis_password}/" .env
    log "REDIS_PASSWORD configured (hidden)"

    echo
}

# =============================================================================
# Phase 3 : Build des images
# =============================================================================

build_images() {
    if [[ "$SKIP_BUILD" == true ]]; then
        print_step "Build des images Docker... (ignore avec --skip-build)"
        echo
        return
    fi

    print_step "Build des images Docker..."
    print_info "Cette etape peut prendre plusieurs minutes..."

    cd "$SCRIPT_DIR"

    if ! docker compose build --no-cache >> "$LOG_FILE" 2>&1; then
        print_error "Le build a echoue"
        echo
        echo "Causes possibles :"
        echo "  - Probleme reseau (telechargement des images de base)"
        echo "  - Erreur dans les Dockerfiles"
        echo "  - Espace disque insuffisant"
        echo
        echo "Consultez ${LOG_FILE} pour les details."
        exit 1
    fi

    print_success "api"
    print_success "yjs"
    print_success "web"

    echo
}

# =============================================================================
# Phase 4 : Demarrage des services
# =============================================================================

wait_for_healthy() {
    local service="$1"
    local timeout="$2"
    local elapsed=0

    while [[ $elapsed -lt $timeout ]]; do
        local status
        status=$(docker compose ps "$service" --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

        if [[ "$status" == "healthy" ]]; then
            return 0
        fi

        sleep 2
        elapsed=$((elapsed + 2))
    done

    return 1
}

start_services() {
    print_step "Demarrage des services..."

    cd "$SCRIPT_DIR"

    if ! docker compose up -d >> "$LOG_FILE" 2>&1; then
        print_error "Le demarrage des services a echoue"
        echo
        echo "Verifiez les logs avec : docker compose logs"
        exit 1
    fi

    # Attendre PostgreSQL
    echo -ne "   ${CYAN}→${NC} postgres (attente health check)..."
    if wait_for_healthy "postgres" 60; then
        echo -e "\r   ${GREEN}✓${NC} postgres (healthy)          "
    else
        echo -e "\r   ${RED}✗${NC} postgres (timeout)           "
        print_error "PostgreSQL n'a pas demarre correctement"
        echo "Logs : docker compose logs postgres"
        exit 1
    fi

    # Attendre Redis
    echo -ne "   ${CYAN}→${NC} redis (attente health check)..."
    if wait_for_healthy "redis" 30; then
        echo -e "\r   ${GREEN}✓${NC} redis (healthy)             "
    else
        echo -e "\r   ${RED}✗${NC} redis (timeout)              "
        print_error "Redis n'a pas demarre correctement"
        echo "Logs : docker compose logs redis"
        exit 1
    fi

    # Attendre un peu que les autres services demarrent
    sleep 5

    # Verifier les autres services
    local services=("api" "yjs" "web" "nginx")
    for svc in "${services[@]}"; do
        local status
        status=$(docker compose ps "$svc" --format "{{.Status}}" 2>/dev/null | head -1)
        if [[ "$status" == *"Up"* ]]; then
            print_success "$svc"
        else
            print_error "$svc (${status:-not running})"
            echo "Logs : docker compose logs $svc"
        fi
    done

    echo
}

# =============================================================================
# Phase 5 : Migrations Prisma
# =============================================================================

run_migrations() {
    print_step "Migrations Prisma..."

    cd "$SCRIPT_DIR"

    # Attendre que l'API soit prete
    sleep 3

    local output
    if output=$(docker compose exec -T api npx prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma 2>&1); then
        local migration_count
        migration_count=$(echo "$output" | grep -c "applied" || echo "0")
        if [[ "$migration_count" -gt 0 ]]; then
            print_success "${migration_count} migration(s) appliquee(s)"
        else
            print_success "Base de donnees a jour"
        fi
        log "Migrations output: $output"
    else
        print_error "Les migrations ont echoue"
        log "Migration error: $output"
        echo
        echo "Erreur : $output"
        echo
        echo "Solutions possibles :"
        echo "  - Verifier la connexion a PostgreSQL"
        echo "  - Executer manuellement : docker compose exec api npx prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma"

        if ! prompt_yes_no "Voulez-vous continuer malgre l'erreur" "N"; then
            exit 1
        fi
    fi

    echo
}

# =============================================================================
# Phase 6 : Seed (optionnel)
# =============================================================================

run_seed() {
    if [[ "$SKIP_SEED" == true ]]; then
        return
    fi

    print_step "Donnees de demonstration..."

    if prompt_yes_no "Creer les donnees de demo (admin, demo, guest)" "Y"; then
        local output
        if output=$(docker compose exec -T api sh -c "cd /app/packages/database && npx tsx prisma/seed.ts" 2>&1); then
            print_success "Utilisateurs et donnees de demo crees"
            log "Seed output: $output"
        else
            print_warning "Le seed a rencontre une erreur (peut-etre deja execute)"
            log "Seed error: $output"
        fi
    else
        print_info "Seed ignore"
    fi

    echo
}

# =============================================================================
# Phase 7 : Configuration SSL (optionnel)
# =============================================================================

configure_ssl() {
    local domain="$SSL_DOMAIN"

    if [[ -z "$domain" ]]; then
        print_step "Configuration HTTPS..."

        if ! prompt_yes_no "Voulez-vous configurer HTTPS maintenant" "N"; then
            print_info "Configuration HTTPS ignoree"
            print_info "Vous pouvez l'activer plus tard en suivant DEPLOY.md"
            echo
            return
        fi

        domain=$(prompt_input "Nom de domaine (ex: example.com)" "" false)
        if [[ -z "$domain" ]]; then
            print_warning "Aucun domaine specifie, HTTPS ignore"
            echo
            return
        fi
    else
        print_step "Configuration HTTPS pour ${domain}..."
    fi

    cd "$SCRIPT_DIR"

    # Verifier certbot
    if ! command -v certbot &> /dev/null; then
        print_warning "certbot n'est pas installe"
        if prompt_yes_no "Voulez-vous installer certbot" "Y"; then
            if command -v apt &> /dev/null; then
                sudo apt update && sudo apt install -y certbot >> "$LOG_FILE" 2>&1
                print_success "certbot installe"
            elif command -v yum &> /dev/null; then
                sudo yum install -y certbot >> "$LOG_FILE" 2>&1
                print_success "certbot installe"
            else
                print_error "Impossible d'installer certbot automatiquement"
                echo "Installez manuellement : https://certbot.eff.org/"
                echo
                return
            fi
        else
            print_info "Configuration SSL annulee"
            echo
            return
        fi
    fi

    # Arreter nginx
    print_info "Arret de nginx pour la validation du certificat..."
    docker compose stop nginx >> "$LOG_FILE" 2>&1

    # Obtenir le certificat
    print_info "Obtention du certificat Let's Encrypt..."
    local email
    if [[ "$AUTO_MODE" == true ]]; then
        email="admin@${domain}"
    else
        email=$(prompt_input "Email pour les notifications Let's Encrypt" "admin@${domain}" false)
    fi

    if sudo certbot certonly --standalone -d "$domain" -d "www.${domain}" \
        --agree-tos --non-interactive --email "$email" >> "$LOG_FILE" 2>&1; then
        print_success "Certificat obtenu"
    else
        print_error "Echec de l'obtention du certificat"
        echo "Verifiez que :"
        echo "  - Le domaine pointe vers ce serveur (DNS)"
        echo "  - Les ports 80 et 443 sont ouverts"
        docker compose start nginx >> "$LOG_FILE" 2>&1
        echo
        return
    fi

    # Copier les certificats
    print_info "Copie des certificats..."
    sudo cat "/etc/letsencrypt/live/${domain}/fullchain.pem" > ssl/fullchain.pem
    sudo cat "/etc/letsencrypt/live/${domain}/privkey.pem" > ssl/privkey.pem
    chmod 600 ssl/*.pem
    print_success "Certificats copies"

    # Configurer nginx avec SSL
    print_info "Configuration de nginx pour HTTPS..."
    cp nginx/nginx-ssl.conf nginx/nginx.conf
    sed -i "s/votredomaine.fr/${domain}/g" nginx/nginx.conf
    print_success "nginx configure pour ${domain}"

    # Mettre a jour .env
    sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://${domain},https://www.${domain}|" .env
    sed -i "s/NODE_ENV=.*/NODE_ENV=production/" .env
    print_success ".env mis a jour"

    # Redemarrer nginx
    docker compose up -d nginx >> "$LOG_FILE" 2>&1
    print_success "nginx redemarre avec HTTPS"

    echo
}

# =============================================================================
# Phase 8 : Verification finale
# =============================================================================

verify_deployment() {
    print_step "Verification du deploiement..."

    cd "$SCRIPT_DIR"

    # Afficher le statut des containers
    echo
    docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
    echo

    # Tester l'endpoint health
    local health_url
    if [[ -n "$SSL_DOMAIN" ]]; then
        health_url="https://${SSL_DOMAIN}/health"
    else
        health_url="http://localhost/health"
    fi

    print_info "Test de l'endpoint ${health_url}..."
    sleep 2

    local health_response
    if health_response=$(curl -s -o /dev/null -w "%{http_code}" "$health_url" 2>/dev/null); then
        if [[ "$health_response" == "200" ]]; then
            print_success "API accessible (HTTP ${health_response})"
        else
            print_warning "API repond avec HTTP ${health_response}"
        fi
    else
        # Essayer /api/health
        if health_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/api/health" 2>/dev/null); then
            if [[ "$health_response" == "200" ]]; then
                print_success "API accessible sur /api/health (HTTP ${health_response})"
            else
                print_warning "API repond avec HTTP ${health_response}"
            fi
        else
            print_warning "Impossible de contacter l'API (le service peut encore demarrer)"
        fi
    fi

    echo
}

# =============================================================================
# Phase 9 : Affichage final
# =============================================================================

show_final_message() {
    local url
    if [[ -n "$SSL_DOMAIN" ]]; then
        url="https://${SSL_DOMAIN}"
    else
        url="http://localhost"
    fi

    echo
    echo -e "${GREEN}${BOLD}"
    cat << 'EOF'
    ╔════════════════════════════════════════════════════════════╗
    ║                                                            ║
    ║         PlumeNote deploye avec succes !                    ║
    ║                                                            ║
    ╚════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"

    echo -e "    ${BOLD}URL:${NC} ${CYAN}${url}${NC}"
    echo

    if [[ "$SKIP_SEED" != true ]]; then
        echo -e "    ${BOLD}Identifiants de demo :${NC}"
        echo "      - admin / password123"
        echo "      - demo / password123"
        echo "      - guest / password123"
        echo
    fi

    echo -e "    ${BOLD}Commandes utiles :${NC}"
    echo "      docker compose logs -f        # Voir les logs en temps reel"
    echo "      docker compose ps             # Statut des services"
    echo "      docker compose down           # Arreter les services"
    echo "      docker compose restart api    # Redemarrer un service"
    echo

    echo -e "    ${BOLD}Logs de deploiement :${NC} ${LOG_FILE}"
    echo
}

# =============================================================================
# Main
# =============================================================================

main() {
    # Initialiser le fichier de log
    echo "=== Deploiement PlumeNote - $(date) ===" > "$LOG_FILE"

    # Parser les arguments
    parse_arguments "$@"

    # Afficher l'aide si demande
    if [[ "$SHOW_HELP" == true ]]; then
        show_help
        exit 0
    fi

    # Banniere
    echo
    echo -e "${CYAN}${BOLD}"
    cat << 'EOF'
    ╔═══════════════════════════════════════════╗
    ║     PlumeNote - Deploiement Docker        ║
    ╚═══════════════════════════════════════════╝
EOF
    echo -e "${NC}"

    # Executer les phases
    check_prerequisites
    configure_env
    build_images
    start_services
    run_migrations
    run_seed
    configure_ssl
    verify_deployment
    show_final_message

    # Desactiver le trap de cleanup en cas de succes
    trap - EXIT
}

main "$@"
