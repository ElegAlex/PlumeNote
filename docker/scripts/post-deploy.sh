#!/bin/bash
# PlumeNote - Post-déploiement : valide et rollback si échec
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DOMAIN="${DOMAIN:-plumenote.fr}"
PROTOCOL="${PROTOCOL:-https}"
TIMEOUT=10
FAILED=0

echo "╔═══════════════════════════════════════════╗"
echo "║     PlumeNote - Post-déploiement          ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "Validation : ${PROTOCOL}://${DOMAIN}"
echo ""

cd /root/PlumeNote/docker

# Attendre healthy (max 90s)
echo "── Attente des conteneurs ─────────────────"
echo -n "Attente... "
for i in {1..18}; do
    UNHEALTHY=$(docker compose ps 2>/dev/null | grep -c "(unhealthy)" || echo "0")
    STARTING=$(docker compose ps 2>/dev/null | grep -c "starting" || echo "0")
    if [ "$UNHEALTHY" = "0" ] && [ "$STARTING" = "0" ]; then
        echo -e "${GREEN}✓ OK${NC}"
        break
    fi
    [ "$i" = "18" ] && { echo -e "${RED}✗ Timeout${NC}"; FAILED=$((FAILED + 1)); }
    sleep 5
done

# Tests critiques
echo ""
echo "── Tests critiques ────────────────────────"

echo -n "1. Page d'accueil... "
HTTP_CODE=$(curl -sk -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "${PROTOCOL}://${DOMAIN}/" 2>/dev/null || echo "000")
[ "$HTTP_CODE" = "200" ] && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗ $HTTP_CODE${NC}"; FAILED=$((FAILED + 1)); }

echo -n "2. API health... "
RESPONSE=$(curl -sk --max-time $TIMEOUT "${PROTOCOL}://${DOMAIN}/api/health" 2>/dev/null || echo '{}')
echo "$RESPONSE" | grep -q '"status":"ok"' && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILED=$((FAILED + 1)); }

echo -n "3. Auth (401)... "
HTTP_CODE=$(curl -sk -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "${PROTOCOL}://${DOMAIN}/api/v1/auth/me" 2>/dev/null || echo "000")
[ "$HTTP_CODE" = "401" ] && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗ $HTTP_CODE${NC}"; FAILED=$((FAILED + 1)); }

if [ "$PROTOCOL" = "https" ]; then
    echo -n "4. Certificat SSL... "
    CERT=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    [ -n "$CERT" ] && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILED=$((FAILED + 1)); }
fi

# Résultat
echo ""
echo "═══════════════════════════════════════════"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Déploiement validé !${NC}"
    exit 0
fi

echo -e "${RED}✗ $FAILED test(s) échoué(s)${NC}"

# Rollback
LAST_BACKUP=$(ls -td /root/PlumeNote/backups/*/ 2>/dev/null | head -1)
if [ -n "$LAST_BACKUP" ] && [ -f "${LAST_BACKUP}nginx.conf.bak" ]; then
    if [ "$1" = "--auto-rollback" ]; then
        echo "Rollback automatique..."
        cp "${LAST_BACKUP}nginx.conf.bak" nginx/nginx.conf
        docker compose restart nginx
        sleep 5
        HTTP_CODE=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 "${PROTOCOL}://${DOMAIN}/" 2>/dev/null || echo "000")
        [ "$HTTP_CODE" = "200" ] && echo -e "${GREEN}✓ Rollback OK${NC}" || echo -e "${RED}✗ Rollback échoué${NC}"
    else
        echo "Rollback disponible : ./scripts/post-deploy.sh --auto-rollback"
    fi
fi
exit 1
