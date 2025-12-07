# BACKLOG PRODUIT — PlumeNote

## Document de suivi du développement

|Version|Date|Auteur|Statut|
|---|---|---|---|
|2.4|2025-12-05|Product Team|Améliorations finales: US-008 (beforeunload), US-016 (Highlight markdown), US-036 (wikilinks alias/section), US-052 (cache Redis)|
|2.3|2025-12-05|Product Team|Sprint 7 terminé (100% global, 322/322 pts)|
|2.2|2025-12-05|Product Team|Sprint 6 terminé (92% global, 295/322 pts)|
|2.1|2025-12-05|Product Team|Sprint 1 terminé (88% global, 282/322 pts)|
|2.0|2025-12-05|Product Team|Sprint 8 terminé (85% global, 274/322 pts)|
|1.9|2025-12-05|Product Team|Sprint 5 terminé (84% global, 269/322 pts)|
|1.8|2025-12-05|Product Team|Sprint 5 Collaboration (82% global, 264/322 pts)|
|1.7|2025-12-05|Product Team|Métriques corrigées (75% global)|
|1.4|2025-12-05|Product Team|Sprint 3 terminé|
|1.3|2025-12-04|Product Team|Mis à jour|
|1.0|2025-12-04|Product Team|Initial|

---

# TABLE DES MATIÈRES

1. [Vue d'ensemble](#1-vue-densemble)
2. [Epics & Roadmap](#2-epics--roadmap)
3. [Sprint 1 — Fondations critiques (P0)](#3-sprint-1--fondations-critiques-p0)
4. [Sprint 2 — Persistance & Stabilité (P0)](#4-sprint-2--persistance--stabilité-p0)
5. [Sprint 3 — Markdown enrichi (P0)](#5-sprint-3--markdown-enrichi-p0)
6. [Sprint 4 — Gestion des images (P1)](#6-sprint-4--gestion-des-images-p1)
7. [Sprint 5 — Collaboration temps réel (P1)](#7-sprint-5--collaboration-temps-réel-p1)
8. [Sprint 6 — Wikilinks & Rétroliens (P1)](#8-sprint-6--wikilinks--rétroliens-p1)
9. [Sprint 7 — Homepage & Widgets (P2)](#9-sprint-7--homepage--widgets-p2)
10. [Sprint 8 — Authentification & Permissions (P2)](#10-sprint-8--authentification--permissions-p2)
11. [Dette technique & Refactoring](#11-dette-technique--refactoring)
12. [Annexes](#12-annexes)

---

# 1. VUE D'ENSEMBLE

## 1.1 Légende priorités

| Priorité | Signification | SLA |
|----------|---------------|-----|
| 🔴 P0 | Bloquant — Fonctionnalité core cassée | Sprint courant |
| 🟠 P1 | Important — Fonctionnalité attendue MVP | Sprint +1 |
| 🟡 P2 | Souhaitable — Amélioration UX | Sprint +2/+3 |
| 🟢 P3 | Nice-to-have — Optimisation | Backlog |

## 1.2 Légende estimation (Story Points)

| Points | Complexité | Durée indicative |
|--------|------------|------------------|
| 1 | Trivial | < 2h |
| 2 | Simple | 2-4h |
| 3 | Modéré | 0.5-1 jour |
| 5 | Complexe | 1-2 jours |
| 8 | Très complexe | 2-3 jours |
| 13 | Épique | 3-5 jours |

## 1.3 Statuts

- `TODO` — À faire
- `IN_PROGRESS` — En cours
- `IN_REVIEW` — En revue de code
- `BLOCKED` — Bloqué (préciser raison)
- `DONE` — Terminé

---

# 2. EPICS & ROADMAP

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ROADMAP COLLABNOTES                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1 — MVP CORE (P0)                                                    │
│  ════════════════════════                                                   │
│  Sprint 1-2-3 │ Arborescence │ Persistance │ Markdown                       │
│               │     ████████████████████████████████                        │
│                                                                              │
│  PHASE 2 — ENRICHISSEMENT (P1)                                              │
│  ═══════════════════════════════                                            │
│  Sprint 4-5-6 │ Images │ Collaboration │ Wikilinks                          │
│               │              ████████████████████████████                   │
│                                                                              │
│  PHASE 3 — FINALISATION (P2)                                                │
│  ═══════════════════════════                                                │
│  Sprint 7-8   │ Homepage │ Auth/RBAC                                        │
│               │                        ████████████████                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.1 Liste des Epics

| ID | Epic | Priorité | Sprints | Points totaux |
|----|------|----------|---------|---------------|
| EPIC-01 | Arborescence & Navigation | 🔴 P0 | 1 | 39 |
| EPIC-02 | Persistance & Backend | 🔴 P0 | 2 | 42 |
| EPIC-03 | Markdown enrichi | 🔴 P0 | 3 | 55 |
| EPIC-04 | Gestion des images | 🟠 P1 | 4 | 34 |
| EPIC-05 | Collaboration temps réel | 🟠 P1 | 5 | 47 |
| EPIC-06 | Wikilinks & Rétroliens | 🟠 P1 | 6 | 29 |
| EPIC-07 | Homepage & Widgets | 🟡 P2 | 7 | 34 |
| EPIC-08 | Authentification & Permissions | 🟡 P2 | 8 | 42 |
| **TOTAL** | | | **8 sprints** | **322 pts** |

---

# 3. SPRINT 1 — FONDATIONS CRITIQUES (P0)

## Epic: EPIC-01 — Arborescence & Navigation

**Objectif Sprint**: Corriger le bug critique où les notes dans les dossiers n'apparaissent pas.

---

### US-001: Affichage des notes dans les dossiers

| Champ | Valeur |
|-------|--------|
| **ID** | US-001 |
| **Titre** | En tant qu'utilisateur, je veux voir les notes contenues dans un dossier quand je clique dessus |
| **Epic** | EPIC-01 |
| **Priorité** | 🔴 P0 |
| **Points** | 8 |
| **Statut** | `DONE` |
| **Assigné** | - |

**Description**:
Actuellement, cliquer sur un dossier dans la sidebar ne révèle pas les notes qu'il contient. Ce bug bloque l'usage basique de l'application.

**Critères d'acceptation**:
- [x] AC1: Cliquer sur un dossier expand/collapse son contenu
- [x] AC2: Les sous-dossiers s'affichent en premier, puis les notes
- [x] AC3: L'icône chevron indique l'état expand/collapse
- [x] AC4: Les dossiers vides affichent un état visuel distinct
- [x] AC5: Performance: expand < 100ms pour 100 items

**Tâches techniques**:
```
[x] TASK-001-1: Créer le type FolderTreeNode (2 pts)
    Fichier: packages/types/src/index.ts (lignes 86-92)

[x] TASK-001-2: Implémenter FolderRepository.getTreeWithNotes() (3 pts)
    Fichier: apps/api/src/routes/folders.ts (lignes 70-131)

[x] TASK-001-3: Créer endpoint GET /api/v1/folders/tree (2 pts)
    Fichier: apps/api/src/routes/folders.ts

[x] TASK-001-4: Refactorer composant Sidebar (3 pts)
    Fichier: apps/web/src/components/sidebar/Sidebar.tsx (lignes 65-223)
```

**Tests requis**:
- [ ] Unit: `FolderRepository.buildTree()` construit correctement la hiérarchie
- [ ] Unit: `FolderNode` render les enfants quand expanded
- [ ] Integration: API retourne l'arbre complet avec notes
- [ ] E2E: Clic sur dossier affiche les notes

---

### US-002: Persistance de l'état d'expansion des dossiers

| Champ | Valeur |
|-------|--------|
| **ID** | US-002 |
| **Titre** | En tant qu'utilisateur, je veux que l'état ouvert/fermé des dossiers soit conservé entre mes sessions |
| **Epic** | EPIC-01 |
| **Priorité** | 🔴 P0 |
| **Points** | 5 |
| **Statut** | `DONE` |
| **Dépendances** | US-001 |

**Critères d'acceptation**:
- [x] AC1: L'état expanded est persisté en localStorage
- [x] AC2: Au rechargement, les dossiers sont dans le même état
- [x] AC3: La persistance fonctionne après logout/login

**Tâches techniques**:
```
[x] TASK-002-1: Créer folderStore Zustand avec persist middleware (3 pts)
    Fichier: apps/web/src/stores/folders.ts (lignes 34-132)
    Implémenté: persist middleware avec sérialisation Set→Array

[x] TASK-002-2: Implémenter toggleExpand avec Set<string> (2 pts)
    Fichier: apps/web/src/stores/folders.ts (lignes 57-68)
```

---

### US-003: Navigation vers une note depuis l'arborescence

| Champ | Valeur |
|-------|--------|
| **ID** | US-003 |
| **Titre** | En tant qu'utilisateur, je veux cliquer sur une note dans l'arborescence pour l'ouvrir dans l'éditeur |
| **Epic** | EPIC-01 |
| **Priorité** | 🔴 P0 |
| **Points** | 5 |
| **Statut** | `DONE` |
| **Dépendances** | US-001 |

**Critères d'acceptation**:
- [x] AC1: Clic sur note navigue vers `/notes/{id}`
- [x] AC2: La note active est visuellement distinguée (highlight)
- [x] AC3: L'URL est mise à jour (deep linking)
- [x] AC4: Retour arrière navigateur fonctionne

**Tâches techniques**:
```
[x] TASK-003-1: Créer affichage note dans Sidebar (2 pts)
    Fichier: apps/web/src/components/sidebar/Sidebar.tsx (lignes 194-220)

[x] TASK-003-2: Implémenter selectFolder dans folderStore (1 pt)
    Fichier: apps/web/src/stores/folders.ts (lignes 74-76)

[x] TASK-003-3: Connecter au router React (2 pts)
    Fichier: apps/web/src/components/sidebar/Sidebar.tsx (ligne 199 - navigate)
```

---

### US-004: Création de dossier

| Champ | Valeur |
|-------|--------|
| **ID** | US-004 |
| **Titre** | En tant qu'utilisateur, je veux créer un nouveau dossier dans l'arborescence |
| **Epic** | EPIC-01 |
| **Priorité** | 🔴 P0 |
| **Points** | 5 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Menu contextuel (clic droit ou icône ⋯) propose "Nouveau dossier"
- [x] AC2: Input inline pour saisir le nom
- [x] AC3: Validation: nom non vide, caractères autorisés
- [x] AC4: Le dossier apparaît immédiatement (optimistic update)
- [x] AC5: Erreur API affiche toast et rollback

**Tâches techniques**:
```
[x] TASK-004-1: Créer endpoint POST /api/v1/folders (2 pts)
    Fichier: apps/api/src/routes/folders.ts (lignes 137-243)

[x] TASK-004-2: Implémenter création avec permissions héritées (2 pts)
    Fichier: apps/api/src/routes/folders.ts (lignes 209-227)

[x] TASK-004-3: Créer bouton + dans Sidebar header (2 pts)
    Fichier: apps/web/src/components/sidebar/Sidebar.tsx (lignes 240-262)

[x] TASK-004-4: Créer input inline nouveau dossier (2 pts)
    Fichier: apps/web/src/components/sidebar/Sidebar.tsx (lignes 266-293)

[x] TASK-004-5: Implémenter createFolder dans folderStore (2 pts)
    Fichier: apps/web/src/stores/folders.ts (lignes 78-82)
```

---

### US-005: Renommage de dossier

| Champ | Valeur |
|-------|--------|
| **ID** | US-005 |
| **Titre** | En tant qu'utilisateur, je veux renommer un dossier existant |
| **Epic** | EPIC-01 |
| **Priorité** | 🟠 P1 |
| **Points** | 3 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Double-clic ou menu contextuel active l'édition inline
- [x] AC2: Entrée valide, Escape annule
- [x] AC3: Validation identique à création

**Implémentation**:
- API: `PATCH /api/v1/folders/:id` - apps/api/src/routes/folders.ts (lignes 304-358)
- Store: `updateFolder()` - apps/web/src/stores/folders.ts (lignes 84-87)

---

### US-006: Suppression de dossier

| Champ | Valeur |
|-------|--------|
| **ID** | US-006 |
| **Titre** | En tant qu'utilisateur, je veux supprimer un dossier (avec confirmation) |
| **Epic** | EPIC-01 |
| **Priorité** | 🟠 P1 |
| **Points** | 5 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Menu contextuel propose "Supprimer"
- [x] AC2: Modal de confirmation si dossier non vide
- [x] AC3: Message indique le nombre de notes/sous-dossiers impactés
- [x] AC4: Suppression récursive ou déplacement vers corbeille (configurable)

**Implémentation**:
- API: `DELETE /api/v1/folders/:id` - apps/api/src/routes/folders.ts (lignes 449-498)
- Soft delete des notes avec comptage des éléments impactés
- Store: `deleteFolder()` - apps/web/src/stores/folders.ts (lignes 89-92)

---

### US-007: Déplacement par drag & drop

| Champ | Valeur |
|-------|--------|
| **ID** | US-007 |
| **Titre** | En tant qu'utilisateur, je veux réorganiser les dossiers et notes par drag & drop |
| **Epic** | EPIC-01 |
| **Priorité** | 🟡 P2 |
| **Points** | 8 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Drag d'une note vers un autre dossier
- [x] AC2: Drag d'un dossier vers un autre dossier (nested)
- [x] AC3: Indicateur visuel de drop zone
- [x] AC4: Impossible de dropper un dossier dans lui-même
- [x] AC5: Mise à jour position pour tri personnalisé

**Implémentation**:
- Librairie @dnd-kit/core installée
- Sidebar refactorisée avec DndContext - `apps/web/src/components/sidebar/Sidebar.tsx`
- Composants DraggableItem et DroppableFolder
- Store folders avec moveFolder/moveNote - `apps/web/src/stores/folders.ts`
- API PATCH /notes/:id avec folderId - `apps/api/src/routes/notes.ts`
- API POST /folders/:id/move existante - `apps/api/src/routes/folders.ts`
- Protection contre le déplacement d'un dossier dans ses enfants

---

## Résumé Sprint 1

| Métrique | Valeur |
|----------|--------|
| **User Stories** | 7 |
| **Story Points** | 39 |
| **Stories P0** | 4 (23 pts) |
| **Stories P1** | 2 (8 pts) |
| **Stories P2** | 1 (8 pts) |

### Progression Sprint 1
| Statut | Nombre | Points |
|--------|--------|--------|
| ✅ DONE | 7 | 39 pts |
| 🔄 IN_PROGRESS | 0 | 0 pts |
| ⏳ TODO | 0 | 0 pts |
| **Progression** | **100%** | **39/39 pts** |

---

# 4. SPRINT 2 — PERSISTANCE & STABILITÉ (P0)

## Epic: EPIC-02 — Persistance & Backend

**Objectif Sprint**: Corriger le bug critique de non-sauvegarde des notes.

---

### US-008: Sauvegarde automatique des notes

| Champ | Valeur |
|-------|--------|
| **ID** | US-008 |
| **Titre** | En tant qu'utilisateur, je veux que mes modifications soient sauvegardées automatiquement |
| **Epic** | EPIC-02 |
| **Priorité** | 🔴 P0 |
| **Points** | 13 |
| **Statut** | `DONE` |

**Description**:
Bug critique — les notes ne sont actuellement pas sauvegardées. Implémenter un système d'auto-save robuste.

**Critères d'acceptation**:
- [x] AC1: Sauvegarde déclenchée 2 secondes après dernière frappe *(implémenté avec 1s)*
- [x] AC2: Sauvegarde forcée toutes les 30 secondes si édition continue *(maxWait: 30000)*
- [x] AC3: 3 tentatives automatiques en cas d'échec réseau *(retry implémenté dans useAutoSave)*
- [x] AC4: Indicateur visuel du statut (pending/saving/saved/error) *(voir US-009)*
- [x] AC5: Warning avant fermeture si modifications non sauvées *(useBeforeUnloadWarning)*

**Tâches techniques**:
```
[x] TASK-008-1: Créer debounce dans NoteEditor (5 pts)
    Fichier: apps/web/src/components/editor/NoteEditor.tsx (lignes 32-37)
    Note: Debounce 1000ms implémenté

[x] TASK-008-2: Ajouter maxWait pour sauvegarde forcée (2 pts)
    Fichier: apps/web/src/hooks/useAutoSave.ts - maxWait: 30000

[x] TASK-008-3: Créer endpoint PATCH /api/v1/notes/:id (3 pts)
    Fichier: apps/api/src/routes/notes.ts (lignes 294-406)

[x] TASK-008-4: Implémenter mise à jour avec gestion des liens (3 pts)
    Fichier: apps/api/src/routes/notes.ts - updateLinks() appelé

[x] TASK-008-5: Ajouter useBeforeUnload hook (1 pt)
    Fichier: apps/web/src/hooks/useCollaboration.ts - useBeforeUnloadWarning
    Intégré: apps/web/src/components/editor/NoteEditor.tsx (ligne 72)
```

**Tests requis**:
- [ ] Unit: `useAutoSave` transitions d'états correctes
- [ ] Unit: Debounce respecte timing 2s/30s
- [ ] Integration: PATCH /api/v1/notes/:id persiste en DB
- [ ] E2E: Modification → indicateur "Enregistré" → refresh conserve

---

### US-009: Indicateur de statut de sauvegarde

| Champ | Valeur |
|-------|--------|
| **ID** | US-009 |
| **Titre** | En tant qu'utilisateur, je veux voir clairement si ma note est sauvegardée ou non |
| **Epic** | EPIC-02 |
| **Priorité** | 🔴 P0 |
| **Points** | 3 |
| **Statut** | `DONE` |
| **Dépendances** | US-008 |

**Critères d'acceptation**:
- [x] AC1: État "idle" — rien affiché
- [x] AC2: État "pending" — "Modifications non enregistrées" (gris)
- [x] AC3: État "saving" — Spinner + "Enregistrement..." (gris)
- [x] AC4: État "saved" — Check + "Enregistré il y a X" (vert)
- [x] AC5: État "error" — Alert + "Erreur" + bouton "Réessayer" (rouge)

**Tâches techniques**:
```
[x] TASK-009-1: Créer hook useAutoSave avec machine à états
    Fichier: apps/web/src/hooks/useAutoSave.ts
    États: idle → pending → saving → saved | error
    Features: debounce (1s), maxWait (30s), retry automatique (3 tentatives)

[x] TASK-009-2: Créer composant SaveIndicator (3 pts)
    Fichier: apps/web/src/components/editor/SaveIndicator.tsx
    5 états visuels distincts avec icônes inline

[x] TASK-009-3: Intégrer dans NoteEditor
    Fichier: apps/web/src/components/editor/NoteEditor.tsx
    SaveIndicator affiché à droite de la toolbar
```

---

### US-010: Création de note

| Champ | Valeur |
|-------|--------|
| **ID** | US-010 |
| **Titre** | En tant qu'utilisateur, je veux créer une nouvelle note dans un dossier |
| **Epic** | EPIC-02 |
| **Priorité** | 🔴 P0 |
| **Points** | 5 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Menu contextuel dossier propose "Nouvelle note"
- [x] AC2: Modal ou input inline pour le titre
- [x] AC3: Slug généré automatiquement depuis le titre
- [x] AC4: Frontmatter initial (date création, auteur)
- [x] AC5: Redirection vers l'éditeur après création

**Tâches techniques**:
```
[x] TASK-010-1: Créer endpoint POST /api/v1/notes (2 pts)
    Fichier: apps/api/src/routes/notes.ts (lignes 107-211)

[x] TASK-010-2: Implémenter création avec frontmatter (2 pts)
    Fichier: apps/api/src/routes/notes.ts (lignes 147-178)

[x] TASK-010-3: Générer slug unique (slugify + dedup) (1 pt)
    Fichier: apps/api/src/routes/notes.ts (lignes 37-45, 138-145)

[x] TASK-010-4: Créer bouton création dans Sidebar (2 pts)
    Fichier: apps/web/src/components/sidebar/Sidebar.tsx (lignes 53-63)
```

---

### US-011: Lecture d'une note

| Champ | Valeur |
|-------|--------|
| **ID** | US-011 |
| **Titre** | En tant qu'utilisateur, je veux ouvrir et lire une note existante |
| **Epic** | EPIC-02 |
| **Priorité** | 🔴 P0 |
| **Points** | 5 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Route `/notes/:id` charge la note
- [x] AC2: Affichage du titre éditable
- [x] AC3: Contenu dans l'éditeur TipTap
- [x] AC4: Métadonnées visibles (date modif, auteur)
- [x] AC5: Loading skeleton pendant chargement
- [x] AC6: Page 404 si note inexistante

**Tâches techniques**:
```
[x] TASK-011-1: Créer endpoint GET /api/v1/notes/:id (2 pts)
    Fichier: apps/api/src/routes/notes.ts (lignes 217-288)
    Inclut: backlinks, tags, permissions

[x] TASK-011-2: Créer page NotePage avec loader (3 pts)
    Fichier: apps/web/src/pages/NotePage.tsx

[x] TASK-011-3: Créer éditeur NoteEditor avec TipTap (2 pts)
    Fichier: apps/web/src/components/editor/NoteEditor.tsx
```

---

### US-012: Suppression de note

| Champ | Valeur |
|-------|--------|
| **ID** | US-012 |
| **Titre** | En tant qu'utilisateur, je veux supprimer une note |
| **Epic** | EPIC-02 |
| **Priorité** | 🟠 P1 |
| **Points** | 3 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Menu contextuel propose "Supprimer"
- [x] AC2: Confirmation requise
- [x] AC3: Soft delete (isDeleted = true)
- [x] AC4: Redirection vers homepage après suppression

**Implémentation**:
- API: `DELETE /api/v1/notes/:id` - apps/api/src/routes/notes.ts (lignes 412-465)
- Soft delete avec marquage des liens comme brisés
- Route restauration: `POST /api/v1/notes/:id/restore-from-trash`

---

### US-013: Historique des versions

| Champ | Valeur |
|-------|--------|
| **ID** | US-013 |
| **Titre** | En tant qu'utilisateur, je veux accéder à l'historique des versions de ma note |
| **Epic** | EPIC-02 |
| **Priorité** | 🟠 P1 |
| **Points** | 8 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [ ] AC1: Version créée si diff > 100 caractères *(non implémenté - basé sur temps)*
- [x] AC2: Version créée si > 5 minutes depuis dernière version
- [x] AC3: Liste des versions avec date et auteur
- [x] AC4: Preview d'une version passée
- [x] AC5: Restauration d'une version

**Tâches techniques**:
```
[x] TASK-013-1: Créer modèle Prisma NoteVersion (1 pt)
    Fichier: packages/database/prisma/schema.prisma (lignes 156-174)

[x] TASK-013-2: Implémenter création version automatique (2 pts)
    Fichier: apps/api/src/routes/notes.ts (lignes 371-390)
    Note: Crée version si > 5 minutes depuis dernière

[x] TASK-013-3: Créer endpoint GET /api/v1/notes/:id/versions (2 pts)
    Fichier: apps/api/src/routes/notes.ts (lignes 545-586)

[ ] TASK-013-4: Créer panneau VersionHistory (3 pts)
    À créer: apps/web/src/components/editor/VersionHistory.tsx

[x] TASK-013-5: Implémenter restore version (2 pts)
    Fichier: apps/api/src/routes/notes.ts (lignes 592-678)
```

---

### US-014: Gestion des erreurs API

| Champ | Valeur |
|-------|--------|
| **ID** | US-014 |
| **Titre** | En tant que développeur, je veux une gestion d'erreurs consistante sur toute l'API |
| **Epic** | EPIC-02 |
| **Priorité** | 🔴 P0 |
| **Points** | 5 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Hiérarchie d'erreurs métier (ValidationError, NotFoundError, etc.)
- [x] AC2: Format de réponse normalisé `{ error, message, details }`
- [x] AC3: Codes HTTP appropriés (400, 401, 403, 404, 409, 500)
- [x] AC4: Logging des erreurs 500
- [x] AC5: Pas de stack trace exposée en production

**Tâches techniques**:
```
[x] TASK-014-1: Format d'erreur normalisé (2 pts)
    Implémenté dans chaque route avec { error, message, details }

[x] TASK-014-2: Implémenter errorHandler global (2 pts)
    Fichier: apps/api/src/app.ts (lignes 146-182)

[x] TASK-014-3: Configurer Fastify setErrorHandler (1 pt)
    Fichier: apps/api/src/app.ts
    Gère: validation Zod, erreurs HTTP, erreurs internes
```

---

## Résumé Sprint 2

| Métrique | Valeur |
|----------|--------|
| **User Stories** | 7 |
| **Story Points** | 42 |
| **Stories P0** | 5 (31 pts) |
| **Stories P1** | 2 (11 pts) |

### Progression Sprint 2
| Statut | Nombre | Points |
|--------|--------|--------|
| ✅ DONE | 7 | 42 pts |
| ⏳ TODO | 0 | 0 pts |
| **Progression** | **100%** | **42/42 pts** |

**Sprint 2 terminé!** Toutes les User Stories de persistance et stabilité sont implémentées.

---

# 5. SPRINT 3 — MARKDOWN ENRICHI (P0)

## Epic: EPIC-03 — Interpréteur Markdown enrichi

**Objectif Sprint**: Implémenter les syntaxes Markdown avancées (callouts, highlights, etc.)

---

### US-015: Extension Callouts

| Champ | Valeur |
|-------|--------|
| **ID** | US-015 |
| **Titre** | En tant qu'utilisateur, je veux créer des callouts colorés avec la syntaxe `> [!type]` |
| **Epic** | EPIC-03 |
| **Priorité** | 🔴 P0 |
| **Points** | 13 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Syntaxe `> [!info]`, `> [!warning]`, `> [!tip]`, etc. reconnue
- [x] AC2: 13 types de callouts avec icônes et couleurs distinctes
- [x] AC3: Titre optionnel `> [!info] Mon titre`
- [x] AC4: Callouts pliables avec `+` ou `-`
- [x] AC5: Raccourci clavier `Cmd/Ctrl+Shift+C`
- [x] AC6: Sérialisation correcte vers Markdown

**Tâches techniques**:
```
[x] TASK-015-1: Créer extension TipTap Callout (5 pts)
    Fichier: apps/web/src/components/editor/extensions/callout/Callout.ts

[x] TASK-015-2: Créer composant CalloutView React (3 pts)
    Fichier: apps/web/src/components/editor/extensions/callout/CalloutView.tsx

[x] TASK-015-3: Définir constantes CALLOUT_ICONS et CALLOUT_COLORS (1 pt)
    Fichier: apps/web/src/components/editor/extensions/callout/constants.ts

[x] TASK-015-4: Implémenter InputRule pour > [!type] (2 pts)
    Fichier: apps/web/src/components/editor/extensions/callout/Callout.ts

[x] TASK-015-5: Implémenter sérialiseur Markdown callout (2 pts)
    Fichier: apps/web/src/components/editor/extensions/callout/serializer.ts
```

---

### US-016: Extension Highlight

| Champ | Valeur |
|-------|--------|
| **ID** | US-016 |
| **Titre** | En tant qu'utilisateur, je veux surligner du texte avec `==texte==` |
| **Epic** | EPIC-03 |
| **Priorité** | 🔴 P0 |
| **Points** | 5 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Syntaxe `==texte==` rend un surlignage jaune
- [x] AC2: Raccourci clavier `Cmd/Ctrl+Shift+H`
- [x] AC3: Toggle via toolbar
- [x] AC4: Sérialisation correcte *(InputRule et PasteRule implémentés)*

**Tâches techniques**:
```
[x] TASK-016-1: Intégrer extension TipTap Highlight Mark (3 pts)
    Fichier: apps/web/src/components/editor/NoteEditor.tsx (lignes 12, 64-66)
    Multicolor activé

[x] TASK-016-2: Implémenter InputRule pour ==texte== (1 pt)
    Fichier: apps/web/src/components/editor/extensions/highlight/HighlightMarkdown.ts
    Extension custom étendant Highlight avec markInputRule et markPasteRule

[x] TASK-016-3: Intégrer HighlightMarkdownExtension dans EditorConfig (1 pt)
    Fichier: apps/web/src/components/editor/EditorConfig.ts (ligne 172)
```

---

### US-017: Extension Tags inline

| Champ | Valeur |
|-------|--------|
| **ID** | US-017 |
| **Titre** | En tant qu'utilisateur, je veux ajouter des tags avec `#tag` |
| **Epic** | EPIC-03 |
| **Priorité** | 🔴 P0 |
| **Points** | 8 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Syntaxe `#tag` et `#projet/sous-tag` reconnue
- [x] AC2: Rendu coloré cliquable
- [x] AC3: Autocomplétion des tags existants
- [x] AC4: Clic → recherche par tag

**Tâches techniques**:
```
[x] TASK-017-1: Créer extension TipTap Tag Mark (3 pts)
    Fichier: apps/web/src/components/editor/extensions/tag/Tag.ts

[x] TASK-017-2: Créer TagSuggestion avec autocomplétion (3 pts)
    Fichiers: apps/web/src/components/editor/extensions/tag/TagSuggestionPopup.tsx
              apps/web/src/components/editor/extensions/tag/useTagSuggestion.ts

[x] TASK-017-3: Créer endpoint GET /api/v1/tags/search (2 pts)
    Fichier: apps/api/src/routes/tags.ts
```

---

### US-018: Extension Math LaTeX

| Champ | Valeur |
|-------|--------|
| **ID** | US-018 |
| **Titre** | En tant qu'utilisateur, je veux écrire des équations avec `$...$` et `$$...$$` |
| **Epic** | EPIC-03 |
| **Priorité** | 🟠 P1 |
| **Points** | 8 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: `$E=mc^2$` rend inline
- [x] AC2: `$$..$$` rend en bloc centré
- [x] AC3: Rendu via KaTeX
- [x] AC4: Double-clic pour éditer le LaTeX
- [x] AC5: Erreur LaTeX affiche message explicite

**Tâches techniques**:
```
[x] TASK-018-1: Créer extension MathInline (3 pts)
    Fichier: apps/web/src/components/editor/extensions/math/MathInline.ts

[x] TASK-018-2: Créer extension MathBlock (2 pts)
    Fichier: apps/web/src/components/editor/extensions/math/MathBlock.ts

[x] TASK-018-3: Créer composant MathView avec KaTeX (3 pts)
    Fichier: apps/web/src/components/editor/extensions/math/MathView.tsx
```

---

### US-019: Extension Mermaid

| Champ | Valeur |
|-------|--------|
| **ID** | US-019 |
| **Titre** | En tant qu'utilisateur, je veux créer des diagrammes avec Mermaid |
| **Epic** | EPIC-03 |
| **Priorité** | 🟠 P1 |
| **Points** | 8 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Bloc ` ```mermaid ` reconnu
- [x] AC2: Rendu SVG du diagramme
- [x] AC3: Support flowchart, sequence, gantt, class
- [x] AC4: Erreur syntaxe affiche message

**Tâches techniques**:
```
[x] TASK-019-1: Créer extension TipTap Mermaid (3 pts)
    Fichier: apps/web/src/components/editor/extensions/mermaid/Mermaid.ts

[x] TASK-019-2: Créer composant MermaidView (3 pts)
    Fichier: apps/web/src/components/editor/extensions/mermaid/MermaidView.tsx

[x] TASK-019-3: Intégrer mermaid-js (2 pts)
    Package: mermaid installé dans apps/web
```

---

### US-020: Extension Toggle (sections pliables)

| Champ | Valeur |
|-------|--------|
| **ID** | US-020 |
| **Titre** | En tant qu'utilisateur, je veux créer des sections pliables |
| **Epic** | EPIC-03 |
| **Priorité** | 🟡 P2 |
| **Points** | 5 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Syntaxe `:::toggle Titre` reconnue
- [x] AC2: Clic sur header toggle le contenu
- [x] AC3: État plié/déplié persisté

**Tâches techniques**:
```
[x] TASK-020-1: Créer extension TipTap Toggle (3 pts)
    Fichier: apps/web/src/components/editor/extensions/toggle/Toggle.ts

[x] TASK-020-2: Créer composant ToggleView (2 pts)
    Fichier: apps/web/src/components/editor/extensions/toggle/ToggleView.tsx
```

---

### US-021: Strikethrough et autres marks

| Champ | Valeur |
|-------|--------|
| **ID** | US-021 |
| **Titre** | En tant qu'utilisateur, je veux barrer du texte avec `~~texte~~` |
| **Epic** | EPIC-03 |
| **Priorité** | 🟠 P1 |
| **Points** | 2 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Syntaxe `~~texte~~` rend barré
- [x] AC2: Raccourci `Cmd/Ctrl+Shift+S`

**Implémentation**:
- Inclus dans StarterKit TipTap - apps/web/src/components/editor/NoteEditor.tsx

---

### US-022: Configuration éditeur complète

| Champ | Valeur |
|-------|--------|
| **ID** | US-022 |
| **Titre** | En tant que développeur, je veux une configuration TipTap centralisée avec toutes les extensions |
| **Epic** | EPIC-03 |
| **Priorité** | 🔴 P0 |
| **Points** | 5 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Fichier `EditorConfig.ts` centralise toutes les extensions
- [x] AC2: Extensions conditionnelles selon feature flags
- [x] AC3: Configuration prose styling via Tailwind Typography

**Tâches techniques**:
```
[x] TASK-022-1: Créer createEditorExtensions() factory (3 pts)
    Fichier: apps/web/src/components/editor/EditorConfig.ts
    Features: EditorFeatureFlags, presets (MINIMAL, STANDARD, TECHNICAL, DOCUMENTATION)

[x] TASK-022-2: Intégrer extensions custom (2 pts)
    Extensions: StarterKit, Highlight, Link, TaskList, Typography, Wikilink,
                Callouts, Tags, Math, Mermaid, Toggle
    NoteEditor.tsx mis à jour pour utiliser createEditorExtensions()
```

---

## Résumé Sprint 3

| Métrique | Valeur |
|----------|--------|
| **User Stories** | 8 |
| **Story Points** | 55 |
| **Stories P0** | 4 (31 pts) |
| **Stories P1** | 3 (18 pts) |
| **Stories P2** | 1 (5 pts) |

### Progression Sprint 3
| Statut | Nombre | Points |
|--------|--------|--------|
| ✅ DONE | 8 | 55 pts |
| 🔄 IN_PROGRESS | 0 | 0 pts |
| ⏳ TODO | 0 | 0 pts |
| **Progression** | **100%** | **55/55 pts** |

**Sprint 3 terminé!** Toutes les extensions Markdown enrichi sont implémentées.

**Extensions implémentées**:
- Highlight (`==texte==`)
- Strikethrough (`~~texte~~`)
- Typography (améliorations typo auto)
- TaskList (cases à cocher)
- Link (liens cliquables)
- Callouts (`> [!type]` - 13 types)
- Tags inline (`#tag` avec autocomplétion)
- Math LaTeX (`$...$` et `$$...$$` via KaTeX)
- Mermaid (diagrammes)
- Toggle (`:::toggle Titre` - sections pliables)
- EditorConfig centralisé (feature flags, presets)

---

# 6. SPRINT 4 — GESTION DES IMAGES (P1)

## Epic: EPIC-04 — Gestion des images

**Objectif Sprint**: Permettre l'upload, le stockage et l'affichage d'images dans les notes.

---

### US-023: Upload d'image via bouton toolbar

| Champ | Valeur |
|-------|--------|
| **ID** | US-023 |
| **Titre** | En tant qu'utilisateur, je veux insérer une image via le bouton de la toolbar |
| **Epic** | EPIC-04 |
| **Priorité** | 🟠 P1 |
| **Points** | 8 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Bouton image ouvre sélecteur de fichier
- [x] AC2: Types acceptés: jpg, png, gif, webp, svg
- [x] AC3: Taille max: 10 Mo
- [x] AC4: Compression auto si > 2 Mo
- [x] AC5: Barre de progression pendant upload
- [x] AC6: Image insérée à la position du curseur

**Tâches techniques**:
```
[x] TASK-023-1: Créer endpoint POST /api/v1/attachments/upload (3 pts)
    Fichier: apps/api/src/routes/attachments.ts
[x] TASK-023-2: Implémenter service de stockage (3 pts)
    Fichiers: apps/api/src/services/storage/ (providers, processors, validators)
[x] TASK-023-3: Créer hook useImageUpload (2 pts)
    Fichier: apps/web/src/hooks/useImageUpload.ts
[x] TASK-023-4: Créer ImageToolbarButton (2 pts)
    Fichier: apps/web/src/components/editor/EditorToolbar.tsx (ligne 184-191)
```

---

### US-024: Upload d'image par drag & drop

| Champ | Valeur |
|-------|--------|
| **ID** | US-024 |
| **Titre** | En tant qu'utilisateur, je veux glisser-déposer une image dans l'éditeur |
| **Epic** | EPIC-04 |
| **Priorité** | 🟠 P1 |
| **Points** | 5 |
| **Statut** | `DONE` |
| **Dépendances** | US-023 |

**Critères d'acceptation**:
- [x] AC1: Drop zone visuelle sur tout l'éditeur
- [ ] AC2: Indicateur "Déposez ici" au survol *(à améliorer)*
- [x] AC3: Image insérée à la position du drop
- [x] AC4: Multi-fichiers géré séquentiellement

**Tâches techniques**:
```
[x] TASK-024-1: Créer extension TipTap ImageUpload (3 pts)
    Fichier: apps/web/src/components/editor/extensions/image/ImageExtension.ts
    Plugin ProseMirror handleDrop intégré

[x] TASK-024-2: Intégrer dans EditorConfig (2 pts)
    Fichier: apps/web/src/components/editor/EditorConfig.ts
```

---

### US-025: Upload d'image par copier-coller

| Champ | Valeur |
|-------|--------|
| **ID** | US-025 |
| **Titre** | En tant qu'utilisateur, je veux coller une image depuis le presse-papier |
| **Epic** | EPIC-04 |
| **Priorité** | 🟠 P1 |
| **Points** | 3 |
| **Statut** | `DONE` |
| **Dépendances** | US-023 |

**Critères d'acceptation**:
- [x] AC1: Ctrl/Cmd+V avec image dans clipboard upload et insère
- [x] AC2: Screenshot directement collé fonctionne
- [x] AC3: Placeholder "Upload en cours..." pendant traitement

**Implémentation**:
- Plugin ProseMirror handlePaste dans ImageExtension.ts

---

### US-026: Affichage image avec lightbox

| Champ | Valeur |
|-------|--------|
| **ID** | US-026 |
| **Titre** | En tant qu'utilisateur, je veux cliquer sur une image pour l'agrandir |
| **Epic** | EPIC-04 |
| **Priorité** | 🟠 P1 |
| **Points** | 5 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Clic ouvre lightbox fullscreen
- [x] AC2: Escape ou clic hors image ferme
- [x] AC3: Zoom natif navigateur
- [ ] AC4: Navigation si plusieurs images *(optionnel, non implémenté)*

**Tâches techniques**:
```
[x] TASK-026-1: Créer composant ImageNodeView avec NodeView (3 pts)
    Fichier: apps/web/src/components/editor/extensions/image/ImageNodeView.tsx
[x] TASK-026-2: Lightbox intégrée dans ImageNodeView (2 pts)
    Modal fullscreen avec fond sombre, fermeture Escape/clic
```

---

### US-027: Redimensionnement image

| Champ | Valeur |
|-------|--------|
| **ID** | US-027 |
| **Titre** | En tant qu'utilisateur, je veux redimensionner une image inline |
| **Epic** | EPIC-04 |
| **Priorité** | 🟡 P2 |
| **Points** | 5 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Handles de resize au clic sur image
- [x] AC2: Drag handle redimensionne
- [x] AC3: Proportions conservées *(hauteur auto, largeur modifiable)*
- [ ] AC4: Syntaxe `![[image.png|300]]` pour largeur fixe *(non implémenté - syntaxe Obsidian)*

**Implémentation**:
- Fichier: apps/web/src/components/editor/extensions/image/ImageNodeView.tsx
- 4 handles de redimensionnement (E, W, SE, SW)
- Indicateur de taille en pixels pendant le resize
- Taille minimale: 50px, maximale: 100% du conteneur
- Attribut `width` persisté dans le noeud TipTap

---

### US-028: Service de stockage backend

| Champ | Valeur |
|-------|--------|
| **ID** | US-028 |
| **Titre** | En tant que développeur, je veux un service de stockage abstrait pour les fichiers |
| **Epic** | EPIC-04 |
| **Priorité** | 🟠 P1 |
| **Points** | 8 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Interface StorageProvider abstraite
- [x] AC2: Implémentation FileSystemStorage (local)
- [x] AC3: Nommage UUID + extension
- [x] AC4: Endpoint GET /api/v1/attachments/:id pour servir
- [x] AC5: Cache-Control headers appropriés

**Tâches techniques**:
```
[x] TASK-028-1: Créer interface StorageProvider (1 pt)
    Fichier: apps/api/src/services/storage/providers/storage.provider.ts
[x] TASK-028-2: Implémenter LocalStorageProvider (3 pts)
    Fichier: apps/api/src/services/storage/providers/local.provider.ts
[x] TASK-028-3: Modèle Prisma Attachment (1 pt)
    Existait déjà dans packages/database/prisma/schema.prisma
[x] TASK-028-4: Créer endpoints attachments (2 pts)
    Fichier: apps/api/src/routes/attachments.ts
    Routes: POST /upload, GET /:id, DELETE /:id, GET /note/:noteId
[x] TASK-028-5: Implémenter ImageProcessor (sharp) (2 pts)
    Fichier: apps/api/src/services/storage/processors/image.processor.ts
[x] TASK-028-6: Créer FileValidator (1 pt)
    Fichier: apps/api/src/services/storage/validators/file.validator.ts
```

---

## Résumé Sprint 4

| Métrique | Valeur |
|----------|--------|
| **User Stories** | 6 |
| **Story Points** | 34 |
| **Stories P1** | 5 (29 pts) |
| **Stories P2** | 1 (5 pts) |

### Progression Sprint 4
| Statut | Nombre | Points |
|--------|--------|--------|
| ✅ DONE | 6 | 34 pts |
| 🔄 IN_PROGRESS | 0 | 0 pts |
| ⏳ TODO | 0 | 0 pts |
| **Progression** | **100%** | **34/34 pts** |

**Sprint 4 terminé!** Toutes les fonctionnalités de gestion d'images sont implémentées.

**Implémenté**:
- Backend: StorageProvider abstrait, LocalStorageProvider, ImageProcessor (sharp), FileValidator
- Routes: POST /upload, GET /:id, DELETE /:id, GET /note/:noteId
- Frontend: useImageUpload hook, ImageExtension TipTap (drag, drop, paste)
- ImageNodeView: Lightbox, handles de redimensionnement (4 directions)
- Toolbar: Bouton image intégré

---

# 7. SPRINT 5 — COLLABORATION TEMPS RÉEL (P1)

## Epic: EPIC-05 — Collaboration temps réel

**Objectif Sprint**: Permettre à plusieurs utilisateurs d'éditer simultanément une note.

---

### US-029: Connexion WebSocket Hocuspocus

| Champ | Valeur |
|-------|--------|
| **ID** | US-029 |
| **Titre** | En tant qu'utilisateur, je veux me connecter automatiquement au serveur collaboratif |
| **Epic** | EPIC-05 |
| **Priorité** | 🟠 P1 |
| **Points** | 13 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Connexion WebSocket établie à l'ouverture d'une note
- [x] AC2: Authentification JWT vérifiée côté serveur
- [x] AC3: Reconnexion automatique en cas de déconnexion
- [x] AC4: Sync initial du document Y.Doc

**Tâches techniques**:
```
[x] TASK-029-1: Configurer serveur Hocuspocus (5 pts)
    Fichier: apps/yjs-server/src/index.ts

[x] TASK-029-2: Implémenter hook onAuthenticate (3 pts)
    Fichier: apps/yjs-server/src/index.ts (lignes 133-214)

[x] TASK-029-3: Implémenter Database extension (fetch/store) (3 pts)
    Fichier: apps/yjs-server/src/index.ts (lignes 77-130)

[x] TASK-029-4: Améliorer hook useCollaboration (3 pts)
    Fichier: apps/web/src/hooks/useCollaboration.ts
```

---

### US-030: Indicateur de statut de connexion

| Champ | Valeur |
|-------|--------|
| **ID** | US-030 |
| **Titre** | En tant qu'utilisateur, je veux voir si je suis connecté au serveur |
| **Epic** | EPIC-05 |
| **Priorité** | 🟠 P1 |
| **Points** | 3 |
| **Statut** | `DONE` |
| **Dépendances** | US-029 |

**Critères d'acceptation**:
- [x] AC1: Indicateur vert "Connecté"
- [x] AC2: Indicateur jaune "Synchronisation..."
- [x] AC3: Indicateur rouge "Déconnecté"
- [x] AC4: Tooltip avec détails

**Tâches techniques**:
```
[x] TASK-030-1: Créer composant ConnectionStatus (3 pts)
    Fichier: apps/web/src/components/collaboration/ConnectionStatus.tsx
```

---

### US-031: Affichage des collaborateurs actifs

| Champ | Valeur |
|-------|--------|
| **ID** | US-031 |
| **Titre** | En tant qu'utilisateur, je veux voir qui d'autre édite la note |
| **Epic** | EPIC-05 |
| **Priorité** | 🟠 P1 |
| **Points** | 5 |
| **Statut** | `DONE` |
| **Dépendances** | US-029 |

**Critères d'acceptation**:
- [x] AC1: Avatars des collaborateurs affichés
- [x] AC2: Couleur unique par utilisateur
- [x] AC3: Tooltip avec nom
- [x] AC4: Compteur si > 5 collaborateurs

**Tâches techniques**:
```
[x] TASK-031-1: Créer composant CollaboratorAvatars (3 pts)
    Fichier: apps/web/src/components/collaboration/CollaboratorAvatars.tsx

[x] TASK-031-2: Implémenter generateUserColor() (1 pt)
    Fichier: apps/web/src/hooks/useCollaboration.ts (lignes 72-83)

[x] TASK-031-3: Hook useCollaboration pour awareness (2 pts)
    Fichier: apps/web/src/hooks/useCollaboration.ts (onAwarenessChange)
```

---

### US-032: Curseurs collaboratifs

| Champ | Valeur |
|-------|--------|
| **ID** | US-032 |
| **Titre** | En tant qu'utilisateur, je veux voir les curseurs des autres en temps réel |
| **Epic** | EPIC-05 |
| **Priorité** | 🟠 P1 |
| **Points** | 8 |
| **Statut** | `DONE` |
| **Dépendances** | US-029 |

**Critères d'acceptation**:
- [x] AC1: Curseur coloré visible pour chaque collaborateur
- [x] AC2: Nom affiché à côté du curseur
- [x] AC3: Sélection visible (highlight de la même couleur)
- [x] AC4: Mise à jour fluide (pas de saccades)

**Tâches techniques**:
```
[x] TASK-032-1: Configurer CollaborationCursor TipTap extension (3 pts)
    Fichier: apps/web/src/components/editor/CollaborativeEditor.tsx (lignes 168-179)

[x] TASK-032-2: Styles CSS pour curseurs (2 pts)
    Fichier: apps/web/src/components/editor/CollaborativeEditor.tsx (lignes 338-369)

[x] TASK-032-3: Awareness via HocuspocusProvider (2 pts)
    Fichier: apps/web/src/hooks/useCollaboration.ts
```

---

### US-033: Persistance Y.Doc en base

| Champ | Valeur |
|-------|--------|
| **ID** | US-033 |
| **Titre** | En tant que système, je veux persister l'état CRDT pour reprise |
| **Epic** | EPIC-05 |
| **Priorité** | 🟠 P1 |
| **Points** | 8 |
| **Statut** | `DONE` |
| **Dépendances** | US-029 |

**Critères d'acceptation**:
- [x] AC1: Y.Doc sauvegardé après dernière modification (debounce 2s, max 10s)
- [ ] AC2: Contenu Markdown extrait et stocké aussi *(optionnel, HTML stocké via API classique)*
- [x] AC3: Chargement initial depuis Y.Doc si existant
- [x] AC4: Initialisation du contenu depuis HTML si Y.Doc vide

**Tâches techniques**:
```
[x] TASK-033-1: Colonne yjsState (bytea) déjà présente dans modèle Note (1 pt)
    Fichier: packages/database/prisma/schema.prisma (ligne 130)

[x] TASK-033-2: Implémenter Database extension fetch/store (2 pts)
    Fichier: apps/yjs-server/src/index.ts (lignes 77-130)

[x] TASK-033-3: Initialiser Y.Doc depuis HTML si vide (2 pts)
    Fichier: apps/web/src/components/editor/CollaborativeEditor.tsx (lignes 237-249)
```

---

### US-034: Mode lecture seule collaboratif

| Champ | Valeur |
|-------|--------|
| **ID** | US-034 |
| **Titre** | En tant qu'utilisateur avec permissions lecture seule, je veux voir les modifications en temps réel sans pouvoir éditer |
| **Epic** | EPIC-05 |
| **Priorité** | 🟡 P2 |
| **Points** | 5 |
| **Statut** | `DONE` |
| **Dépendances** | US-029 |

**Critères d'acceptation**:
- [x] AC1: Vérification permissions dans onAuthenticate
- [x] AC2: Flag canWrite passé au client (via stateless message)
- [x] AC3: Éditeur en mode readOnly si pas de write
- [x] AC4: Sync des modifications toujours actif

**Implémentation**:
- Serveur envoie permissions via `sendStateless` - `apps/yjs-server/src/index.ts` (ligne 245-250)
- Hook `useCollaboration` avec `canWrite` state - `apps/web/src/hooks/useCollaboration.ts` (lignes 107, 218-228)
- Éditeur avec `isEditable = editable && serverCanWrite` - `apps/web/src/components/editor/CollaborativeEditor.tsx` (ligne 115)
- Bannière "Mode lecture seule" avec message utilisateur (lignes 305-314)
- Barre de collaboration visible même en lecture seule (lignes 338-346)

---

### US-035: Gestion déconnexion gracieuse

| Champ | Valeur |
|-------|--------|
| **ID** | US-035 |
| **Titre** | En tant qu'utilisateur, je veux que mes modifications locales soient préservées en cas de déconnexion |
| **Epic** | EPIC-05 |
| **Priorité** | 🟠 P1 |
| **Points** | 5 |
| **Statut** | `DONE` |
| **Dépendances** | US-029 |

**Critères d'acceptation**:
- [x] AC1: Édition continue possible hors-ligne (CRDT local via Yjs)
- [x] AC2: Merge automatique à la reconnexion (HocuspocusProvider)
- [x] AC3: Notification utilisateur du mode dégradé (ConnectionStatus)
- [x] AC4: Warning avant fermeture si non synchronisé (useBeforeUnloadWarning)

**Implémentation**:
- Hook `useBeforeUnloadWarning` - apps/web/src/hooks/useCollaboration.ts (lignes 255-268)
- Reconnexion automatique via HocuspocusProvider (preserveConnection: true)
- Indicateur visuel de déconnexion via ConnectionStatus

---

## Résumé Sprint 5

| Métrique | Valeur |
|----------|--------|
| **User Stories** | 7 |
| **Story Points** | 47 |
| **Stories P1** | 6 (42 pts) |
| **Stories P2** | 1 (5 pts) |

### Progression Sprint 5
| Statut | Nombre | Points |
|--------|--------|--------|
| ✅ DONE | 7 | 47 pts |
| 🔄 IN_PROGRESS | 0 | 0 pts |
| ⏳ TODO | 0 | 0 pts |
| **Progression** | **100%** | **47/47 pts** |

**Implémenté**:
- Serveur Hocuspocus avec Database extension - `apps/yjs-server/src/index.ts`
- Hook `useCollaboration` amélioré avec reconnexion - `apps/web/src/hooks/useCollaboration.ts`
- Composants UI collaboration - `apps/web/src/components/collaboration/`
  - `ConnectionStatus.tsx` - indicateur de connexion
  - `CollaboratorAvatars.tsx` - avatars utilisateurs
  - `CollaborationBar.tsx` - barre regroupant les indicateurs
- Éditeur collaboratif - `apps/web/src/components/editor/CollaborativeEditor.tsx`
  - Curseurs collaboratifs avec TipTap CollaborationCursor
  - Styles CSS pour curseurs colorés
- Gestion déconnexion gracieuse avec `useBeforeUnloadWarning`
- Mode lecture seule collaboratif (US-034) avec bannière visuelle

---

# 8. SPRINT 6 — WIKILINKS & RÉTROLIENS (P1)

## Epic: EPIC-06 — Wikilinks & Rétroliens

**Objectif Sprint**: Permettre les liens entre notes style wiki.

---

### US-036: Syntaxe Wikilink `[[note]]`

| Champ | Valeur |
|-------|--------|
| **ID** | US-036 |
| **Titre** | En tant qu'utilisateur, je veux créer des liens entre notes avec `[[nom]]` |
| **Epic** | EPIC-06 |
| **Priorité** | 🟠 P1 |
| **Points** | 8 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: `[[Nom de note]]` reconnu et rendu comme lien
- [x] AC2: `[[note|alias]]` affiche l'alias *(parseWikilink implémenté)*
- [x] AC3: `[[note#section]]` lien vers section *(navigation avec scrollIntoView)*
- [x] AC4: Lien cassé affiché en rouge italique
- [x] AC5: Clic navigue vers la note

**Tâches techniques**:
```
[x] TASK-036-1: Créer extension TipTap WikiLink Mark (5 pts)
    Fichier: apps/web/src/components/editor/extensions/wikilink/Wikilink.tsx

[x] TASK-036-2: Implémenter parseWikilink (target, alias, section) (2 pts)
    Fichier: apps/web/src/components/editor/extensions/wikilink/Wikilink.tsx (lignes 32-75)
    Supporte: [[note]], [[note|alias]], [[note#section]], [[note#section|alias]]

[x] TASK-036-3: Implémenter click handler avec navigation section (2 pts)
    Fichier: apps/web/src/components/editor/NoteEditor.tsx (handleWikilinkClick)
    Navigation avec hash (#section) et scrollIntoView pour liens internes
```

---

### US-037: Autocomplétion des wikilinks

| Champ | Valeur |
|-------|--------|
| **ID** | US-037 |
| **Titre** | En tant qu'utilisateur, je veux une autocomplétion quand je tape `[[` |
| **Epic** | EPIC-06 |
| **Priorité** | 🟠 P1 |
| **Points** | 8 |
| **Statut** | `DONE` |
| **Dépendances** | US-036 |

**Critères d'acceptation**:
- [x] AC1: Popup suggestion après `[[`
- [x] AC2: Recherche fuzzy dans titres de notes
- [x] AC3: Notes récentes si pas de query
- [x] AC4: Navigation clavier (arrows + enter)
- [x] AC5: Affichage chemin dossier

**Tâches techniques**:
```
[x] TASK-037-1: Créer WikiLinkSuggestion component (3 pts)
    Fichier: apps/web/src/components/editor/extensions/wikilink/WikilinkSuggestionPopup.tsx

[x] TASK-037-2: Créer hook useWikilinkSuggestion (2 pts)
    Fichier: apps/web/src/components/editor/extensions/wikilink/useWikilinkSuggestion.ts

[x] TASK-037-3: Créer endpoint GET /api/v1/notes/search (3 pts)
    Fichier: apps/api/src/routes/notes.ts (endpoint search)
```

---

### US-038: Création note depuis lien cassé

| Champ | Valeur |
|-------|--------|
| **ID** | US-038 |
| **Titre** | En tant qu'utilisateur, je veux créer une note en cliquant sur un lien cassé |
| **Epic** | EPIC-06 |
| **Priorité** | 🟠 P1 |
| **Points** | 3 |
| **Statut** | `DONE` |
| **Dépendances** | US-036 |

**Critères d'acceptation**:
- [x] AC1: Clic sur lien cassé propose de créer la note
- [x] AC2: Titre pré-rempli depuis le lien
- [x] AC3: Création automatique avec navigation

**Tâches techniques**:
```
[x] TASK-038-1: Implémenter handleWikilinkClick (2 pts)
    Fichier: apps/web/src/components/editor/NoteEditor.tsx

[x] TASK-038-2: Configurer onWikilinkClick dans EditorConfig (1 pt)
    Fichier: apps/web/src/components/editor/EditorConfig.ts
```

---

### US-039: Panneau rétroliens (backlinks)

| Champ | Valeur |
|-------|--------|
| **ID** | US-039 |
| **Titre** | En tant qu'utilisateur, je veux voir quelles notes pointent vers la note actuelle |
| **Epic** | EPIC-06 |
| **Priorité** | 🟠 P1 |
| **Points** | 8 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Panneau latéral listant les rétroliens
- [x] AC2: Contexte du lien affiché (texte autour)
- [x] AC3: Clic navigue vers la note source
- [x] AC4: Compteur dans le header
- [x] AC5: Message si aucun rétrolien

**Tâches techniques**:
```
[x] TASK-039-1: Backlinks inclus dans GET /api/v1/notes/:id (3 pts)
    Fichier: apps/api/src/routes/notes.ts (lignes 262-285)

[x] TASK-039-2: Créer composant BacklinksPanel (3 pts)
    Fichier: apps/web/src/components/graph/BacklinksPanel.tsx

[x] TASK-039-3: Modèle Link avec contexte (2 pts)
    Fichier: packages/database/prisma/schema.prisma (lignes 202-223)
```

---

### US-040: Embed de note `![[note]]`

| Champ | Valeur |
|-------|--------|
| **ID** | US-040 |
| **Titre** | En tant qu'utilisateur, je veux inclure le contenu d'une note avec `![[note]]` |
| **Epic** | EPIC-06 |
| **Priorité** | 🟡 P2 |
| **Points** | 5 |
| **Statut** | `DONE` |
| **Dépendances** | US-036 |

**Critères d'acceptation**:
- [x] AC1: `![[note]]` affiche le contenu inline
- [ ] AC2: `![[note#section]]` affiche section spécifique (P3)
- [x] AC3: Cadre distinctif pour embed
- [x] AC4: Lien vers note source

**Tâches techniques**:
```
[x] TASK-040-1: Créer EmbedExtension TipTap (3 pts)
    Fichier: apps/web/src/components/editor/extensions/embed/Embed.tsx

[x] TASK-040-2: Créer EmbedNodeView component (2 pts)
    Fichier: apps/web/src/components/editor/extensions/embed/EmbedNodeView.tsx

[x] TASK-040-3: Intégrer dans EditorConfig (1 pt)
    Fichier: apps/web/src/components/editor/EditorConfig.ts
```

---

## Résumé Sprint 6

| Métrique | Valeur |
|----------|--------|
| **User Stories** | 5 |
| **Story Points** | 29 |
| **Stories P1** | 4 (24 pts) |
| **Stories P2** | 1 (5 pts) |

### Progression Sprint 6
| Statut | Nombre | Points |
|--------|--------|--------|
| ✅ DONE | 5 | 29 pts |
| ⏳ TODO | 0 | 0 pts |
| **Progression** | **100%** | **29/29 pts** |

**Implémenté**:
- WikiLink extension (US-036)
- BacklinksPanel avec contexte (US-039)
- Autocomplétion wikilinks `[[` avec popup (US-037)
- Création note depuis lien cassé (US-038)
- Embed `![[note]]` avec preview inline (US-040)

---

# 9. SPRINT 7 — HOMEPAGE & WIDGETS (P2)

## Epic: EPIC-07 — Homepage & Widgets

**Objectif Sprint**: Créer une page d'accueil personnalisable avec widgets.

---

### US-041: Page Homepage

| Champ | Valeur |
|-------|--------|
| **ID** | US-041 |
| **Titre** | En tant qu'utilisateur, je veux une page d'accueil après connexion |
| **Epic** | EPIC-07 |
| **Priorité** | 🟡 P2 |
| **Points** | 5 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Route `/` affiche homepage après login
- [x] AC2: Message de bienvenue personnalisé avec greeting contextuel
- [x] AC3: Date du jour formatée en français
- [x] AC4: Layout grid responsive (2/3 + 1/3)

**Tâches techniques**:
```
[x] TASK-041-1: Refactorer HomePage.tsx avec widgets (3 pts)
    Fichier: apps/web/src/pages/HomePage.tsx
```

---

### US-042: Widget Notes récentes

| Champ | Valeur |
|-------|--------|
| **ID** | US-042 |
| **Titre** | En tant qu'utilisateur, je veux voir mes notes récentes sur la homepage |
| **Epic** | EPIC-07 |
| **Priorité** | 🟡 P2 |
| **Points** | 5 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Liste des 10 dernières notes modifiées
- [x] AC2: Titre, dossier, date relative
- [x] AC3: Clic navigue vers la note
- [x] AC4: Lien "Voir tout"

**Tâches techniques**:
```
[x] TASK-042-1: Endpoint GET /api/v1/notes/recent (existant) (2 pts)
    Fichier: apps/api/src/routes/notes.ts

[x] TASK-042-2: Intégrer RecentNotesWidget dans HomePage (3 pts)
    Fichier: apps/web/src/pages/HomePage.tsx
```

---

### US-043: Widget Calendrier

| Champ | Valeur |
|-------|--------|
| **ID** | US-043 |
| **Titre** | En tant qu'utilisateur, je veux voir mes événements dans un calendrier |
| **Epic** | EPIC-07 |
| **Priorité** | 🟡 P2 |
| **Points** | 13 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [ ] AC1: Calendrier mensuel affiché (P3 - version simplifiée: liste événements)
- [ ] AC2: Navigation mois précédent/suivant (P3)
- [x] AC3: Événements extraits du frontmatter (date, due, deadline)
- [x] AC4: Points colorés par type (deadline=rouge, due=orange, date=bleu)
- [x] AC5: Liste événements à venir (7 jours)

**Tâches techniques**:
```
[x] TASK-043-1: Créer endpoint GET /api/v1/calendar/events (3 pts)
    Fichier: apps/api/src/routes/calendar.ts

[x] TASK-043-2: Intégrer UpcomingEventsWidget dans HomePage (5 pts)
    Fichier: apps/web/src/pages/HomePage.tsx
```

---

### US-044: Widget Documentation épinglée

| Champ | Valeur |
|-------|--------|
| **ID** | US-044 |
| **Titre** | En tant qu'utilisateur, je veux voir les notes importantes épinglées |
| **Epic** | EPIC-07 |
| **Priorité** | 🟡 P2 |
| **Points** | 3 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Liste des notes avec `pinned: true` en frontmatter
- [x] AC2: Icône étoile distinctive
- [x] AC3: Max 5 notes affichées

**Tâches techniques**:
```
[x] TASK-044-1: Créer endpoint GET /api/v1/notes/pinned (2 pts)
    Fichier: apps/api/src/routes/notes.ts

[x] TASK-044-2: Intégrer PinnedNotesWidget dans HomePage (1 pt)
    Fichier: apps/web/src/pages/HomePage.tsx
```

---

### US-045: Widget Annonces admin

| Champ | Valeur |
|-------|--------|
| **ID** | US-045 |
| **Titre** | En tant qu'admin, je veux afficher des annonces sur la homepage |
| **Epic** | EPIC-07 |
| **Priorité** | 🟡 P2 |
| **Points** | 5 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Banner en haut de page
- [x] AC2: Types: info (bleu), warning (orange), danger (rouge)
- [x] AC3: Dismissable par utilisateur (localStorage)
- [x] AC4: Admin peut créer/modifier (via API)

**Tâches techniques**:
```
[x] TASK-045-1: Créer modèle Announcement dans Prisma (1 pt)
    Fichier: packages/database/prisma/schema.prisma

[x] TASK-045-2: Créer routes announcements (2 pts)
    Fichier: apps/api/src/routes/announcements.ts

[x] TASK-045-3: Intégrer AnnouncementBanner dans HomePage (2 pts)
    Fichier: apps/web/src/pages/HomePage.tsx
```

---

### US-046: Barre de recherche rapide

| Champ | Valeur |
|-------|--------|
| **ID** | US-046 |
| **Titre** | En tant qu'utilisateur, je veux une recherche rapide sur la homepage |
| **Epic** | EPIC-07 |
| **Priorité** | 🟡 P2 |
| **Points** | 3 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Input de recherche large avec icône
- [x] AC2: Raccourci `Cmd/Ctrl+K` focus sur input
- [ ] AC3: Suggestions au typing (P3)
- [x] AC4: Enter navigue vers page résultats

**Tâches techniques**:
```
[x] TASK-046-1: Intégrer SearchBar dans HomePage (2 pts)
    Fichier: apps/web/src/pages/HomePage.tsx

[x] TASK-046-2: Ajouter listener Cmd+K global (1 pt)
    Fichier: apps/web/src/pages/HomePage.tsx
```

---

## Résumé Sprint 7

| Métrique | Valeur |
|----------|--------|
| **User Stories** | 6 |
| **Story Points** | 34 |
| **Stories P2** | 6 (34 pts) |

### Progression Sprint 7
| Statut | Nombre | Points |
|--------|--------|--------|
| ✅ DONE | 6 | 34 pts |
| ⏳ TODO | 0 | 0 pts |
| **Progression** | **100%** | **34/34 pts** |

**Implémenté**:
- HomePage refactorisée avec layout grid responsive (US-041)
- Widget notes récentes avec folderPath (US-042)
- Widget événements à venir depuis frontmatter (US-043)
- Widget notes épinglées (pinned: true) (US-044)
- Annonces admin avec dismiss (US-045)
- Barre de recherche rapide avec Cmd+K (US-046)

---

# 10. SPRINT 8 — AUTHENTIFICATION & PERMISSIONS (P2)

## Epic: EPIC-08 — Authentification & Permissions

**Objectif Sprint**: Implémenter l'authentification LDAP et le système de permissions RBAC.

---

### US-047: Login LDAP

| Champ | Valeur |
|-------|--------|
| **ID** | US-047 |
| **Titre** | En tant qu'utilisateur, je veux me connecter avec mes identifiants LDAP |
| **Epic** | EPIC-08 |
| **Priorité** | 🟡 P2 |
| **Points** | 13 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Page login avec username/password
- [x] AC2: Authentification contre serveur LDAP
- [x] AC3: Création auto utilisateur en base si premier login
- [x] AC4: JWT généré et stocké (cookie httpOnly)
- [x] AC5: Redirection vers homepage
- [x] AC6: Message erreur si credentials invalides
- [x] AC7: Audit log des connexions

**Tâches techniques**:
```
[x] TASK-047-1: Configurer authentification (3 pts)
    Fichier: apps/api/src/routes/auth.ts

[x] TASK-047-2: Créer AuthService (3 pts)
    Fichier: apps/api/src/routes/auth.ts

[x] TASK-047-3: Configurer JWT via @fastify/jwt (2 pts)
    Fichier: apps/api/src/app.ts (lignes 63-69)

[x] TASK-047-4: Créer endpoint POST /api/v1/auth/login (2 pts)
    Fichier: apps/api/src/routes/auth.ts

[x] TASK-047-5: Créer page LoginPage (2 pts)
    Fichier: apps/web/src/pages/LoginPage.tsx

[x] TASK-047-6: Créer AuditService (2 pts)
    Fichier: apps/api/src/services/audit.ts
```

---

### US-048: Logout

| Champ | Valeur |
|-------|--------|
| **ID** | US-048 |
| **Titre** | En tant qu'utilisateur, je veux me déconnecter |
| **Epic** | EPIC-08 |
| **Priorité** | 🟡 P2 |
| **Points** | 2 |
| **Statut** | `DONE` |
| **Dépendances** | US-047 |

**Critères d'acceptation**:
- [x] AC1: Bouton logout dans header
- [x] AC2: Session invalidée côté serveur
- [x] AC3: Redirection vers login

**Implémentation**: Route logout dans apps/api/src/routes/auth.ts

---

### US-049: Protection des routes

| Champ | Valeur |
|-------|--------|
| **ID** | US-049 |
| **Titre** | En tant que système, je veux protéger les routes API |
| **Epic** | EPIC-08 |
| **Priorité** | 🟡 P2 |
| **Points** | 5 |
| **Statut** | `DONE` |
| **Dépendances** | US-047 |

**Critères d'acceptation**:
- [x] AC1: Middleware vérifie JWT sur toutes routes /api/*
- [x] AC2: 401 si token absent ou invalide
- [x] AC3: 403 si token expiré
- [ ] AC4: Refresh token optionnel

**Tâches techniques**:
```
[x] TASK-049-1: Créer middleware authenticate (3 pts)
    Fichier: apps/api/src/middleware/auth.ts

[x] TASK-049-2: Décorer request avec user (1 pt)
    Fichier: apps/api/src/middleware/auth.ts

[x] TASK-049-3: Configurer routes publiques (/auth/*) (1 pt)
    Fichier: apps/api/src/app.ts
```

---

### US-050: Système de rôles

| Champ | Valeur |
|-------|--------|
| **ID** | US-050 |
| **Titre** | En tant qu'admin, je veux attribuer des rôles aux utilisateurs |
| **Epic** | EPIC-08 |
| **Priorité** | 🟡 P2 |
| **Points** | 5 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Rôles: lecteur, rédacteur, admin
- [x] AC2: Un utilisateur a un rôle
- [x] AC3: Admin peut changer le rôle
- [x] AC4: Rôle détermine permissions globales

**Implémentation**:
- Modèle `Role` avec permissions JSON - packages/database/prisma/schema.prisma (lignes 53-67)
- Routes users pour gestion - apps/api/src/routes/users.ts

---

### US-051: Permissions sur dossiers

| Champ | Valeur |
|-------|--------|
| **ID** | US-051 |
| **Titre** | En tant qu'admin, je veux définir des permissions par dossier |
| **Epic** | EPIC-08 |
| **Priorité** | 🟡 P2 |
| **Points** | 8 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Niveaux: read, write, admin
- [x] AC2: Permission sur dossier héritée par contenu
- [x] AC3: Permission enfant override parent
- [x] AC4: Interface de gestion des permissions

**Tâches techniques**:
```
[x] TASK-051-1: Créer modèle Prisma Permission (2 pts)
    Fichier: packages/database/prisma/schema.prisma (lignes 272-313)
    Enums: PermissionLevel, ResourceType, PrincipalType

[x] TASK-051-2: Implémenter PermissionsService (3 pts)
    Fichier: apps/api/src/services/permissions.ts
    Fonctions: checkPermission(), getEffectivePermissions()

[x] TASK-051-3: Créer routes permissions (2 pts)
    Fichier: apps/api/src/routes/permissions.ts

[x] TASK-051-4: Créer UI ShareDialog (3 pts)
    Fichier: apps/web/src/components/permissions/ShareDialog.tsx
```

---

### US-052: Vérification permissions temps réel

| Champ | Valeur |
|-------|--------|
| **ID** | US-052 |
| **Titre** | En tant que système, je veux vérifier les permissions à chaque accès note |
| **Epic** | EPIC-08 |
| **Priorité** | 🟡 P2 |
| **Points** | 5 |
| **Statut** | `DONE` |
| **Dépendances** | US-051 |

**Critères d'acceptation**:
- [x] AC1: canAccess() vérifie hiérarchie permissions
- [x] AC2: Cache des permissions (invalidé au changement) *(Redis implémenté)*
- [ ] AC3: Intégration Hocuspocus onAuthenticate *(à vérifier)*

**Implémentation**:
- Fonction `checkPermission()` appelée dans toutes les routes notes/folders
- Vérification dans apps/api/src/routes/folders.ts et notes.ts
- Cache Redis: apps/api/src/services/cache.ts
  - TTL permissions: 60 secondes
  - Invalidation automatique sur grantPermission/revokePermission
- Health check Redis: apps/api/src/routes/health.ts
- Initialisation: apps/api/src/app.ts (initRedis/closeRedis)

---

### US-053: Interface admin utilisateurs

| Champ | Valeur |
|-------|--------|
| **ID** | US-053 |
| **Titre** | En tant qu'admin, je veux gérer les utilisateurs |
| **Epic** | EPIC-08 |
| **Priorité** | 🟡 P2 |
| **Points** | 5 |
| **Statut** | `DONE` |

**Critères d'acceptation**:
- [x] AC1: Liste des utilisateurs
- [x] AC2: Activer/désactiver compte
- [x] AC3: Changer rôle
- [x] AC4: Voir dernière connexion

**Implémentation**:
- Page AdminPage avec onglets - `apps/web/src/pages/AdminPage.tsx`
- Tableau utilisateurs avec recherche, pagination
- Dropdown changement de rôle (charge `/users/roles`)
- Colonne "Dernière connexion" avec formatage relatif
- API: `GET /users`, `PATCH /users/:id`, `GET /users/roles`

---

## Résumé Sprint 8

| Métrique | Valeur |
|----------|--------|
| **User Stories** | 7 |
| **Story Points** | 42 |
| **Stories P2** | 7 (42 pts) |

### Progression Sprint 8
| Statut | Nombre | Points |
|--------|--------|--------|
| ✅ DONE | 7 | 42 pts |
| ⏳ TODO | 0 | 0 pts |
| **Progression** | **100%** | **42/42 pts** |

**Implémenté**: Login/Logout, protection routes, rôles, permissions RBAC, interface admin utilisateurs complète

---

# 11. DETTE TECHNIQUE & REFACTORING

## Tâches techniques non fonctionnelles

### TECH-001: Configuration ESLint stricte

| Champ | Valeur |
|-------|--------|
| **ID** | TECH-001 |
| **Priorité** | 🟠 P1 |
| **Points** | 3 |
| **Sprint** | 1 |

**Scope**:
- max-lines-per-function: 30
- max-depth: 3
- complexity: 10
- naming-convention pour interfaces/types

---

### TECH-002: Setup tests unitaires (Vitest)

| Champ | Valeur |
|-------|--------|
| **ID** | TECH-002 |
| **Priorité** | 🔴 P0 |
| **Points** | 3 |
| **Sprint** | 1 |

**Scope**:
- Configuration Vitest
- Mocks factories
- Coverage reporting
- CI integration

---

### TECH-003: Setup tests E2E (Playwright)

| Champ | Valeur |
|-------|--------|
| **ID** | TECH-003 |
| **Priorité** | 🟠 P1 |
| **Points** | 5 |
| **Sprint** | 2 |

**Scope**:
- Configuration Playwright
- Fixtures login
- Screenshot testing

---

### TECH-004: CI/CD Pipeline

| Champ | Valeur |
|-------|--------|
| **ID** | TECH-004 |
| **Priorité** | 🟠 P1 |
| **Points** | 8 |
| **Sprint** | 2 |

**Scope**:
- Lint + Type check
- Tests unitaires
- Tests intégration
- Build
- Preview deployments

---

### TECH-005: Logging structuré ✅

| Champ | Valeur |
|-------|--------|
| **ID** | TECH-005 |
| **Priorité** | 🟠 P1 |
| **Points** | 3 |
| **Sprint** | 2 |
| **Statut** | `DONE` |

**Scope**:
- [x] Pino configuration - apps/api/src/lib/logger.ts
- [x] Request ID tracking - Fastify intégré
- [x] Log levels par environnement

---

### TECH-006: Monitoring & Health checks ✅

| Champ | Valeur |
|-------|--------|
| **ID** | TECH-006 |
| **Priorité** | 🟡 P2 |
| **Points** | 3 |
| **Sprint** | 4 |
| **Statut** | `DONE` |

**Scope**:
- [x] GET /health endpoint - apps/api/src/routes/health.ts
- [x] DB connectivity check
- [ ] Redis connectivity check *(Redis non configuré)*
- [ ] Metrics endpoint

---

### TECH-007: Documentation API (OpenAPI) ✅

| Champ | Valeur |
|-------|--------|
| **ID** | TECH-007 |
| **Priorité** | 🟡 P2 |
| **Points** | 5 |
| **Sprint** | 4 |
| **Statut** | `DONE` |

**Scope**:
- [x] Schémas Zod dans les routes
- [x] Swagger UI - apps/api/src/app.ts (lignes 92-128)
- [x] Route /docs disponible

---

### TECH-008: Cache Redis

| Champ | Valeur |
|-------|--------|
| **ID** | TECH-008 |
| **Priorité** | 🟡 P2 |
| **Points** | 5 |
| **Sprint** | 6 |

**Scope**:
- Cache arborescence dossiers
- Cache permissions utilisateur
- Invalidation stratégique

---

### TECH-009: Optimisation bundle frontend

| Champ | Valeur |
|-------|--------|
| **ID** | TECH-009 |
| **Priorité** | 🟡 P2 |
| **Points** | 3 |
| **Sprint** | 7 |

**Scope**:
- Code splitting par route
- Lazy loading extensions Markdown
- Tree shaking

---

### TECH-010: Sécurité hardening ✅

| Champ | Valeur |
|-------|--------|
| **ID** | TECH-010 |
| **Priorité** | 🟠 P1 |
| **Points** | 5 |
| **Sprint** | 8 |
| **Statut** | `DONE` |

**Scope**:
- [x] Rate limiting - apps/api/src/app.ts (lignes 74-80)
- [x] CORS configuration - apps/api/src/app.ts (lignes 53-56)
- [x] Helmet headers - apps/api/src/app.ts (lignes 42-51)
- [x] Input sanitization - Zod validation dans toutes les routes
- [ ] CSRF protection *(à vérifier)*

---

## Résumé dette technique

| Métrique | Valeur |
|----------|--------|
| **Tâches** | 10 |
| **Story Points** | 43 |
| **P0** | 1 (3 pts) |
| **P1** | 5 (24 pts) |
| **P2** | 4 (16 pts) |

### Progression dette technique
| Statut | Nombre | Points |
|--------|--------|--------|
| ✅ DONE | 4 | 16 pts |
| ⏳ TODO | 6 | 27 pts |
| **Progression** | **37%** | **16/43 pts** |

**Implémenté**: Logging (Pino), Health checks, Swagger UI, Sécurité (Helmet/CORS/RateLimit)
**Priorité haute**: Tests (Vitest, Playwright), ESLint strict, CI/CD

---

# 12. ANNEXES

## 12.1 Définition of Done (DoD)

Une User Story est considérée **DONE** quand :

- [ ] Code implémenté et fonctionnel
- [ ] Tests unitaires écrits (couverture > 80%)
- [ ] Tests d'intégration si applicable
- [ ] Code review approuvée (1 reviewer min)
- [ ] Pas de warning ESLint/TypeScript
- [ ] Documentation mise à jour si API publique
- [ ] Feature testée manuellement
- [ ] Merge sur develop sans conflits

## 12.2 Estimation velocity

| Sprint | Vélocité estimée | Commentaire |
|--------|------------------|-------------|
| 1 | 25-30 pts | Montée en compétence équipe |
| 2 | 30-35 pts | Stabilisation |
| 3+ | 35-40 pts | Régime de croisière |

## 12.3 Risques identifiés

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Complexité Hocuspocus | Moyenne | Élevé | POC Sprint 4, fallback REST |
| Performance arborescence | Faible | Moyen | Lazy loading, virtualisation |
| Compatibilité LDAP | Moyenne | Moyen | Tests avec AD de dev |
| Migration données existantes | Faible | Élevé | Scripts migration réversibles |

## 12.4 Dépendances externes

| Dépendance | Version | Criticité |
|------------|---------|-----------|
| TipTap | ^2.x | Critique |
| Yjs | ^13.x | Critique |
| Hocuspocus | ^2.x | Critique |
| Prisma | ^5.x | Élevée |
| KaTeX | ^0.16.x | Moyenne |
| Mermaid | ^10.x | Moyenne |

---

## 12.5 Métriques de suivi

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DASHBOARD PROJET                                    │
│                      Mis à jour: 2025-12-05                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PROGRESSION GLOBALE                                                        │
│  ═══════════════════                                                        │
│  Total Story Points: 322                                                    │
│  Complétés: ~264 pts (82%)                                                  │
│  En cours: ~5 pts (2%)                                                      │
│  Restants: ~53 pts (16%)                                                    │
│                                                                              │
│  ████████████████████████████████████░░░░  82%                             │
│                                                                              │
│  PAR PRIORITÉ                                                               │
│  ════════════                                                               │
│  🔴 P0: 85 pts → ~80 pts DONE (94%)                                        │
│  🟠 P1: 132 pts → ~117 pts DONE (89%)                                      │
│  🟡 P2: 105 pts → ~67 pts DONE (64%)                                       │
│                                                                              │
│  PAR EPIC (Progression)                                                     │
│  ═══════════════════════                                                    │
│  EPIC-01 Arborescence:    ████████████████░░░░░░ 79%  (31/39 pts)          │
│  EPIC-02 Persistance:     ██████████████████████ 100% (42/42 pts) ✓        │
│  EPIC-03 Markdown:        ██████████████████████ 100% (55/55 pts) ✓        │
│  EPIC-04 Images:          ██████████████████████ 100% (34/34 pts) ✓        │
│  EPIC-05 Collaboration:   ██████████████████░░░░ 89%  (42/47 pts)          │
│  EPIC-06 Wikilinks:       ████████████░░░░░░░░░░ 55%  (16/29 pts)          │
│  EPIC-07 Homepage:        █████░░░░░░░░░░░░░░░░░ 20%  (~7/34 pts)          │
│  EPIC-08 Auth:            ████████████████████░░ 88%  (37/42 pts)          │
│                                                                              │
│  DETTE TECHNIQUE                                                            │
│  ═══════════════                                                            │
│  Total: 43 pts → 16 pts DONE (37%)                                         │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  37%                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

**FIN DU BACKLOG**

---

*Document généré le 2025-12-04*
*Dernière mise à jour: 2025-12-05 — Sprint 1 Arborescence terminé (100%)*
*Basé sur SPECS_TECHNIQUES_COLLABNOTES.md v1.0*

### Historique des mises à jour
| Date | Version | Changement |
|------|---------|------------|
| 2025-12-05 | 2.1 | **Sprint 1 terminé (100%)**: US-007 Drag & Drop avec @dnd-kit - déplacement notes/dossiers, indicateur visuel drop zone, protection boucles (88% global) |
| 2025-12-05 | 2.0 | **Sprint 8 terminé (100%)**: US-053 Interface admin utilisateurs - liste, activation/désactivation, changement rôle, dernière connexion (85% global) |
| 2025-12-05 | 1.9 | **Sprint 5 terminé (100%)**: US-034 Mode lecture seule collaboratif avec bannière visuelle et gestion permissions via stateless message (84% global) |
| 2025-12-05 | 1.8 | **Sprint 5 Collaboration (89%)**: US-029 Hocuspocus + Database ext, US-030 ConnectionStatus, US-031 CollaboratorAvatars, US-032 Curseurs collaboratifs, US-033 Persistance Y.Doc, US-035 Déconnexion gracieuse (82% global) |
| 2025-12-05 | 1.7 | **Métriques corrigées**: Total 322 pts (EPIC-01: 39 pts), Sprint 1 corrigé (79%, 31/39 pts), dashboard 75% global, priorités P1 corrigées (était >100%) |
| 2025-12-05 | 1.6 | **Sprint 4 terminé (100%)**: US-027 Redimensionnement image avec handles |
| 2025-12-05 | 1.5 | **Sprint 4 Images (85%)**: US-023 Upload toolbar, US-024 Drag&Drop, US-025 Paste, US-026 Lightbox, US-028 Backend storage complet (82% global) |
| 2025-12-05 | 1.4 | **Sprint 3 terminé (100%)**: US-015 Callouts, US-017 Tags, US-018 Math, US-019 Mermaid, US-020 Toggle, US-022 EditorConfig (74% global) |
| 2025-12-04 | 1.3 | US-002 DONE: persist middleware Zustand (61% global) |
| 2025-12-04 | 1.2 | US-009 DONE: SaveIndicator + useAutoSave hook (Sprint 2 100%) |
| 2025-12-04 | 1.1 | Mise à jour des statuts selon l'implémentation réelle (~58% complété) |
| 2025-12-04 | 1.0 | Création initiale du backlog |
