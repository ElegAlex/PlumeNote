# Changelog

Toutes les modifications notables de ce projet seront documentees dans ce fichier.

Le format est base sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhere au [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

### Ajoute
- Configuration CI/CD GitHub Actions
- Documentation open source (README, CONTRIBUTING, LICENSE)
- Scripts de deploiement automatises
- Issue templates et PR template GitHub

### Modifie
- Optimisation du build Docker (node au lieu de tsx)
- Health checks ameliores pour tous les conteneurs

### Corrige
- Health check du conteneur web
- Tests WebSocket dans smoke-test.sh

## [0.1.0] - 2025-12-12

### Ajoute
- Editeur Markdown WYSIWYG avec TipTap
- Collaboration temps reel via Yjs/Hocuspocus
- Systeme d'authentification JWT
- Gestion des notes et dossiers
- Wikilinks et retroliens
- Recherche full-text PostgreSQL
- Permissions RBAC
- Deploiement Docker

[Unreleased]: https://github.com/ElegAlex/PlumeNote/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ElegAlex/PlumeNote/releases/tag/v0.1.0
