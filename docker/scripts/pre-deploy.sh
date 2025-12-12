#!/bin/bash
# PlumeNote - Pré-déploiement : vérifie l'état et crée un backup
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BACKUP_DIR="/root/PlumeNote/backups/$(date +%Y%m%d_%H%M%S)"

echo "╔═══════════════════════════════════════════╗"
echo "║     PlumeNote - Pré-déploiement           ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

cd /root/PlumeNote/docker

# Vérifier les conteneurs
echo -n "Conteneurs Docker... "
RUNNING=$(docker compose ps 2>/dev/null | grep -c "Up" || echo "0")
if [ "$RUNNING" -ge 5 ]; then
    echo -e "${GREEN}✓ $RUNNING running${NC}"
else
    echo -e "${YELLOW}⚠ Seulement $RUNNING running${NC}"
fi

# Vérifier SSL actif
echo -n "HTTPS actif... "
if grep -q "listen 443 ssl" nginx/nginx.conf 2>/dev/null; then
    echo -e "${GREEN}✓ SSL configuré${NC}"
    SSL_ACTIVE=true
else
    echo -e "${YELLOW}⚠ Pas de SSL${NC}"
    SSL_ACTIVE=false
fi

# Créer backup
echo ""
echo "── Création du backup ─────────────────────"
mkdir -p "$BACKUP_DIR"
cp nginx/nginx.conf "$BACKUP_DIR/nginx.conf.bak"
docker compose ps > "$BACKUP_DIR/docker-state.txt" 2>/dev/null
echo -e "${GREEN}✓ Backup créé : $BACKUP_DIR${NC}"

# Vérifier les modifications à venir
echo ""
echo "── Modifications Git à venir ──────────────"
git fetch origin main 2>/dev/null
CHANGES=$(git diff --name-only HEAD origin/main 2>/dev/null || echo "")

if [ -n "$CHANGES" ]; then
    echo "$CHANGES" | while read -r file; do
        if [[ "$file" == *"nginx"* ]]; then
            echo -e "  ${YELLOW}⚠ $file${NC}"
        else
            echo "  - $file"
        fi
    done
else
    echo "Aucune modification"
fi

# Alerte nginx + SSL
if echo "$CHANGES" | grep -q "nginx/nginx.conf" && [ "$SSL_ACTIVE" = true ]; then
    echo ""
    echo -e "${RED}══════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  ATTENTION : nginx.conf modifié ET SSL actif !           ${NC}"
    echo -e "${RED}  Vérifiez que nginx-ssl.conf.template est aussi à jour   ${NC}"
    echo -e "${RED}══════════════════════════════════════════════════════════${NC}"
    if [ "$1" != "--force" ]; then
        echo "Utilisez --force pour continuer"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}✓ Pré-déploiement OK${NC}"
echo "Backup : $BACKUP_DIR"
