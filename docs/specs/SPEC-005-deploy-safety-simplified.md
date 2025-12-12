# SPEC-005 : Fiabilisation du déploiement

## 1. Résumé

|Attribut|Valeur|
|---|---|
|Type|Infrastructure / DevOps|
|Priorité|P1-Haute|
|Complexité|S|
|Estimation|2 heures|
|Prérequis|HTTPS réparé (fait)|

### Objectif

Mettre en place des garde-fous pour éviter qu'un déploiement casse la production (comme SPEC-004 a cassé HTTPS).

### Critères d'acceptation

- [ ] `scripts/pre-deploy.sh` créé (backup + vérification)
- [ ] `scripts/post-deploy.sh` créé (validation + rollback auto)
- [ ] `scripts/deploy.sh` créé (workflow complet)
- [ ] `smoke-test.sh` détecte automatiquement HTTPS pour plumenote.fr
- [ ] `docs/deployment.md` créé
- [ ] Scripts testés sur le VPS

---

## 2. Fichiers à créer

### 2.1 docker/scripts/pre-deploy.sh

```bash
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
```

### 2.2 docker/scripts/post-deploy.sh

```bash
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
```

### 2.3 docker/scripts/deploy.sh

```bash
#!/bin/bash
# PlumeNote - Déploiement sécurisé complet
set -e

cd /root/PlumeNote/docker

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
```

### 2.4 Modification de smoke-test.sh

Ajouter au début du script (après la définition de BASE_URL) :

```bash
# Détection automatique HTTPS pour plumenote.fr
if [[ "$BASE_URL" == *"plumenote.fr"* ]] && [[ "$BASE_URL" != https://* ]]; then
    echo -e "${YELLOW}⚠ plumenote.fr détecté → HTTPS${NC}"
    BASE_URL="https://plumenote.fr"
fi

# Test SSL si HTTPS
if [[ "$BASE_URL" == https://* ]]; then
    echo -n "Vérification SSL... "
    if curl -sk --max-time 5 "$BASE_URL/" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗ HTTPS inaccessible${NC}"
        exit 1
    fi
fi
```

### 2.5 docs/deployment.md

````markdown
# Déploiement PlumeNote

## Déploiement standard

```bash
ssh root@vps-4e7622b4.vps.ovh.net
cd /root/PlumeNote/docker
./scripts/deploy.sh --auto-rollback
````

## Étapes détaillées

### 1. Pré-déploiement

```bash
./scripts/pre-deploy.sh
```

- Vérifie l'état des conteneurs
- Crée un backup de nginx.conf
- **Bloque si nginx.conf modifié + SSL actif**

### 2. Déploiement manuel (si besoin)

```bash
git pull origin main
docker compose build --no-cache api yjs
docker compose down && docker compose up -d
```

### 3. Post-déploiement

```bash
./scripts/post-deploy.sh --auto-rollback
```

- Attend que les conteneurs soient healthy
- Teste HTTPS, API, certificat
- Rollback automatique si échec

## Règle d'or

> **Toute modification de `nginx/nginx.conf` DOIT aussi être faite dans `nginx/nginx-ssl.conf.template`**

## Rollback manuel

```bash
# Trouver le backup
ls /root/PlumeNote/backups/

# Restaurer
cp /root/PlumeNote/backups/YYYYMMDD_HHMMSS/nginx.conf.bak nginx/nginx.conf
docker compose restart nginx
```

## Checklist

- [ ] `nginx.conf` ET `nginx-ssl.conf.template` synchronisés
- [ ] `./scripts/pre-deploy.sh` OK
- [ ] `./scripts/deploy.sh --auto-rollback` OK
- [ ] https://plumenote.fr accessible
- [ ] 12/12 smoke tests

```

---

## 3. Prompt pour Claude Code

```

Implémente SPEC-005 : fiabilisation du déploiement.

CONTEXTE :

- HTTPS est réparé (commit 26d8a5f)
- On veut éviter qu'un futur déploiement casse la prod

À FAIRE :

1. Crée docker/scripts/pre-deploy.sh (voir spec section 2.1)
    
    - chmod +x
2. Crée docker/scripts/post-deploy.sh (voir spec section 2.2)
    
    - chmod +x
3. Crée docker/scripts/deploy.sh (voir spec section 2.3)
    
    - chmod +x
4. Modifie docker/scripts/smoke-test.sh
    
    - Ajoute la détection HTTPS auto (voir spec section 2.4)
    - Place le code après "BASE_URL=..." et avant les tests
5. Crée docs/deployment.md (voir spec section 2.5)
    
6. Commit : git add -A git commit -m "feat(deploy): scripts de déploiement sécurisé (SPEC-005)
    
    - pre-deploy.sh : backup + vérification SSL
    - post-deploy.sh : validation + rollback auto
    - deploy.sh : workflow complet
    - smoke-test.sh : détection HTTPS auto
    - docs/deployment.md" git push
7. Copie les scripts sur le VPS : ssh root@vps-4e7622b4.vps.ovh.net "cd /root/PlumeNote && git pull"
    
8. Test le workflow : ssh root@vps-4e7622b4.vps.ovh.net "cd /root/PlumeNote/docker && ./scripts/pre-deploy.sh"
    

VALIDATION :

- [ ] 3 scripts créés et exécutables
- [ ] smoke-test.sh modifié
- [ ] docs/deployment.md créé
- [ ] pre-deploy.sh fonctionne sur VPS
- [ ] https://plumenote.fr toujours accessible

GO.