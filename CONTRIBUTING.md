# Contribuer à PlumeNote

Merci de votre intérêt pour contribuer à PlumeNote ! Ce document décrit les conventions et processus à suivre.

## Table des matières

- [Prérequis](#prérequis)
- [Installation](#installation)
- [Structure du projet](#structure-du-projet)
- [Workflow de développement](#workflow-de-développement)
- [Conventions de code](#conventions-de-code)
- [Tests](#tests)
- [Pull Requests](#pull-requests)

## Prérequis

- **Node.js** 20.x ou supérieur
- **npm** 10.x ou supérieur
- **Docker** et **Docker Compose**
- **Git**

## Installation

```bash
# Cloner le dépôt
git clone https://github.com/votre-org/plumenote.git
cd plumenote

# Copier les variables d'environnement
cp .env.example .env

# Installer les dépendances
npm install

# Démarrer les services Docker (PostgreSQL, Redis)
npm run docker:dev

# Générer le client Prisma
npm run db:generate

# Appliquer les migrations
npm run db:migrate

# Lancer en mode développement
npm run dev
```

## Structure du projet

```
plumenote/
├── apps/
│   ├── api/          # Backend Fastify
│   ├── web/          # Frontend React
│   └── yjs-server/   # Serveur collaboration Yjs
├── packages/
│   ├── database/     # Prisma schema et client
│   ├── types/        # Types TypeScript partagés
│   ├── shared/       # Utilitaires partagés
│   └── ui/           # Composants UI React
├── docker/           # Configuration Docker
├── docs/             # Documentation
└── scripts/          # Scripts utilitaires
```

## Workflow de développement

### Branches

- `main` : Production, toujours stable
- `develop` : Développement, intégration continue
- `feature/xxx` : Nouvelles fonctionnalités
- `fix/xxx` : Corrections de bugs
- `refactor/xxx` : Refactoring

### Processus

1. Créer une branche depuis `develop`
2. Développer et commiter régulièrement
3. Ouvrir une Pull Request vers `develop`
4. Attendre la review et les tests CI
5. Merger après approbation

```bash
# Créer une branche feature
git checkout develop
git pull origin develop
git checkout -b feature/ma-fonctionnalite

# Après développement
git add .
git commit -m "feat: description de la fonctionnalité"
git push origin feature/ma-fonctionnalite
```

## Conventions de code

### Commits

Nous suivons [Conventional Commits](https://www.conventionalcommits.org/) :

```
type(scope): description

[body optionnel]

[footer optionnel]
```

**Types** :
- `feat` : Nouvelle fonctionnalité
- `fix` : Correction de bug
- `docs` : Documentation
- `style` : Formatage (pas de changement de code)
- `refactor` : Refactoring
- `test` : Ajout/modification de tests
- `chore` : Maintenance

**Exemples** :
```
feat(auth): add LDAP authentication
fix(editor): resolve cursor sync issue
docs(api): update swagger documentation
```

### TypeScript

- Typage strict obligatoire
- Éviter `any`, préférer `unknown`
- Utiliser les types de `@plumenote/types`
- Documenter les fonctions publiques avec JSDoc

```typescript
/**
 * Crée une nouvelle note dans un dossier
 * @param data - Données de la note
 * @returns La note créée
 * @throws {ForbiddenError} Si l'utilisateur n'a pas les droits
 */
export async function createNote(data: CreateNoteRequest): Promise<Note> {
  // ...
}
```

### React

- Composants fonctionnels avec hooks
- Props typées avec interface
- Fichiers `.tsx` pour les composants
- Un composant par fichier

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant, children, onClick }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
}
```

### CSS / Styling

- Tailwind CSS pour le styling
- Classes utilitaires en priorité
- Composants Radix UI pour l'accessibilité

## Tests

### Lancer les tests

```bash
# Tous les tests
npm run test

# Tests d'un package spécifique
npm run test --workspace=@plumenote/api

# Tests avec couverture
npm run test:coverage

# Mode watch
npm run test -- --watch
```

### Structure des tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('createNote', () => {
  beforeEach(async () => {
    // Setup
  });

  it('should create a note with valid data', async () => {
    // Arrange
    const data = { title: 'Test', folderId: '...' };

    // Act
    const result = await createNote(data);

    // Assert
    expect(result.title).toBe('Test');
  });

  it('should throw if folder does not exist', async () => {
    // ...
  });
});
```

### Couverture minimum

- Lignes : 70%
- Branches : 60%
- Fonctions : 70%

## Pull Requests

### Checklist avant PR

- [ ] Les tests passent localement
- [ ] Le code est formaté (`npm run format`)
- [ ] Le linting passe (`npm run lint`)
- [ ] La documentation est à jour si nécessaire
- [ ] Les migrations Prisma sont incluses si nécessaire

### Template de PR

```markdown
## Description

Brève description des changements.

## Type de changement

- [ ] Bug fix
- [ ] Nouvelle fonctionnalité
- [ ] Breaking change
- [ ] Documentation

## Comment tester

1. ...
2. ...

## Screenshots (si applicable)

## Checklist

- [ ] Tests ajoutés/mis à jour
- [ ] Documentation mise à jour
- [ ] Self-review effectuée
```

### Review

- Au moins 1 approbation requise
- Tous les checks CI doivent passer
- Les commentaires doivent être résolus

## Questions ?

Ouvrez une issue ou contactez l'équipe sur le canal dédié.
