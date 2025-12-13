# Déploiement PlumeNote

## Déploiement standard

```bash
ssh user@your-server.example.com
cd /root/PlumeNote/docker
./scripts/deploy.sh --auto-rollback
```

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
