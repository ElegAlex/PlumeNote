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
if echo "$RESPONSE" | grep -q "UNAUTHORIZED\|Invalid\|Unauthorized"; then
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
if echo "$RESPONSE" | grep -q "validation\|Invalid\|401\|400\|Unauthorized"; then
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
if [ "$HTTP_CODE" = "101" ] || [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "426" ] || [ "$HTTP_CODE" = "400" ]; then
    log_ok "WebSocket Yjs accessible (HTTP $HTTP_CODE)"
else
    log_fail "WebSocket Yjs inaccessible (HTTP $HTTP_CODE)"
fi

# Test 6: WebSocket Sync
echo "6. Test WebSocket Sync..."
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT \
    -H "Upgrade: websocket" -H "Connection: Upgrade" \
    "$BASE_URL/ws/sync" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "101" ] || [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "426" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "404" ]; then
    log_ok "WebSocket Sync accessible (HTTP $HTTP_CODE)"
else
    log_fail "WebSocket Sync inaccessible (HTTP $HTTP_CODE)"
fi

# Test 7: Assets statiques
echo "7. Test assets statiques..."
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL/assets/" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "404" ]; then
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
