# Deploiement PlumeNote

## Production

- **URL** : https://plumenote.fr
- **Serveur** : VPS Debian 12 (OVH)
- **Documentation complete** : Voir fichier local `plumenote-production.md` (non versionne)

---

## Prerequis

- Cle SSH configuree (`~/.ssh/plumenote_ed25519`)
- Alias SSH configure (optionnel) : `ssh plumenote`
- Build local doit passer AVANT tout deploiement

---

## Deploiement standard

### 1. Verifier le build en local

```bash
npm run build
```

Si le build echoue, corriger les erreurs AVANT de continuer.

### 2. Commit et push

```bash
git add -A
git commit -m "description des changements"
git push origin main
```

### 3. Deployer sur le VPS

```bash
# Connexion
ssh plumenote

# Mise a jour du code
cd /opt/plumenote/app
git pull origin main

# Rebuild et redemarrage
cd /opt/plumenote
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Verification
docker compose -f docker-compose.prod.yml ps
```

Tous les containers doivent afficher "healthy".

### 4. Appliquer les migrations (si necessaire)

```bash
docker exec plumenote-api npx prisma migrate deploy
```

---

## Structure serveur

```
/opt/plumenote/
├── .env                        # Secrets (voir doc locale)
├── docker-compose.prod.yml     # Configuration Docker
├── app/                        # Code source (git clone)
├── nginx/
│   ├── nginx.conf
│   └── conf.d/plumenote.conf
├── ssl/
│   ├── fullchain.pem
│   └── privkey.pem
└── renew-ssl.sh
```

---

## Commandes utiles

### Logs

```bash
# Logs API
docker compose -f docker-compose.prod.yml logs -f api

# Logs Nginx
docker compose -f docker-compose.prod.yml logs -f nginx

# Tous les logs
docker compose -f docker-compose.prod.yml logs -f
```

### Redemarrage

```bash
# Un service
docker compose -f docker-compose.prod.yml restart api

# Tous les services
docker compose -f docker-compose.prod.yml restart
```

### Base de donnees

```bash
# Console PostgreSQL
docker exec -it plumenote-postgres psql -U plumenote_user -d plumenote

# Backup
docker exec plumenote-postgres pg_dump -U plumenote_user plumenote > backup_$(date +%Y%m%d).sql
```

### Nettoyage Docker

```bash
# Nettoyer le cache (apres un build)
docker system prune -af
docker builder prune -af
```

---

## Depannage

### Container qui redémarre en boucle

```bash
docker compose -f docker-compose.prod.yml logs <service> --tail=100
```

### Erreur variables d'environnement

Verifier `/opt/plumenote/.env` - Variables requises :
- POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
- REDIS_PASSWORD
- JWT_SECRET (64+ caracteres)
- COOKIE_SECRET (64+ caracteres)
- CORS_ORIGINS
- API_URL, WEB_URL, YJS_URL

### Reset complet (dernier recours)

```bash
cd /opt/plumenote
docker compose -f docker-compose.prod.yml down
docker system prune -af
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Certificat SSL

```bash
# Verifier expiration
openssl s_client -connect plumenote.fr:443 -servername plumenote.fr 2>/dev/null | openssl x509 -noout -dates

# Renouveler manuellement
sudo /opt/plumenote/renew-ssl.sh
```

---

## Securite

- SSH : Port 2222, cle uniquement, root desactive
- Firewall : UFW (ports 2222, 80, 443)
- Fail2ban : Ban 24h apres 3 echecs SSH
- SSL : Let's Encrypt, renouvellement auto
