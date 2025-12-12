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
