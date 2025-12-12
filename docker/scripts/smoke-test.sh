#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_URL="${1:-http://localhost}"
TIMEOUT=10
FAILED=0
WSCAT_AVAILABLE=false

log_ok() { echo -e "${GREEN}✓${NC} $1"; }
log_fail() { echo -e "${RED}✗${NC} $1"; FAILED=$((FAILED + 1)); }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_info() { echo -e "${BLUE}ℹ${NC} $1"; }

# Vérifier si wscat est disponible
if command -v wscat &> /dev/null; then
    WSCAT_AVAILABLE=true
elif command -v websocat &> /dev/null; then
    WSCAT_AVAILABLE=true
fi

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║     PlumeNote - Tests de validation       ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "URL de base: $BASE_URL"
if [ "$WSCAT_AVAILABLE" = true ]; then
    echo "WebSocket client: disponible"
else
    echo "WebSocket client: non disponible (tests WS simplifies)"
fi
echo ""

# =============================================================================
# Tests HTTP basiques
# =============================================================================

echo "── Tests HTTP ──────────────────────────────"

# Test 1: Page d'accueil
echo -n "1. Page d'accueil... "
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL/" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    log_ok "HTTP $HTTP_CODE"
else
    log_fail "HTTP $HTTP_CODE"
fi

# Test 2: Health check nginx
echo -n "2. Health check nginx... "
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    log_ok "HTTP $HTTP_CODE"
else
    log_fail "HTTP $HTTP_CODE"
fi

# Test 3: API health check avec verification JSON
echo -n "3. API health... "
RESPONSE=$(curl -s --max-time $TIMEOUT "$BASE_URL/api/health" 2>/dev/null || echo '{}')
if echo "$RESPONSE" | grep -q '"status":"ok"'; then
    log_ok "API healthy"
else
    log_fail "API health non valide: $RESPONSE"
fi

# =============================================================================
# Tests Authentification
# =============================================================================

echo ""
echo "── Tests Authentification ─────────────────"

# Test 4: Endpoint auth/me (doit retourner 401)
echo -n "4. Auth check (401 attendu)... "
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL/api/v1/auth/me" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "401" ]; then
    log_ok "HTTP $HTTP_CODE (correct)"
else
    log_fail "HTTP $HTTP_CODE (attendu: 401)"
fi

# Test 5: Login avec mauvais credentials
echo -n "5. Login invalide (400/401 attendu)... "
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"invalid@test.com","password":"wrongpassword"}' \
    "$BASE_URL/api/v1/auth/login" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ]; then
    log_ok "HTTP $HTTP_CODE (correct)"
else
    log_fail "HTTP $HTTP_CODE (attendu: 400 ou 401)"
fi

# =============================================================================
# Tests WebSocket
# =============================================================================

echo ""
echo "── Tests WebSocket ─────────────────────────"

# Test 6: WebSocket Yjs
echo -n "6. WebSocket Yjs (/ws)... "
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT \
    -H "Upgrade: websocket" -H "Connection: Upgrade" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    -H "Sec-WebSocket-Version: 13" \
    "$BASE_URL/ws" 2>/dev/null || echo "000")
# Extraire uniquement les 3 premiers chiffres (code HTTP)
HTTP_CODE="${HTTP_CODE:0:3}"
if [ "$HTTP_CODE" = "101" ] || [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "426" ]; then
    log_ok "Endpoint accessible (HTTP $HTTP_CODE)"
else
    log_fail "HTTP $HTTP_CODE"
fi

# Test 7: WebSocket Sync
echo -n "7. WebSocket Sync (/ws/sync)... "
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT \
    -H "Upgrade: websocket" -H "Connection: Upgrade" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    -H "Sec-WebSocket-Version: 13" \
    "$BASE_URL/ws/sync" 2>/dev/null || echo "000")
# 401 = auth required (correct), 101/200/400/426 = endpoint accessible
if [ "$HTTP_CODE" = "101" ] || [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "426" ]; then
    log_ok "Endpoint accessible (HTTP $HTTP_CODE)"
else
    log_warn "HTTP $HTTP_CODE (comportement inattendu)"
fi

# =============================================================================
# Tests Assets statiques
# =============================================================================

echo ""
echo "── Tests Assets ────────────────────────────"

# Test 8: Fichier index.html
echo -n "8. Index HTML valide... "
RESPONSE=$(curl -s --max-time $TIMEOUT "$BASE_URL/" 2>/dev/null || echo "")
if echo "$RESPONSE" | grep -q '<!DOCTYPE html>\|<html'; then
    log_ok "HTML valide"
else
    log_fail "HTML invalide"
fi

# Test 9: Assets JS
echo -n "9. Assets JavaScript... "
ASSET_URL=$(echo "$RESPONSE" | grep -oE 'src="(/assets/[^"]+\.js)"' | head -1 | sed 's/src="//;s/"//' || echo "")
if [ -n "$ASSET_URL" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL$ASSET_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        log_ok "JS accessible"
    else
        log_warn "JS retourne HTTP $HTTP_CODE"
    fi
else
    log_warn "Pas de JS externe detecte"
fi

# =============================================================================
# Tests Docker (si disponible)
# =============================================================================

echo ""
echo "── Tests Conteneurs ────────────────────────"

if command -v docker &> /dev/null && [ -f "docker-compose.yml" ]; then
    # Test 10: Conteneurs running
    echo -n "10. Conteneurs Docker... "
    DOCKER_STATUS=$(docker compose ps 2>/dev/null)
    RUNNING=$(echo "$DOCKER_STATUS" | grep -c "Up" || echo "0")
    if [ "$RUNNING" -ge 5 ]; then
        log_ok "$RUNNING conteneurs running"
    else
        log_warn "Seulement $RUNNING conteneurs running"
    fi

    # Test 11: Health checks
    echo -n "11. Health checks... "
    UNHEALTHY=$(echo "$DOCKER_STATUS" | grep -c "(unhealthy)" 2>/dev/null || true)
    UNHEALTHY=${UNHEALTHY:-0}
    HEALTHY=$(echo "$DOCKER_STATUS" | grep -c "(healthy)" 2>/dev/null || true)
    HEALTHY=${HEALTHY:-0}
    # S'assurer que les valeurs sont des entiers
    UNHEALTHY=$((UNHEALTHY + 0))
    HEALTHY=$((HEALTHY + 0))
    if [ "$UNHEALTHY" -eq 0 ] && [ "$HEALTHY" -ge 3 ]; then
        log_ok "$HEALTHY healthy, 0 unhealthy"
    elif [ "$UNHEALTHY" -eq 0 ]; then
        log_warn "$HEALTHY healthy (certains sans health check)"
    else
        log_fail "$HEALTHY healthy, $UNHEALTHY unhealthy"
    fi
else
    echo "10-11. Docker non disponible ou hors contexte, skip"
fi

# =============================================================================
# Tests de performance basiques
# =============================================================================

echo ""
echo "── Tests Performance ───────────────────────"

# Test 12: Temps de reponse page d'accueil
echo -n "12. Temps de reponse... "
TIME_TOTAL=$(curl -s -o /dev/null -w '%{time_total}' --max-time $TIMEOUT "$BASE_URL/" 2>/dev/null || echo "99")
# Convertir en millisecondes (utiliser awk pour compatibilite)
TIME_MS=$(echo "$TIME_TOTAL" | awk '{printf "%.0f", $1 * 1000}' 2>/dev/null || echo "9999")
if [ -z "$TIME_MS" ] || [ "$TIME_MS" = "" ]; then
    TIME_MS=9999
fi
if [ "$TIME_MS" -lt 500 ] 2>/dev/null; then
    log_ok "${TIME_MS}ms (< 500ms)"
elif [ "$TIME_MS" -lt 2000 ] 2>/dev/null; then
    log_warn "${TIME_MS}ms (< 2000ms)"
else
    log_fail "${TIME_MS}ms (trop lent)"
fi

# =============================================================================
# Resume
# =============================================================================

echo ""
echo "═══════════════════════════════════════════"
TOTAL_TESTS=12
PASSED=$((TOTAL_TESTS - FAILED))
echo "Resultat: $PASSED/$TOTAL_TESTS tests passes"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Tous les tests ont reussi !${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ $FAILED test(s) ont echoue${NC}"
    exit 1
fi
