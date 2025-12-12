# Configuration de PlumeNote

## Variables d'environnement

### Obligatoires

| Variable | Description | Exemple |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | `SecureP@ssw0rd!` |
| `JWT_SECRET` | Secret pour les tokens JWT (min 32 car.) | `openssl rand -base64 32` |
| `COOKIE_SECRET` | Secret pour les cookies (min 32 car.) | `openssl rand -base64 32` |
| `CORS_ORIGINS` | Domaines autorises (virgule) | `https://plumenote.fr` |

### Optionnelles

| Variable | Description | Defaut |
|----------|-------------|--------|
| `NODE_ENV` | Environnement | `production` |
| `POSTGRES_USER` | Utilisateur PostgreSQL | `plumenote` |
| `POSTGRES_DB` | Nom de la base | `plumenote` |
| `REDIS_PASSWORD` | Mot de passe Redis | (vide) |
| `HTTP_PORT` | Port HTTP | `80` |
| `HTTPS_PORT` | Port HTTPS | `443` |
| `DOMAIN` | Domaine pour SSL | `localhost` |
| `SEED_DATABASE` | Creer les donnees de demo | `false` |

## Configuration SSL/HTTPS

### Avec Let's Encrypt

1. Installez Certbot sur votre serveur
2. Generez un certificat :

```bash
certbot certonly --standalone -d votre-domaine.fr -d www.votre-domaine.fr
```

> **Note** : Pour renouveler ou etendre un certificat existant, ajoutez `--expand`

3. Copiez les certificats :

```bash
cp /etc/letsencrypt/live/votre-domaine.fr/fullchain.pem docker/nginx/ssl/
cp /etc/letsencrypt/live/votre-domaine.fr/privkey.pem docker/nginx/ssl/
```

4. Activez SSL :

```bash
cd docker
echo "DOMAIN=votre-domaine.fr" >> .env
./scripts/enable-ssl.sh
```

### Redirection www

La configuration nginx redirige automatiquement `www.votre-domaine.fr` vers `votre-domaine.fr`.
Le certificat SSL doit couvrir les deux domaines (voir etape 2 ci-dessus).

### Renouvellement automatique

Ajoutez un cron :

```bash
0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/votre-domaine.fr/*.pem /path/to/plumenote/docker/nginx/ssl/ && docker compose -f /path/to/plumenote/docker/docker-compose.yml restart nginx
```

## Configuration avancee

### Limites de rate

Dans `docker/nginx/nginx.conf` :

```nginx
# Augmenter les limites si necessaire
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=10r/m;
```

### Taille maximale d'upload

```nginx
client_max_body_size 50M;
```

### Logs personnalises

Dans `docker-compose.yml`, ajoutez des volumes pour les logs :

```yaml
services:
  api:
    volumes:
      - ./logs/api:/app/logs
```

## Multi-instances

Pour un deploiement haute disponibilite, utilisez plusieurs instances de l'API derriere un load balancer. Redis assure la synchronisation des sessions.

```yaml
services:
  api:
    deploy:
      replicas: 3
```
