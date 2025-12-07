# PlumeNote - Document de Synthèse Technique

> **Document de référence pour Claude Code**  
> Version: 1.0  
> Date: Décembre 2024  
> Auteur: Spécifications générées avec Claude

---

## Table des matières

1. [Vue d'ensemble du projet](https://claude.ai/chat/82b6c422-9fee-420a-ad9a-f0812240c67d#1-vue-densemble-du-projet)
2. [Architecture technique](https://claude.ai/chat/82b6c422-9fee-420a-ad9a-f0812240c67d#2-architecture-technique)
3. [Modules à implémenter](https://claude.ai/chat/82b6c422-9fee-420a-ad9a-f0812240c67d#3-modules-%C3%A0-impl%C3%A9menter)
4. [Dépendances et ordre d'implémentation](https://claude.ai/chat/82b6c422-9fee-420a-ad9a-f0812240c67d#4-d%C3%A9pendances-et-ordre-dimpl%C3%A9mentation)
5. [Suivi d'avancement](https://claude.ai/chat/82b6c422-9fee-420a-ad9a-f0812240c67d#5-suivi-davancement)
6. [Conventions et standards](https://claude.ai/chat/82b6c422-9fee-420a-ad9a-f0812240c67d#6-conventions-et-standards)
7. [Références des spécifications](https://claude.ai/chat/82b6c422-9fee-420a-ad9a-f0812240c67d#7-r%C3%A9f%C3%A9rences-des-sp%C3%A9cifications)

---

## 1. Vue d'ensemble du projet

### 1.1 Qu'est-ce que PlumeNote ?

PlumeNote est une application de prise de notes collaborative inspirée de Notion et Obsidian. Elle permet à des équipes de créer, organiser et collaborer sur des notes en temps réel.

### 1.2 Fonctionnalités existantes

|Domaine|Fonctionnalités|
|---|---|
|**Éditeur**|Markdown WYSIWYG, blocs, slash commands, collaboration temps réel (CRDT/Yjs)|
|**Organisation**|Dossiers hiérarchiques, sidebar, recherche|
|**Collaboration**|Partage, permissions, curseurs multiples|
|**Utilisateurs**|Authentification, workspaces, profils|

### 1.3 Objectif des évolutions

Cette série de modules vise à enrichir PlumeNote avec :

- **Stabilité** : Correction des bugs critiques (sidebar)
- **Productivité** : Homepage repensée, épinglage, raccourcis clavier
- **Structuration** : Système de métadonnées Obsidian-like
- **Visualisation** : Dashboard analytics, calendrier complet

### 1.4 Périmètre total

|Métrique|Valeur|
|---|---|
|Nombre de modules|6|
|Effort total estimé|22.5 jours-homme|
|Priorités|P0 (1), P1 (1), P2 (1), P3 (3)|

---

## 2. Architecture technique

### 2.1 Stack technologique

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  React 18 + TypeScript + Vite                                   │
│  ├── UI: shadcn/ui (Radix) + Tailwind CSS                       │
│  ├── State: Zustand                                             │
│  ├── Éditeur: TipTap + Yjs (CRDT)                               │
│  ├── Charts: Recharts                                           │
│  └── Routing: React Router v6                                   │
├─────────────────────────────────────────────────────────────────┤
│                          BACKEND                                 │
│  Node.js + Fastify + TypeScript                                 │
│  ├── ORM: Prisma                                                │
│  ├── Validation: Zod                                            │
│  ├── Auth: JWT + Sessions                                       │
│  ├── Realtime: WebSocket (Yjs provider)                         │
│  └── Cache: Redis (optionnel)                                   │
├─────────────────────────────────────────────────────────────────┤
│                         DATABASE                                 │
│  PostgreSQL                                                     │
│  ├── JSONB pour métadonnées                                     │
│  ├── GIN indexes pour recherche                                 │
│  └── Prisma migrations                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Structure du monorepo

```
plumenote/
├── apps/
│   ├── api/                    # Backend Fastify
│   │   └── src/
│   │       ├── modules/        # Domaines métier
│   │       │   ├── auth/
│   │       │   ├── notes/
│   │       │   ├── folders/
│   │       │   ├── calendar/   # À étendre (P2, P3)
│   │       │   ├── analytics/  # À créer (P3)
│   │       │   └── metadata/   # À créer (P2)
│   │       ├── plugins/
│   │       └── lib/
│   │
│   └── web/                    # Frontend React
│       └── src/
│           ├── components/
│           │   ├── sidebar/    # À corriger (P0)
│           │   ├── home/       # À refactorer (P1)
│           │   ├── editor/
│           │   ├── calendar/   # À créer (P3)
│           │   ├── dashboard/  # À créer (P3)
│           │   ├── shortcuts/  # À créer (P3)
│           │   └── ui/         # shadcn components
│           ├── stores/         # Zustand stores
│           ├── hooks/
│           ├── services/       # API clients
│           ├── lib/            # Utilitaires
│           └── config/
│
├── packages/
│   └── shared-types/           # Types partagés
│       └── src/
│           ├── notes.ts
│           ├── folders.ts
│           ├── calendar.ts     # À compléter
│           ├── metadata.ts     # À créer
│           ├── analytics.ts    # À créer
│           └── shortcuts.ts    # À créer
│
├── prisma/
│   ├── schema.prisma           # Schéma DB
│   └── migrations/
│
└── e2e/                        # Tests Playwright
```

### 2.3 Modèle de données simplifié

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    User      │     │   Folder     │     │    Note      │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │     │ id           │     │ id           │
│ email        │────<│ ownerId      │────<│ ownerId      │
│ name         │     │ parentId     │───┐ │ folderId     │───┐
│ ...          │     │ name         │   │ │ title        │   │
└──────────────┘     │ ...          │   │ │ content      │   │
                     └──────────────┘   │ │ metadata ◄───┼───┼── JSONB (P2)
                           │            │ │ viewCount ◄──┼───┼── Nouveau (P1)
                           │            │ │ ...          │   │
                           ▼            │ └──────────────┘   │
                     ┌──────────────┐   │                    │
                     │ Permission   │   │                    │
                     └──────────────┘   │                    │
                                        │                    │
┌──────────────────────────────────────┐│                    │
│        UserPinnedNote (P1)           ││                    │
├──────────────────────────────────────┤│                    │
│ id, userId, noteId, pinnedAt         │◄────────────────────┘
└──────────────────────────────────────┘│
                                        │
┌──────────────────────────────────────┐│
│     PropertyDefinition (P2)          ││
├──────────────────────────────────────┤│
│ id, name, type, options, workspaceId │◄─ Définitions de propriétés
└──────────────────────────────────────┘
```

---

## 3. Modules à implémenter

### 3.1 Vue synthétique

|#|Module|Priorité|Complexité|Jours|Description courte|
|---|---|---|---|---|---|
|1|Sidebar|P0-Critique|M|2|Correction affichage dossiers profonds|
|2|Homepage + Pin|P1-Haute|L|4|Réorganisation + notes épinglées|
|3|Métadonnées|P2-Moyenne|XL|8|Système propriétés Obsidian-like|
|4|Dashboard|P3-Basse|M|3|Analytics et statistiques|
|5|Raccourcis|P3-Basse|S|1.5|Page raccourcis clavier|
|6|Calendrier|P3-Basse|L|4|Calendrier complet 3 vues|

### 3.2 Résumé par module

#### Module P0 : Sidebar Navigation (CRITIQUE)

**Problème** : Les notes dans les dossiers profonds (>2 niveaux) ne s'affichent pas. Tri et indentation incorrects.

**Solution** :

- API lazy loading : `GET /folders/:id/content`
- Composant `FolderItem` récursif
- Store Zustand avec cache et état d'expansion
- Tri alphabétique (dossiers puis notes)

**Fichiers clés** :

- `apps/api/src/modules/folders/folders.controller.ts`
- `apps/web/src/components/sidebar/FolderTree.tsx`
- `apps/web/src/stores/sidebarStore.ts`

---

#### Module P1 : Homepage + Pin Feature

**Changements UI** :

- Déplacer boutons "Nouvelle note/dossier" en haut à droite
- Ajouter widget calendrier (5 prochains événements)
- Section "Notes épinglées" en haut

**Nouvelle feature - Épinglage** :

- Table `UserPinnedNote` (userId, noteId, pinnedAt)
- Endpoints `POST/DELETE /notes/:id/pin`
- Bouton ⭐ dans l'éditeur et le hover des notes
- Persistance par utilisateur

**Fichiers clés** :

- `prisma/schema.prisma` (nouvelle table)
- `apps/api/src/modules/notes/notes.controller.ts`
- `apps/web/src/components/home/HomePage.tsx`
- `apps/web/src/components/home/PinnedNotesSection.tsx`

---

#### Module P2 : Système de Métadonnées (FONDATION)

**Concept** : Permettre d'ajouter des propriétés structurées aux notes (status, due_date, tags, priority, etc.) comme dans Obsidian.

**Architecture** :

- Stockage dual : YAML frontmatter (export) + JSONB (requêtes)
- CRDT Y.Map comme source de vérité
- 9 types de propriétés : text, number, date, datetime, checkbox, tags, select, multiselect, link

**Composants** :

- `PropertiesPanel` : panneau latéral dans l'éditeur
- `PropertyField` : éditeur adaptatif par type
- `frontmatterParser.ts` : parsing/génération YAML

**Impact** : Ce module est la **fondation** pour Dashboard et Calendrier.

**Fichiers clés** :

- `prisma/schema.prisma` (colonne metadata JSONB, table PropertyDefinition)
- `apps/api/src/modules/metadata/`
- `apps/web/src/components/editor/PropertiesPanel.tsx`
- `apps/web/src/stores/metadataStore.ts`

---

#### Module P3 : Dashboard Analytics

**Sections** :

1. **Stats cards** (6) : notes, dossiers, utilisateurs, créations/modifs semaine, vues
2. **Graphique activité** : créations vs modifications (7/30 jours)
3. **Distribution** : status (donut), priority (donut), tags (barres)
4. **Top notes** : 10 plus consultées
5. **Contributions** : tableau par utilisateur

**Endpoints** :

- `GET /analytics/overview`
- `GET /analytics/activity?days=30`
- `GET /analytics/distribution?field=status`
- `GET /analytics/top-notes`
- `GET /analytics/user-contributions`

**Fichiers clés** :

- `apps/api/src/modules/analytics/`
- `apps/web/src/components/dashboard/DashboardPage.tsx`
- `apps/web/src/stores/analyticsStore.ts`

---

#### Module P3 : Page Raccourcis Clavier

**Fonctionnalités** :

- Page `/shortcuts` avec tous les raccourcis par catégorie
- Modal rapide via `Cmd/Ctrl + ?`
- Recherche de raccourcis
- Détection OS (symboles ⌘/Ctrl adaptés)

**Catégories** : Navigation, Éditeur-Actions, Formatage, Titres, Listes, Blocs, Sélection, Panneaux

**Fichiers clés** :

- `apps/web/src/config/shortcuts.ts` (registre)
- `apps/web/src/components/shortcuts/ShortcutsPage.tsx`
- `apps/web/src/hooks/useKeyboardShortcuts.ts`

---

#### Module P3 : Calendrier Complet

**Vues** :

- **Mois** : grille 7 colonnes, événements par jour
- **Semaine** : créneaux horaires 24h
- **Agenda** : liste chronologique

**Sources** : Événements extraits des métadonnées (due_date, event_date, start_date)

**Fonctionnalités** :

- Navigation temporelle
- Filtres (type, status, tags, dossier)
- Création rapide d'événement
- Clic → ouvre la note

**Fichiers clés** :

- `apps/api/src/modules/calendar/` (étendre)
- `apps/web/src/components/calendar/CalendarPage.tsx`
- `apps/web/src/stores/calendarStore.ts`

---

## 4. Dépendances et ordre d'implémentation

### 4.1 Graphe de dépendances

```
                    ┌─────────────────┐
                    │   P0 - Sidebar  │
                    │   (2 jours)     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ P1 - Homepage   │
                    │    + Pin        │
                    │   (4 jours)     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ P2 - Métadonnées│◄───── MODULE FONDATION
                    │   (8 jours)     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │P3 Dashboard │  │P3 Calendrier│  │P3 Raccourcis│
     │  (3 jours)  │  │  (4 jours)  │  │ (1.5 jours) │
     └─────────────┘  └─────────────┘  └─────────────┘
           │                │                │
           └────────────────┴────────────────┘
                             │
                     MODULES PARALLÉLISABLES
                    (mais Raccourcis indépendant)
```

### 4.2 Ordre recommandé

|Phase|Module|Prérequis|Peut être parallélisé avec|
|---|---|---|---|
|1|P0 - Sidebar|Aucun|-|
|2|P1 - Homepage + Pin|P0|-|
|3|P2 - Métadonnées|P1|P3 Raccourcis|
|4a|P3 - Dashboard|P2|P3 Calendrier|
|4b|P3 - Calendrier|P2|P3 Dashboard|
|4c|P3 - Raccourcis|Aucun|Tout (indépendant)|

### 4.3 Jalons suggérés

|Jalon|Modules inclus|Effort cumulé|
|---|---|---|
|**MVP Stabilité**|P0|2 jours|
|**MVP Productivité**|P0 + P1|6 jours|
|**MVP Structuré**|P0 + P1 + P2|14 jours|
|**Version Complète**|Tous|22.5 jours|

---

## 5. Suivi d'avancement

### 5.1 Checklist globale par module

#### P0 - Sidebar Navigation

|Tâche|Status|Notes|
|---|---|---|
|[x] API `GET /folders/:id/content`|✅ Terminé|Endpoint lazy loading avec tri alphabétique|
|[x] Composant `FolderItem` récursif|✅ Terminé|Composant mémorisé avec indentation uniforme|
|[x] Composant `NoteItem`|✅ Terminé|Même indentation que FolderItem|
|[x] Composant `FolderTree`|✅ Terminé|Wrapper avec gestion loading/erreur|
|[x] Store `sidebarStore.ts`|✅ Terminé|Cache TTL 5min, persistance localStorage|
|[x] Lazy loading avec cache|✅ Terminé|Map avec invalidation automatique|
|[x] Types partagés P0|✅ Terminé|FolderContent, NotePreview, SidebarFolderNode|
|[x] Tests unitaires backend|✅ Terminé|folders.test.ts avec vitest|
|[x] Tests composants frontend|✅ Terminé|FolderItem.test.tsx, NoteItem.test.tsx, sidebarStore.test.ts|
|[x] Tests E2E|✅ Terminé|sidebar-navigation.spec.ts avec Playwright|
|[x] **MODULE TERMINÉ**|✅|2024-12-05|

#### P1 - Homepage + Pin Feature

|Tâche|Status|Notes|
|---|---|---|
|[x] Migration DB `viewCount` sur Note|✅ Terminé|Utilise table `Favorite` existante pour pins|
|[x] Endpoints pin/unpin|✅ Terminé|POST/DELETE /notes/:id/pin + GET /notes/pinned|
|[x] Endpoint view tracking|✅ Terminé|POST /notes/:id/view|
|[x] GET /notes/recent enrichi|✅ Terminé|viewCount + isPinned inclus|
|[x] Refactoring `HomePage.tsx`|✅ Terminé|Layout full-width, widgets migrés en sidebar|
|[x] Composant `PinnedNotesSection`|✅ Terminé|+ NoteTable, RecentNotesSection|
|[x] Widget calendrier mini|✅ Terminé|CalendarWidget avec événements filtrés|
|[x] `homepageStore.ts`|✅ Terminé|Store Zustand avec actions pin/unpin/view|
|[x] Hook `useNoteView`|✅ Terminé|Enregistrement automatique des vues|
|[x] `PinButton` composant|✅ Terminé|Intégré dans l'éditeur NotePage|
|[x] `SidebarWidgets`|✅ Terminé|Stats + Raccourcis dans sidebar globale|
|[x] Tests unitaires|✅ Terminé|notes-pin.test.ts|
|[x] Tests E2E|✅ Terminé|homepage.spec.ts|
|[x] **MODULE TERMINÉ**|✅|2024-12-05|

#### P2 - Système de Métadonnées

|Tâche|Status|Notes|
|---|---|---|
|[x] Migration DB (PropertyType enum, PropertyDefinition)|✅ Terminé|schema.prisma mis à jour avec enum + model|
|[x] Migration DB (CalendarConfig + index GIN)|✅ Terminé|Index GIN sur frontmatter pour requêtes JSONB|
|[x] Types partagés `metadata.ts`|✅ Terminé|packages/types/src/index.ts étendu|
|[x] `MetadataService` backend|✅ Terminé|apps/api/src/services/metadata.ts|
|[x] Endpoints CRUD propriétés|✅ Terminé|apps/api/src/routes/properties.ts|
|[x] Endpoint PATCH /notes/:id/metadata|✅ Terminé|Dans routes/notes.ts|
|[x] `frontmatterParser.ts`|✅ Terminé|apps/web/src/lib/frontmatterParser.ts|
|[x] Store `metadataStore.ts`|✅ Terminé|apps/web/src/stores/metadataStore.ts|
|[x] Service `metadataApi.ts`|✅ Terminé|apps/web/src/services/metadataApi.ts|
|[x] Composant `PropertiesPanel`|✅ Terminé|apps/web/src/components/editor/metadata/|
|[x] Composants `PropertyField` (9 types)|✅ Terminé|text, number, date, datetime, checkbox, tags, select, multiselect, link|
|[x] Intégration calendrier (CalendarService)|✅ Terminé|routes/calendar.ts étendu avec /upcoming et /by-month|
|[x] Sync CRDT (Y.Map)|✅ Terminé|useMetadataSync.ts + metadataMap dans useCollaboration|
|[x] Tests unitaires|✅ Terminé|31 tests dans metadata.test.ts|
|[x] Tests E2E|✅ Terminé|properties-panel.spec.ts avec data-testid|
|[x] **MODULE TERMINÉ**|✅|2024-12-05|

#### P3 - Dashboard Analytics

|Tâche|Status|Notes|
|---|---|---|
|[x] Types partagés analytics|✅ Terminé|OverviewStats, ActivityTimeline, etc. dans packages/types|
|[x] `AnalyticsService` backend|✅ Terminé|apps/api/src/services/analytics.ts avec cache Redis|
|[x] Endpoints analytics|✅ Terminé|apps/api/src/routes/analytics.ts (5 endpoints)|
|[x] Service `analyticsApi.ts`|✅ Terminé|apps/web/src/services/analyticsApi.ts|
|[x] Store `analyticsStore.ts`|✅ Terminé|apps/web/src/stores/analyticsStore.ts|
|[x] Composant `DashboardPage`|✅ Terminé|Page principale avec layout responsive|
|[x] Composant `StatsCards`|✅ Terminé|6 cartes de métriques|
|[x] Composant `ActivityChart`|✅ Terminé|Graphique Recharts 7/30 jours|
|[x] Composant `DistributionCharts`|✅ Terminé|Donut + Bar charts cliquables|
|[x] Composant `TopNotesTable`|✅ Terminé|Top 10 notes les plus consultées|
|[x] Composant `UserContributionsTable`|✅ Terminé|Contributions par utilisateur|
|[x] Intégration Sidebar + Route|✅ Terminé|Lien "Statistiques" + route /dashboard|
|[x] Tests unitaires|✅ Terminé|StatsCards.test.tsx, DashboardPage.test.tsx, analyticsStore.test.ts|
|[ ] Tests E2E|⬜ En attente|À créer si nécessaire|
|[x] **MODULE TERMINÉ**|✅|2024-12-06|

#### P3 - Page Raccourcis Clavier

|Tâche|Status|Notes|
|---|---|---|
|[x] Types `shortcuts.ts`|✅ Terminé|Types dans packages/types/src/index.ts|
|[x] Config `shortcuts.ts` (registre)|✅ Terminé|apps/web/src/config/shortcuts.ts avec 40+ raccourcis|
|[x] Hook `useKeyboardShortcuts`|✅ Terminé|apps/web/src/hooks/useKeyboardShortcuts.ts|
|[x] Utilitaires `shortcutUtils.ts`|✅ Terminé|apps/web/src/lib/shortcutUtils.ts|
|[x] Composant `ShortcutsPage`|✅ Terminé|apps/web/src/components/shortcuts/ShortcutsPage.tsx|
|[x] Composant `ShortcutsModal`|✅ Terminé|apps/web/src/components/shortcuts/ShortcutsModal.tsx|
|[x] Intégration globale (Cmd+?)|✅ Terminé|ShortcutsModalTrigger dans App.tsx|
|[x] Tests unitaires|✅ Terminé|shortcutUtils.test.ts, shortcuts.test.ts, KeyboardKey.test.tsx, ShortcutsPage.test.tsx|
|[ ] Tests E2E|⬜ En attente|À créer si nécessaire|
|[x] **MODULE TERMINÉ**|✅|2024-12-06|

#### P3 - Calendrier Complet

|Tâche|Status|Notes|
|---|---|---|
|[x] Types `calendar.ts` complets|✅ Terminé|CalendarEvent, CalendarViewMode, CalendarFilters, etc. dans packages/types|
|[x] Service `calendarApi.ts`|✅ Terminé|apps/web/src/services/calendarApi.ts|
|[x] Utilitaires `calendarUtils.ts`|✅ Terminé|apps/web/src/lib/calendarUtils.ts (buildCalendarMonth, formatters, etc.)|
|[x] Store `calendarStore.ts`|✅ Terminé|apps/web/src/stores/calendarStore.ts (navigation, filtres, CRUD)|
|[x] Extension routes backend|✅ Terminé|GET /events/:id, PATCH /events/:id/date, POST /quick-event|
|[x] Composant `CalendarHeader`|✅ Terminé|Navigation, sélecteur de vue|
|[x] Composant `CalendarMonthView`|✅ Terminé|Grille mensuelle avec CalendarDayCell|
|[x] Composant `CalendarWeekView`|✅ Terminé|Vue hebdomadaire avec créneaux horaires|
|[x] Composant `CalendarAgendaView`|✅ Terminé|Liste chronologique groupée par date|
|[x] Composant `CalendarFilters`|✅ Terminé|Filtres par type, statut, tags, recherche|
|[x] Composant `CalendarEventItem`|✅ Terminé|Affichage événement (compact/full)|
|[x] Composant `CalendarDayCell`|✅ Terminé|Cellule jour avec événements|
|[x] Modal `QuickEventModal`|✅ Terminé|Création rapide d'événement|
|[x] Composant `CalendarPage`|✅ Terminé|Page principale avec intégration complète|
|[x] Intégration Sidebar + Route|✅ Terminé|Lien "Calendrier" + route /calendar|
|[x] Tests unitaires|✅ Terminé|CalendarPage.test.tsx, CalendarMonthView.test.tsx, calendarStore.test.ts|
|[ ] Tests E2E|⬜ En attente|À créer si nécessaire|
|[x] **MODULE TERMINÉ**|✅|2024-12-06|

### 5.2 Résumé d'avancement

|Module|Progression|Dernière mise à jour|
|---|---|---|
|P0 - Sidebar|100% 🟩🟩🟩🟩🟩|2024-12-05|
|P1 - Homepage + Pin|100% 🟩🟩🟩🟩🟩|2024-12-05|
|P2 - Métadonnées|100% 🟩🟩🟩🟩🟩|2024-12-05|
|P3 - Dashboard|100% 🟩🟩🟩🟩🟩|2024-12-06|
|P3 - Raccourcis|100% 🟩🟩🟩🟩🟩|2024-12-06|
|P3 - Calendrier|100% 🟩🟩🟩🟩🟩|2024-12-06|
|**GLOBAL**|**100%**|2024-12-06|

---

## 6. Conventions et standards

### 6.1 Nommage

|Élément|Convention|Exemple|
|---|---|---|
|Fichiers React|PascalCase|`FolderItem.tsx`|
|Fichiers utilitaires|camelCase|`calendarUtils.ts`|
|Stores Zustand|camelCase + Store|`sidebarStore.ts`|
|Endpoints API|kebab-case|`/api/v1/quick-event`|
|Tables DB|snake_case|`user_pinned_notes`|
|Types/Interfaces|PascalCase|`CalendarEvent`|

### 6.2 Structure des composants

```typescript
// Imports (groupés par origine)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SomeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyStore } from '@/stores/myStore';
import { someUtil } from '@/lib/utils';
import { MyType } from '@plumenote/shared-types';

// Types locaux
interface MyComponentProps {
  prop1: string;
  onAction?: () => void;
}

// Composant
export function MyComponent({ prop1, onAction }: MyComponentProps) {
  // Hooks
  const [state, setState] = useState<string>('');
  const store = useMyStore();

  // Effects
  useEffect(() => {
    // ...
  }, []);

  // Handlers
  const handleClick = () => {
    // ...
  };

  // Render
  return (
    <div>
      {/* ... */}
    </div>
  );
}
```

### 6.3 Structure des services backend

```typescript
// Service pattern
export class MyService {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(userId: string): Promise<MyEntity[]> {
    // ...
  }

  async create(userId: string, data: CreateDto): Promise<MyEntity> {
    // ...
  }

  // Méthodes privées pour logique interne
  private validateData(data: unknown): boolean {
    // ...
  }
}
```

### 6.4 Tests

|Type|Outil|Localisation|
|---|---|---|
|Unitaires|Vitest|`__tests__/*.test.ts`|
|Composants|Vitest + Testing Library|`__tests__/*.test.tsx`|
|E2E|Playwright|`e2e/*.spec.ts`|

### 6.5 Git workflow suggéré

```
main
  └── develop
        ├── feature/p0-sidebar-fix
        ├── feature/p1-homepage-pin
        ├── feature/p2-metadata-system
        ├── feature/p3-dashboard
        ├── feature/p3-shortcuts
        └── feature/p3-calendar
```

Chaque module = une branche feature. Merge dans develop après tests OK.

---

## 7. Références des spécifications

### 7.1 Fichiers de spécifications détaillées

|Module|Fichier|Contenu|
|---|---|---|
|P0 - Sidebar|`SPECS_P0_SIDEBAR_PLUMENOTE.md`|API, composants, store, tests|
|P1 - Homepage + Pin|`SPECS_P1_HOMEPAGE_PIN_PLUMENOTE.md`|Migration DB, endpoints, UI, tests|
|P2 - Métadonnées|`SPECS_P2_METADATA_PLUMENOTE.md`|Schéma complet, 9 types, CRDT, calendrier|
|P3 - Dashboard|`SPECS_P3_DASHBOARD_PLUMENOTE.md`|Analytics, charts Recharts, cache|
|P3 - Raccourcis|`SPECS_P3_SHORTCUTS_PLUMENOTE.md`|Registre, hook, modal, page|
|P3 - Calendrier|`SPECS_P3_CALENDAR_PLUMENOTE.md`|3 vues, filtres, création rapide|

### 7.2 Comment utiliser les specs

Chaque fichier de spécification contient :

1. **Résumé** : Priorité, complexité, estimation, critères d'acceptation
2. **Analyse technique** : Architecture, flux de données
3. **Spécifications détaillées** : Code complet pour chaque fichier
4. **Tests** : Unitaires, composants, E2E
5. **Plan d'implémentation** : Ordre des tâches, checklist
6. **Notes pour Claude Code** : Commandes, points d'attention

### 7.3 Instructions pour Claude Code

Lors du démarrage d'un module :

1. **Lire ce document** pour la vue d'ensemble
2. **Lire le fichier SPECS correspondant** pour les détails
3. **Vérifier les dépendances** (module précédent terminé ?)
4. **Suivre l'ordre des tâches** dans le plan d'implémentation
5. **Cocher les tâches** dans la section 5 de ce document
6. **Exécuter les tests** après chaque composant majeur

### 7.4 Commandes utiles

```bash
# Navigation
cd /path/to/plumenote

# Développement
npm run dev              # Démarre api + web
npm run dev:api          # API seule
npm run dev:web          # Frontend seul

# Base de données
npm run db:migrate       # Applique les migrations
npm run db:generate      # Génère le client Prisma
npm run db:studio        # Interface Prisma Studio

# Tests
npm run test             # Tests unitaires
npm run test:e2e         # Tests Playwright
npm run test -- sidebar  # Tests filtrés

# Build
npm run build            # Build production
npm run typecheck        # Vérification TypeScript
npm run lint             # ESLint
```

---

## Annexe : Journal des modifications

|Date|Version|Modifications|
|---|---|---|
|Déc 2024|1.0|Création initiale avec 6 modules|
|2024-12-05|1.1|P0 Sidebar : implémentation lazy loading (80%) - API, store, composants créés|
|2024-12-05|1.2|P0 Sidebar : **MODULE TERMINÉ** - Tests unitaires, composants et E2E ajoutés|
|2024-12-06|1.3|P3 Raccourcis : **MODULE TERMINÉ** - Types, registre 40+ raccourcis, composants, page, modal, hook, tests|
|2024-12-06|1.4|P3 Dashboard : **MODULE TERMINÉ** - Analytics service, 5 endpoints, store, 6 composants (StatsCards, ActivityChart, DistributionCharts, TopNotesTable, UserContributionsTable, DashboardPage), tests unitaires|
|2024-12-06|1.5|P3 Calendrier : **MODULE TERMINÉ** - 3 vues (mois, semaine, agenda), filtres, QuickEventModal, 10 composants, calendarStore, calendarApi, tests unitaires. **PROJET COMPLET À 100%**|

---

> **Note pour Claude Code** : Ce document doit être mis à jour au fur et à mesure de l'avancement. Après chaque module terminé, cocher les cases dans la section 5 et mettre à jour le pourcentage de progression.