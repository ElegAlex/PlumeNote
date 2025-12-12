# Deploiement Docker de PlumeNote

## Prerequis

- Docker 20.10+
- Docker Compose v2.0+
- 2 Go RAM minimum
- 10 Go d'espace disque

## Demarrage rapide

```bash
# 1. Cloner le repository
git clone https://github.com/ElegAlex/PlumeNote.git
cd PlumeNote/docker

# 2. Initialiser (cree .env avec secrets auto-generes)
chmod +x scripts/init.sh
./scripts/init.sh

# L'application est accessible sur http://localhost
```

## Configuration

### Variables d'environnement

Copiez `.env.example` vers `.env` et adaptez les valeurs :

| Variable | Description | Requis |
|----------|-------------|--------|
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | Oui |
| `REDIS_PASSWORD` | Mot de passe Redis | Oui |
| `JWT_SECRET` | Secret pour les tokens JWT (min 32 car.) | Oui |
| `COOKIE_SECRET` | Secret pour les cookies de session | Oui |
| `CORS_ORIGINS` | Domaines autorises (ex: https://mondomaine.fr) | Oui |
| `HTTP_PORT` | Port HTTP (defaut: 80) | Non |
| `HTTPS_PORT` | Port HTTPS (defaut: 443) | Non |

### Activer HTTPS

1. Placez vos certificats dans `nginx/ssl/` :
   - `fullchain.pem`
   - `privkey.pem`

2. Utilisez la config nginx SSL (a creer selon vos besoins)

3. Redemarrez :
```bash
docker compose restart nginx
```

## Commandes utiles

```bash
# Voir les logs
docker compose logs -f

# Logs d'un service specifique
docker compose logs -f api

# Redemarrer un service
docker compose restart api

# Arreter tout
docker compose down

# Arreter et supprimer les donnees
docker compose down -v

# Mise a jour
git pull
docker compose build --no-cache
docker compose up -d
```

## Architecture

```
+-------------+     +-------------+
|   Client    |---->|    Nginx    |
+-------------+     +------+------+
                           |
        +------------------+------------------+
        |                  |                  |
        v                  v                  v
+---------------+  +---------------+  +---------------+
|  Frontend     |  |     API       |  |  Yjs Server   |
|  (React/Vite) |  |   (Fastify)   |  |  (Hocuspocus) |
+---------------+  +-------+-------+  +-------+-------+
                           |                  |
                    +------+------------------+
                    |
        +-----------+-----------+
        v                       v
+---------------+       +---------------+
|  PostgreSQL   |       |     Redis     |
+---------------+       +---------------+
```

## Ports

| Service | Port interne | Port expose |
|---------|--------------|-------------|
| Nginx | 80/443 | 80/443 |
| API | 3001 | - |
| Yjs | 1234 | - |
| PostgreSQL | 5432 | - |
| Redis | 6379 | - |

## Troubleshooting

### L'API ne demarre pas

```bash
docker compose logs api
# Verifier la connexion BDD
docker compose exec api npx prisma db push
```

### Erreur WebSocket

Verifiez que CORS_ORIGINS correspond a votre domaine dans `.env`

### Reinitialiser completement

```bash
docker compose down -v
rm .env
./scripts/init.sh
```

## Routes Nginx

| Route | Service | Description |
|-------|---------|-------------|
| `/` | web | Frontend React SPA |
| `/api/*` | api | API REST Fastify |
| `/ws/sync` | api | WebSocket sync temps reel |
| `/ws/*` | yjs | WebSocket collaboration Yjs |
| `/health` | nginx | Health check |
