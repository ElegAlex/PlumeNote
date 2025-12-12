# Guide d'installation de PlumeNote

## Sommaire

- [Prerequis](#prerequis)
- [Installation avec Docker](#installation-avec-docker)
- [Installation manuelle](#installation-manuelle)
- [Configuration initiale](#configuration-initiale)
- [Verification](#verification)
- [Depannage](#depannage)

## Prerequis

### Materiel minimum

| Ressource | Minimum | Recommande |
|-----------|---------|------------|
| CPU | 2 cores | 4 cores |
| RAM | 2 Go | 4 Go |
| Disque | 10 Go | 20 Go |

### Logiciels requis

- **Docker** 20.10 ou superieur
- **Docker Compose** v2.0 ou superieur

Verifiez vos versions :

```bash
docker --version
docker compose version
```

## Installation avec Docker

### 1. Cloner le repository

```bash
git clone https://github.com/ElegAlex/PlumeNote.git
cd PlumeNote
```

### 2. Configuration

```bash
cd docker
cp .env.example .env
```

Editez `.env` avec vos propres valeurs :

```bash
# Generer des secrets securises
openssl rand -base64 32  # Pour JWT_SECRET
openssl rand -base64 32  # Pour COOKIE_SECRET
openssl rand -base64 24  # Pour POSTGRES_PASSWORD
```

### 3. Demarrage

```bash
# Premiere installation
./scripts/init.sh

# Ou demarrage manuel
docker compose up -d
```

### 4. Acces

L'application est accessible sur : **http://localhost**

Identifiants par defaut :
- **Admin** : admin@plumenote.local / password123
- **Demo** : demo@plumenote.local / password123

> **Changez ces mots de passe en production !**

## Installation manuelle

### 1. Prerequis

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- npm 10+

### 2. Installation des dependances

```bash
git clone https://github.com/ElegAlex/PlumeNote.git
cd PlumeNote
npm install
```

### 3. Configuration de la base de donnees

```bash
# Creer la base de donnees PostgreSQL
createdb plumenote

# Configurer l'environnement
cp .env.example .env
# Editer .env avec DATABASE_URL=postgresql://user:password@localhost:5432/plumenote

# Appliquer les migrations
npm run db:migrate --workspace=@plumenote/database

# (Optionnel) Seed des donnees de test
npm run db:seed --workspace=@plumenote/database
```

### 4. Build

```bash
npm run build
```

### 5. Demarrage

```bash
# Terminal 1 : API
npm run start --workspace=@plumenote/api

# Terminal 2 : YJS Server
npm run start --workspace=@plumenote/yjs-server

# Terminal 3 : Frontend (dev) ou servir le build
npm run dev --workspace=@plumenote/web
```

## Configuration initiale

### Creation du premier administrateur

1. Accedez a l'application
2. Creez un compte
3. Dans la base de donnees, modifiez le role :

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'votre@email.com';
```

### Configuration SMTP (optionnel)

Pour les emails de recuperation de mot de passe, ajoutez dans `.env` :

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASSWORD=password
SMTP_FROM=noreply@plumenote.fr
```

## Verification

### Health checks

```bash
# Health check global
curl http://localhost/health

# Health check API
curl http://localhost/api/health

# Smoke tests complets
cd docker
./scripts/smoke-test.sh http://localhost
```

### Logs

```bash
# Tous les logs
docker compose logs -f

# Logs d'un service specifique
docker compose logs -f api
```

## Depannage

### L'API ne demarre pas

1. Verifiez les logs : `docker compose logs api`
2. Verifiez la connexion a PostgreSQL
3. Verifiez les variables d'environnement

### Erreur "COOKIE_SECRET must be at least 32 characters"

Generez un secret plus long :

```bash
openssl rand -base64 32
```

### WebSocket ne fonctionne pas

1. Verifiez que nginx route correctement `/ws`
2. Verifiez les logs du service yjs : `docker compose logs yjs`
3. Verifiez le CORS dans `.env`

### Reinitialisation complete

```bash
cd docker
docker compose down -v  # Supprime aussi les volumes
rm .env
./scripts/init.sh
```
