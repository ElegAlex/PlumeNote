<div align="center">

# PlumeNote

**Application de prise de notes collaborative en temps reel pour equipes IT**

[![CI](https://github.com/ElegAlex/PlumeNote/actions/workflows/ci.yml/badge.svg)](https://github.com/ElegAlex/PlumeNote/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://github.com/ElegAlex/PlumeNote/pkgs/container/plumenote)

[Demo](https://plumenote.fr) | [Documentation](./docs/) | [Installation](#-installation) | [Contribuer](./CONTRIBUTING.md)

</div>

---

## Fonctionnalites

- **Edition Markdown WYSIWYG** - Editeur riche base sur TipTap/ProseMirror
- **Collaboration temps reel** - Synchronisation via CRDT (Yjs/Hocuspocus)
- **Wikilinks** - Liens entre notes avec retroliens automatiques
- **Recherche full-text** - Recherche instantanee dans toutes vos notes
- **Tags et dossiers** - Organisation flexible de vos notes
- **Permissions RBAC** - Controle d'acces granulaire par note/dossier
- **Tableaux dynamiques** - Requetes type Dataview sur vos notes
- **On-premise** - Hebergez sur votre propre infrastructure

## Apercu

<div align="center">
<img src="docs/assets/screenshot.png" alt="PlumeNote Screenshot" width="800">
</div>

## Installation

### Prerequis

- Docker 20.10+
- Docker Compose v2.0+
- 2 Go RAM minimum
- 10 Go d'espace disque

### Demarrage rapide

```bash
# 1. Cloner le repository
git clone https://github.com/ElegAlex/PlumeNote.git
cd PlumeNote/docker

# 2. Configurer l'environnement
cp .env.example .env
# Editer .env avec vos propres secrets

# 3. Lancer l'application
docker compose up -d

# L'application est accessible sur http://localhost
```

### Configuration

Copiez `.env.example` vers `.env` et configurez les variables :

| Variable | Description | Requis |
|----------|-------------|--------|
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | Oui |
| `JWT_SECRET` | Secret JWT (min 32 car.) | Oui |
| `COOKIE_SECRET` | Secret cookies (min 32 car.) | Oui |
| `CORS_ORIGINS` | Domaines autorises | Oui |
| `DOMAIN` | Votre domaine (pour SSL) | Pour HTTPS |

> Generez des secrets securises avec : `openssl rand -base64 32`

### Activer HTTPS

```bash
# 1. Placez vos certificats dans docker/nginx/ssl/
#    - fullchain.pem
#    - privkey.pem

# 2. Configurez votre domaine dans .env
DOMAIN=votre-domaine.fr

# 3. Activez SSL
./scripts/enable-ssl.sh
```

## Architecture

```
+-------------------------------------------------------------------+
|                         Nginx (Reverse Proxy)                      |
|                    HTTP/HTTPS - WebSocket - SSL                    |
+--------------------------------+----------------------------------+
                                 |
              +------------------+------------------+
              |                  |                  |
              v                  v                  v
      +-------------+    +-------------+    +-------------+
      |   Frontend  |    |     API     |    |     Yjs     |
      |    React    |    |   Fastify   |    |  Hocuspocus |
      |   TipTap    |    |   REST API  |    |    CRDT     |
      +-------------+    +------+------+    +------+------+
                                |                  |
                         +------+------------------+
                         |
                   +-----+-----+
                   v           v
           +-------------+ +-------------+
           |  PostgreSQL | |    Redis    |
           |    Data     | |    Cache    |
           +-------------+ +-------------+
```

### Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 18, TypeScript, Vite, Zustand |
| UI | Radix UI, Tailwind CSS |
| Editeur | TipTap (ProseMirror) |
| Backend | Node.js, Fastify, TypeScript |
| CRDT | Yjs, Hocuspocus |
| Base de donnees | PostgreSQL 16, Prisma ORM |
| Cache | Redis 7 |
| Infrastructure | Docker, Docker Compose, Nginx |

## Documentation

- [Guide d'installation detaille](./docs/installation.md)
- [Configuration avancee](./docs/configuration.md)
- [Guide d'administration](./docs/admin.md)
- [API Reference](./docs/api.md)
- [Guide de developpement](./docs/development.md)

## Contribuer

Les contributions sont les bienvenues ! Consultez [CONTRIBUTING.md](./CONTRIBUTING.md) pour commencer.

### Developpement local

```bash
# Installer les dependances
npm install

# Lancer en mode developpement
npm run dev

# Lancer les tests
npm run test

# Linter
npm run lint
```

## License

Ce projet est sous licence [MIT](./LICENSE).

## Remerciements

- [TipTap](https://tiptap.dev/) - Editeur riche
- [Yjs](https://yjs.dev/) - CRDT pour la collaboration
- [Hocuspocus](https://hocuspocus.dev/) - Serveur WebSocket Yjs
- [Fastify](https://fastify.dev/) - Framework Node.js
- [Prisma](https://prisma.io/) - ORM TypeScript

---

<div align="center">

Fait avec mass d'amour par [Alexandre Berge](https://github.com/ElegAlex)

</div>
