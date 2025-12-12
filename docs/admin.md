# Guide d'administration PlumeNote

## Gestion des utilisateurs

### Roles disponibles

| Role | Description |
|------|-------------|
| `ADMIN` | Acces complet, gestion des utilisateurs |
| `EDITOR` | Peut creer et modifier des notes |
| `VIEWER` | Lecture seule |

### Modifier un role

Via SQL :

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'user@example.com';
```

## Sauvegardes

### Sauvegarde de la base de donnees

```bash
# Via Docker
docker compose exec postgres pg_dump -U plumenote plumenote > backup_$(date +%Y%m%d).sql

# Restauration
docker compose exec -T postgres psql -U plumenote plumenote < backup_20250101.sql
```

### Sauvegarde complete

```bash
# Arreter les services
docker compose stop

# Sauvegarder les volumes
docker run --rm -v plumenote_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
docker run --rm -v plumenote_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_backup.tar.gz /data

# Redemarrer
docker compose start
```

## Monitoring

### Health checks

```bash
# Status des services
docker compose ps

# Verification complete
./scripts/smoke-test.sh http://localhost
```

### Logs

```bash
# Logs en temps reel
docker compose logs -f

# Logs d'un service
docker compose logs -f api --tail 100

# Logs avec filtre
docker compose logs api 2>&1 | grep ERROR
```

### Metriques

L'endpoint `/api/health/ready` retourne :

```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "timestamp": "2025-01-01T12:00:00.000Z"
  }
}
```

## Mise a jour

### Mise a jour standard

```bash
cd PlumeNote
git pull origin main
cd docker
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Mise a jour avec migration

```bash
git pull origin main
cd docker
docker compose down
docker compose build --no-cache
docker compose up -d
docker compose exec api npx prisma migrate deploy
```

## Depannage

### Conteneur qui redemarre en boucle

```bash
# Voir les logs
docker compose logs api --tail 50

# Causes communes :
# - Variables d'environnement manquantes
# - Base de donnees inaccessible
# - Port deja utilise
```

### Base de donnees corrompue

```bash
# Reinitialiser
docker compose down -v
docker compose up -d postgres
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
docker compose up -d
```

### Espace disque plein

```bash
# Nettoyer Docker
docker system prune -a

# Voir l'utilisation
docker system df
```
