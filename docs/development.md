# Guide de developpement PlumeNote

## Setup local

### Prerequis

- Node.js 20+
- Docker & Docker Compose
- Git

### Installation

```bash
git clone https://github.com/ElegAlex/PlumeNote.git
cd PlumeNote
npm install
```

### Services de developpement

```bash
# Demarrer PostgreSQL et Redis
docker compose -f docker/docker-compose.dev.yml up -d

# Generer le client Prisma
npm run db:generate --workspace=@plumenote/database

# Appliquer les migrations
npm run db:migrate --workspace=@plumenote/database

# (Optionnel) Donnees de test
npm run db:seed --workspace=@plumenote/database
```

### Lancer en developpement

```bash
npm run dev
```

Services disponibles :
- Frontend : http://localhost:5173
- API : http://localhost:3001
- YJS : http://localhost:1234

## Structure du projet

```
plumenote/
├── apps/
│   ├── api/              # Backend Fastify
│   │   ├── src/
│   │   │   ├── modules/  # Modules metier
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   └── index.ts
│   │   └── Dockerfile
│   ├── web/              # Frontend React
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── hooks/
│   │   │   └── stores/
│   │   └── Dockerfile
│   └── yjs-server/       # Serveur collaboration
├── packages/
│   ├── database/         # Prisma schema & client
│   └── types/            # Types partages
├── docker/               # Configuration Docker
└── docs/                 # Documentation
```

## Conventions de code

### TypeScript

- Strict mode active
- Pas de `any` implicite
- Interfaces pour les objets

### Commits

Format : `type(scope): message`

Types :
- `feat` : Nouvelle fonctionnalite
- `fix` : Correction de bug
- `docs` : Documentation
- `refactor` : Refactoring
- `test` : Tests
- `chore` : Maintenance

### Branches

- `main` : Production
- `develop` : Developpement
- `feature/*` : Nouvelles fonctionnalites
- `fix/*` : Corrections

## Tests

```bash
# Tests unitaires
npm run test

# Tests avec couverture
npm run test:coverage

# Tests E2E
npm run test:e2e
```

## Build

```bash
# Build complet
npm run build

# Build d'une app specifique
npm run build --workspace=@plumenote/api
```

## Debugging

### API

```bash
# Logs detailles
DEBUG=* npm run dev --workspace=@plumenote/api
```

### Base de donnees

```bash
# Prisma Studio
npm run db:studio --workspace=@plumenote/database
```

## Contribution

1. Fork le repository
2. Creez une branche : `git checkout -b feature/ma-feature`
3. Commitez : `git commit -m "feat: ma feature"`
4. Push : `git push origin feature/ma-feature`
5. Ouvrez une Pull Request
