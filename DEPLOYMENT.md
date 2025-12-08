# Déploiement PlumeNote

## Prérequis
- Accès SSH au VPS : ssh root@51.178.53.103
- Le build local doit passer AVANT tout déploiement

## Étape 1 : Vérifier le build en local
```bash
cd /home/alex/Documents/REPO/KM/plumenote
npm run build
```

Si le build échoue, corriger les erreurs AVANT de continuer.

## Étape 2 : Commit et push
```bash
git add -A
git commit -m "description des changements"
git push origin main
```

## Étape 3 : Déployer sur le VPS
```bash
ssh root@51.178.53.103
cd /opt/plumenote
git pull origin main
cd docker
docker compose build --no-cache
docker compose up -d --force-recreate
docker compose ps
```

Tous les containers doivent afficher "Up".

## Étape 4 : Appliquer les migrations (si nouvelles migrations)
```bash
docker compose exec api npx prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma
```

## Dépannage

### Voir les logs
```bash
docker compose logs api --tail=50
docker compose logs web --tail=50
docker compose logs nginx --tail=50
```

### Container qui redémarre en boucle
```bash
docker compose logs <service> --tail=100
```

### Erreur variables d'environnement
Vérifier .env :
```bash
cat /opt/plumenote/docker/.env
```

Variables requises :
- POSTGRES_PASSWORD
- JWT_SECRET (32+ caractères)
- COOKIE_SECRET (32+ caractères)
- REDIS_PASSWORD
- CORS_ORIGINS

### Reset complet (dernier recours)
```bash
docker compose down
docker system prune -af
docker compose build --no-cache
docker compose up -d
```
