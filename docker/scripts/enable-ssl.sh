#!/bin/bash
set -e

# Source common functions
SCRIPT_DIR="$(dirname "$0")"
if [ -f "$SCRIPT_DIR/common.sh" ]; then
    source "$SCRIPT_DIR/common.sh"
else
    RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
    log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
    log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
    log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
fi

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

# Copier automatiquement les certificats Let's Encrypt s'ils existent
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
    log_info "Certificats Let's Encrypt trouvés, copie automatique..."
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/
    log_success "Certificats copiés"
fi

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
    echo ""
    echo "  Pour renouveler/étendre un certificat existant, ajoutez --expand"
    exit 1
fi

log_info "Certificats trouvés"

# Générer la config nginx avec le domaine
log_info "Génération de la configuration nginx SSL..."
sed "s/\${DOMAIN}/${DOMAIN}/g" nginx/nginx-ssl.conf.template > nginx/nginx.conf

# Vérifier que le domaine a été substitué
if grep -q '\${DOMAIN}' nginx/nginx.conf; then
    log_error "Erreur: \${DOMAIN} non substitué dans nginx.conf"
    log_error "Vérifiez que DOMAIN est défini dans .env (actuel: $DOMAIN)"
    exit 1
fi
log_info "Configuration nginx générée pour $DOMAIN"

# Mettre à jour CORS_ORIGINS si nécessaire
if [[ "$CORS_ORIGINS" != *"https://$DOMAIN"* ]]; then
    log_warn "Mise à jour de CORS_ORIGINS dans .env"
    sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN|" .env
fi

# Redémarrer nginx
log_info "Redémarrage de nginx..."
docker compose restart nginx

# Attendre que nginx soit prêt
log_info "Attente que nginx soit prêt..."
sleep 3
for i in {1..10}; do
    if curl -sk --max-time 2 https://localhost/ > /dev/null 2>&1; then
        log_success "Nginx HTTPS opérationnel"
        break
    fi
    if [ $i -eq 10 ]; then
        log_warn "Nginx peut nécessiter quelques secondes supplémentaires"
    fi
    sleep 1
done

log_info "SSL activé pour https://$DOMAIN"
echo ""
echo "Vérifiez avec: curl -I https://$DOMAIN"
