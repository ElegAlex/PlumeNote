# CollabNotes

**Plateforme de gestion de notes collaboratives on-premise**

CollabNotes est une application de prise de notes Markdown collaborative conçue pour les équipes IT. Elle combine la puissance du Markdown avec une édition temps réel multi-utilisateurs, un système de permissions granulaire et des fonctionnalités avancées type Obsidian (wikilinks, rétroliens, tableaux dynamiques).

## Fonctionnalités principales

- **Édition Markdown WYSIWYG** avec TipTap/ProseMirror
- **Collaboration temps réel** via CRDT (Yjs)
- **Wikilinks** `[[note]]` et rétroliens automatiques
- **Permissions RBAC** granulaires (Admin/Éditeur/Lecteur)
- **Recherche full-text** performante
- **Tableaux dynamiques** type Dataview
- **Hébergement on-premise** (Docker)

## Quick Start

### Prérequis

- Node.js 20+
- Docker & Docker Compose
- npm 10+

### Installation

```bash
# Cloner le projet
git clone https://github.com/votre-org/collabnotes.git
cd collabnotes

# Configuration
cp .env.example .env
# Éditer .env avec vos paramètres

# Installer les dépendances
npm install

# Démarrer les services (PostgreSQL, Redis)
npm run docker:dev

# Préparer la base de données
npm run db:generate
npm run db:migrate
npm run db:seed

# Lancer en développement
npm run dev
```

L'application sera accessible sur :
- **Frontend** : http://localhost:3000
- **API** : http://localhost:3001
- **API Docs** : http://localhost:3001/docs

### Déploiement Production

```bash
# Build des images
docker-compose -f docker/docker-compose.yml build

# Démarrage
docker-compose -f docker/docker-compose.yml up -d
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Navigateur                          │
│                     (React SPA + TipTap)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
              HTTPS       │       WSS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       Nginx (Reverse Proxy)                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌─────────────────────┐       ┌─────────────────────┐
│     API Fastify     │       │   Yjs (Hocuspocus)  │
│                     │       │                     │
│  - REST API         │       │  - WebSocket        │
│  - Auth LDAP/JWT    │       │  - CRDT Sync        │
│  - Permissions      │       │  - Awareness        │
└─────────┬───────────┘       └─────────┬───────────┘
          │                             │
          └──────────────┬──────────────┘
                         ▼
              ┌─────────────────────┐
              │     PostgreSQL      │
              │                     │
              │  - Users, Notes     │
              │  - Permissions      │
              │  - Full-text Search │
              └─────────────────────┘
```

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18, TypeScript, Vite |
| UI | Radix UI, Tailwind CSS |
| Éditeur | TipTap (ProseMirror) |
| Backend | Node.js, Fastify |
| CRDT | Yjs, Hocuspocus |
| BDD | PostgreSQL 16 |
| ORM | Prisma |
| Cache | Redis |
| Conteneurs | Docker, Docker Compose |

## Structure du projet

```
collabnotes/
├── apps/
│   ├── api/              # Backend Fastify
│   ├── web/              # Frontend React
│   └── yjs-server/       # Serveur Yjs
├── packages/
│   ├── database/         # Prisma schema
│   ├── types/            # Types partagés
│   ├── shared/           # Utilitaires
│   └── ui/               # Composants React
├── docker/               # Docker configs
└── docs/                 # Documentation
```

## Scripts disponibles

```bash
npm run dev          # Développement (tous les apps)
npm run build        # Build production
npm run test         # Tests
npm run lint         # Linting
npm run format       # Formatage Prettier
npm run db:generate  # Générer Prisma Client
npm run db:migrate   # Appliquer migrations
npm run db:studio    # Prisma Studio
npm run docker:dev   # Démarrer services Docker
```

## Documentation

- [Guide de contribution](./CONTRIBUTING.md)
- [Documentation API](http://localhost:3001/docs) (après démarrage)
- [Architecture détaillée](./docs/architecture.md)

## Roadmap

- [x] **MVP** : Auth, CRUD notes, éditeur, collaboration temps réel
- [ ] **V1.0** : Wikilinks, recherche, historique, images
- [ ] **V2.0** : Homepage widgets, tableaux dynamiques

## Licence

Propriétaire - Usage interne uniquement

## Support

Pour toute question, ouvrir une issue ou contacter l'équipe IT.
