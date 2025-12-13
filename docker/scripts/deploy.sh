#!/bin/bash
# PlumeNote - Déploiement sécurisé complet
set -e

# Source common functions
SCRIPT_DIR="$(dirname "$0")"
if [ -f "$SCRIPT_DIR/common.sh" ]; then
    source "$SCRIPT_DIR/common.sh"
else
    PROJECT_ROOT="/root/PlumeNote"
fi

cd "${PROJECT_ROOT}/docker"

echo "╔═══════════════════════════════════════════╗"
echo "║     PlumeNote - Déploiement sécurisé      ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Phase 1
echo "═══ Phase 1/4 : Pré-déploiement ═══"
./scripts/pre-deploy.sh "$@" || exit 1

# Sauvegarder si SSL actif
SSL_WAS_ACTIVE=false
if grep -q "listen 443 ssl" nginx/nginx.conf 2>/dev/null; then
    SSL_WAS_ACTIVE=true
    cp nginx/nginx.conf /tmp/nginx-ssl-backup.conf
fi

# Phase 2
echo ""
echo "═══ Phase 2/4 : Pull ═══"
git pull origin main

# Restaurer SSL si écrasé
if [ "$SSL_WAS_ACTIVE" = true ] && ! grep -q "listen 443 ssl" nginx/nginx.conf 2>/dev/null; then
    echo "⚠ Config SSL écrasée - Restauration depuis template..."
    sed 's/${DOMAIN}/plumenote.fr/g' nginx/nginx-ssl.conf.template > nginx/nginx.conf
fi

# Phase 3
echo ""
echo "═══ Phase 3/4 : Redémarrage ═══"
read -p "Rebuild images ? (y/N) " -n 1 -r
echo
[[ $REPLY =~ ^[Yy]$ ]] && docker compose build --no-cache api yjs web

docker compose down
docker compose up -d
echo "Attente 60s..."
sleep 60

# Phase 4
echo ""
echo "═══ Phase 4/4 : Validation ═══"
./scripts/post-deploy.sh "$@"
