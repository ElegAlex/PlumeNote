# Deploiement PlumeNote

## Prerequis

- Serveur Linux avec Docker et Docker Compose installes
- Domaine pointant vers l'IP du serveur (enregistrement DNS A)
- Ports 80 et 443 ouverts

## Etape 1 : Cloner et configurer

```bash
git clone https://github.com/votre-repo/plumenote.git
cd plumenote/docker

# Copier et editer la configuration
cp .env.example .env
nano .env  # Modifier les mots de passe !
```

## Etape 2 : Demarrer les services

```bash
docker compose up -d --build
```

Verifier que tout tourne :

```bash
docker compose ps
# Tous les services doivent etre "Up" ou "healthy"
```

## Etape 3 : Initialiser la base de donnees

```bash
# Appliquer les migrations
docker compose exec api npx prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma

# Creer les donnees de demo (optionnel)
docker compose exec api sh -c "cd /app/packages/database && npx tsx prisma/seed.ts"
```

## Etape 4 : Tester

Acceder a http://VOTRE_IP ou http://localhost

Identifiants par defaut (si seed execute) :

- admin / password123
- demo / password123

## Etape 5 : Configurer HTTPS (production)

### 5.1 Prerequis DNS

Votre domaine doit pointer vers le serveur :

```bash
dig votredomaine.fr +short
# Doit afficher l'IP de votre serveur
```

### 5.2 Obtenir le certificat Let's Encrypt

```bash
# Arreter nginx temporairement
docker compose stop nginx

# Obtenir le certificat
apt install certbot -y
certbot certonly --standalone -d votredomaine.fr -d www.votredomaine.fr

# Copier les certificats
cat /etc/letsencrypt/live/votredomaine.fr/fullchain.pem > ssl/fullchain.pem
cat /etc/letsencrypt/live/votredomaine.fr/privkey.pem > ssl/privkey.pem
```

### 5.3 Activer la config HTTPS

```bash
# Editer nginx.conf avec la config SSL
# Remplacer "votredomaine.fr" par votre domaine
cp nginx/nginx-ssl.conf nginx/nginx.conf
nano nginx/nginx.conf

# Redemarrer nginx
docker compose up -d nginx
```

### 5.4 Verifier

```bash
curl -I https://votredomaine.fr
# Doit retourner HTTP/2 200
```

## Depannage

### Les services redemarrent en boucle

```bash
docker compose logs api --tail=50
```

Cause probable : OpenSSL manquant -> verifier les Dockerfiles

### Erreur 401 apres login

Cause : Cookie secure en HTTP
Solution : Utiliser HTTPS ou mettre `NODE_ENV=development` dans `.env`

### DNS ne propage pas

- Verifier qu'il n'y a pas de redirection/hebergement OVH actif
- Supprimer les enregistrements TXT de type `"1|..."` ou `"3|..."`
- Attendre 5-30 minutes

### Prisma echoue

```bash
docker compose exec api npx prisma generate --schema=/app/packages/database/prisma/schema.prisma
docker compose restart api
```

## Commandes Utiles

```bash
# Voir les logs
docker compose logs -f

# Reconstruire un service
docker compose up -d --build api

# Entrer dans un container
docker compose exec api sh

# Reset complet
docker compose down -v
docker compose up -d --build
```
