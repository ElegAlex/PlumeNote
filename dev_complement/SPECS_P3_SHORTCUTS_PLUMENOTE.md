# MODULE P3 : Page Raccourcis Clavier

## 1. Résumé

|Attribut|Valeur|
|---|---|
|Type|Feature|
|Priorité|**P3-Basse**|
|Complexité|S|
|Modules impactés|Frontend (page, composants, hooks)|
|Estimation|1.5 jours-homme|
|Dépendances|Aucune|

### Description

Création d'une page dédiée aux raccourcis clavier accessible depuis la sidebar, remplaçant le widget "Raccourcis" mal positionné sur la homepage. Cette page centralise tous les raccourcis de l'application, organisés par catégorie.

En complément, une modal de raccourcis est accessible via `Cmd/Ctrl + ?` depuis n'importe où dans l'application pour une consultation rapide.

### Critères d'acceptation

**Page Raccourcis :**

- [ ] Page accessible via le lien "Raccourcis" dans la sidebar
- [ ] Raccourcis organisés par catégories (Navigation, Éditeur, Formatage, etc.)
- [ ] Affichage clair des touches avec style visuel distinctif
- [ ] Barre de recherche pour filtrer les raccourcis
- [ ] Responsive (desktop, tablet, mobile)
- [ ] Détection automatique OS (Cmd pour Mac, Ctrl pour Windows/Linux)

**Modal Raccourcis :**

- [ ] Ouverture via `Cmd/Ctrl + ?` ou `Cmd/Ctrl + /`
- [ ] Affichage condensé des raccourcis principaux
- [ ] Lien vers la page complète
- [ ] Fermeture via Escape ou clic extérieur

**Accessibilité :**

- [ ] Navigation au clavier dans la liste
- [ ] Annonces screen reader appropriées
- [ ] Contraste suffisant pour les touches

---

## 2. Analyse technique

### 2.1 Inventaire des raccourcis

#### Navigation globale

|Raccourci|Action|Contexte|
|---|---|---|
|`Cmd/Ctrl + K`|Ouvrir la recherche rapide|Global|
|`Cmd/Ctrl + N`|Nouvelle note|Global|
|`Cmd/Ctrl + Shift + N`|Nouveau dossier|Global|
|`Cmd/Ctrl + ,`|Ouvrir les paramètres|Global|
|`Cmd/Ctrl + ?`|Ouvrir les raccourcis|Global|
|`Cmd/Ctrl + \`|Afficher/masquer la sidebar|Global|
|`Cmd/Ctrl + 1-9`|Aller à l'onglet N|Global|
|`Alt + ←`|Page précédente|Global|
|`Alt + →`|Page suivante|Global|

#### Éditeur - Actions

|Raccourci|Action|Contexte|
|---|---|---|
|`Cmd/Ctrl + S`|Sauvegarder|Éditeur|
|`Cmd/Ctrl + Z`|Annuler|Éditeur|
|`Cmd/Ctrl + Shift + Z`|Rétablir|Éditeur|
|`Cmd/Ctrl + F`|Rechercher dans la note|Éditeur|
|`Cmd/Ctrl + H`|Rechercher et remplacer|Éditeur|
|`Cmd/Ctrl + P`|Aperçu / Mode lecture|Éditeur|
|`Cmd/Ctrl + E`|Basculer édition/aperçu|Éditeur|
|`Cmd/Ctrl + D`|Dupliquer la ligne|Éditeur|
|`Cmd/Ctrl + Shift + D`|Dupliquer la note|Éditeur|
|`Cmd/Ctrl + Enter`|Insérer ligne après|Éditeur|
|`Cmd/Ctrl + Shift + Enter`|Insérer ligne avant|Éditeur|

#### Éditeur - Formatage

|Raccourci|Action|Contexte|
|---|---|---|
|`Cmd/Ctrl + B`|Gras|Éditeur|
|`Cmd/Ctrl + I`|Italique|Éditeur|
|`Cmd/Ctrl + U`|Souligné|Éditeur|
|`Cmd/Ctrl + Shift + S`|Barré|Éditeur|
|`Cmd/Ctrl + Shift + H`|Surligné|Éditeur|
|`Cmd/Ctrl + K`|Insérer lien|Éditeur (sélection)|
|`Cmd/Ctrl + Shift + C`|Bloc de code|Éditeur|
|`Cmd/Ctrl + Shift + M`|Formule mathématique|Éditeur|

#### Éditeur - Titres

|Raccourci|Action|Contexte|
|---|---|---|
|`Cmd/Ctrl + Alt + 1`|Titre 1|Éditeur|
|`Cmd/Ctrl + Alt + 2`|Titre 2|Éditeur|
|`Cmd/Ctrl + Alt + 3`|Titre 3|Éditeur|
|`Cmd/Ctrl + Alt + 4`|Titre 4|Éditeur|
|`Cmd/Ctrl + Alt + 0`|Paragraphe normal|Éditeur|

#### Éditeur - Listes

|Raccourci|Action|Contexte|
|---|---|---|
|`Cmd/Ctrl + Shift + 7`|Liste numérotée|Éditeur|
|`Cmd/Ctrl + Shift + 8`|Liste à puces|Éditeur|
|`Cmd/Ctrl + Shift + 9`|Liste de tâches|Éditeur|
|`Tab`|Indenter|Éditeur (liste)|
|`Shift + Tab`|Désindenter|Éditeur (liste)|
|`Cmd/Ctrl + ]`|Indenter|Éditeur|
|`Cmd/Ctrl + [`|Désindenter|Éditeur|

#### Éditeur - Blocs

|Raccourci|Action|Contexte|
|---|---|---|
|`Cmd/Ctrl + Shift + B`|Citation (blockquote)|Éditeur|
|`Cmd/Ctrl + Shift + I`|Image|Éditeur|
|`Cmd/Ctrl + Shift + T`|Tableau|Éditeur|
|`Cmd/Ctrl + Shift + L`|Ligne horizontale|Éditeur|
|`/`|Menu de commandes|Éditeur (début ligne)|

#### Sélection et déplacement

|Raccourci|Action|Contexte|
|---|---|---|
|`Cmd/Ctrl + A`|Tout sélectionner|Éditeur|
|`Cmd/Ctrl + L`|Sélectionner la ligne|Éditeur|
|`Alt + ↑`|Déplacer ligne vers le haut|Éditeur|
|`Alt + ↓`|Déplacer ligne vers le bas|Éditeur|
|`Cmd/Ctrl + Shift + ↑`|Déplacer bloc vers le haut|Éditeur|
|`Cmd/Ctrl + Shift + ↓`|Déplacer bloc vers le bas|Éditeur|

#### Sidebar et panneaux

|Raccourci|Action|Contexte|
|---|---|---|
|`Cmd/Ctrl + \`|Afficher/masquer sidebar|Global|
|`Cmd/Ctrl + Shift + E`|Focus sur l'explorateur|Global|
|`Cmd/Ctrl + Shift + F`|Focus sur la recherche|Global|
|`Cmd/Ctrl + Shift + P`|Panneau Properties|Éditeur|
|`Cmd/Ctrl + Shift + O`|Panneau Outline|Éditeur|

### 2.2 Architecture de la solution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SHORTCUTS PAGE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  🔍 Rechercher un raccourci...                               [Cmd + ?] ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  NAVIGATION                                                             ││
│  │  ┌─────────────────────────────────────┬───────────────────────────────┐││
│  │  │  Recherche rapide                   │  ⌘ K                          │││
│  │  ├─────────────────────────────────────┼───────────────────────────────┤││
│  │  │  Nouvelle note                      │  ⌘ N                          │││
│  │  ├─────────────────────────────────────┼───────────────────────────────┤││
│  │  │  Nouveau dossier                    │  ⌘ ⇧ N                        │││
│  │  ├─────────────────────────────────────┼───────────────────────────────┤││
│  │  │  Paramètres                         │  ⌘ ,                          │││
│  │  └─────────────────────────────────────┴───────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  ÉDITEUR - FORMATAGE                                                    ││
│  │  ┌─────────────────────────────────────┬───────────────────────────────┐││
│  │  │  Gras                               │  ⌘ B                          │││
│  │  ├─────────────────────────────────────┼───────────────────────────────┤││
│  │  │  Italique                           │  ⌘ I                          │││
│  │  ├─────────────────────────────────────┼───────────────────────────────┤││
│  │  │  Souligné                           │  ⌘ U                          │││
│  │  └─────────────────────────────────────┴───────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ... (autres catégories)                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Détection de l'OS

```typescript
// Détection simple et fiable
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

// Symboles de touches
const KEY_SYMBOLS = {
  mac: {
    cmd: '⌘',
    ctrl: '⌃',
    alt: '⌥',
    shift: '⇧',
    enter: '↵',
    backspace: '⌫',
    delete: '⌦',
    escape: '⎋',
    tab: '⇥',
    up: '↑',
    down: '↓',
    left: '←',
    right: '→'
  },
  other: {
    cmd: 'Ctrl',
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    enter: 'Enter',
    backspace: 'Backspace',
    delete: 'Delete',
    escape: 'Esc',
    tab: 'Tab',
    up: '↑',
    down: '↓',
    left: '←',
    right: '→'
  }
};
```

---

## 3. Spécifications détaillées

### 3.1 Types et interfaces

```typescript
// packages/shared-types/src/shortcuts.ts

export type ModifierKey = 'cmd' | 'ctrl' | 'alt' | 'shift';
export type SpecialKey = 'enter' | 'backspace' | 'delete' | 'escape' | 'tab' | 'up' | 'down' | 'left' | 'right' | 'space';

export interface ShortcutDefinition {
  id: string;
  action: string;
  description: string;
  keys: ShortcutKeys;
  category: ShortcutCategory;
  context: ShortcutContext;
  enabled?: boolean;
}

export interface ShortcutKeys {
  modifiers: ModifierKey[];
  key: string | SpecialKey;
}

export type ShortcutCategory = 
  | 'navigation'
  | 'editor-actions'
  | 'editor-formatting'
  | 'editor-headings'
  | 'editor-lists'
  | 'editor-blocks'
  | 'selection'
  | 'panels';

export type ShortcutContext = 'global' | 'editor' | 'sidebar' | 'modal';

export interface ShortcutCategoryInfo {
  id: ShortcutCategory;
  label: string;
  icon: string;
}

export const SHORTCUT_CATEGORIES: ShortcutCategoryInfo[] = [
  { id: 'navigation', label: 'Navigation', icon: 'Compass' },
  { id: 'editor-actions', label: 'Éditeur - Actions', icon: 'MousePointer' },
  { id: 'editor-formatting', label: 'Éditeur - Formatage', icon: 'Type' },
  { id: 'editor-headings', label: 'Éditeur - Titres', icon: 'Heading' },
  { id: 'editor-lists', label: 'Éditeur - Listes', icon: 'List' },
  { id: 'editor-blocks', label: 'Éditeur - Blocs', icon: 'Square' },
  { id: 'selection', label: 'Sélection et déplacement', icon: 'Move' },
  { id: 'panels', label: 'Panneaux', icon: 'PanelLeft' }
];
```

### 3.2 Registre des raccourcis

```typescript
// apps/web/src/config/shortcuts.ts

import { ShortcutDefinition } from '@plumenote/shared-types';

export const SHORTCUTS: ShortcutDefinition[] = [
  // ========== NAVIGATION ==========
  {
    id: 'quick-search',
    action: 'Recherche rapide',
    description: 'Ouvrir la palette de recherche pour trouver rapidement notes et commandes',
    keys: { modifiers: ['cmd'], key: 'k' },
    category: 'navigation',
    context: 'global'
  },
  {
    id: 'new-note',
    action: 'Nouvelle note',
    description: 'Créer une nouvelle note dans le dossier courant',
    keys: { modifiers: ['cmd'], key: 'n' },
    category: 'navigation',
    context: 'global'
  },
  {
    id: 'new-folder',
    action: 'Nouveau dossier',
    description: 'Créer un nouveau dossier',
    keys: { modifiers: ['cmd', 'shift'], key: 'n' },
    category: 'navigation',
    context: 'global'
  },
  {
    id: 'settings',
    action: 'Paramètres',
    description: 'Ouvrir les paramètres de l\'application',
    keys: { modifiers: ['cmd'], key: ',' },
    category: 'navigation',
    context: 'global'
  },
  {
    id: 'shortcuts',
    action: 'Raccourcis clavier',
    description: 'Afficher cette page de raccourcis',
    keys: { modifiers: ['cmd'], key: '?' },
    category: 'navigation',
    context: 'global'
  },
  {
    id: 'toggle-sidebar',
    action: 'Afficher/masquer sidebar',
    description: 'Afficher ou masquer la barre latérale',
    keys: { modifiers: ['cmd'], key: '\\' },
    category: 'navigation',
    context: 'global'
  },
  {
    id: 'go-back',
    action: 'Page précédente',
    description: 'Revenir à la page précédente',
    keys: { modifiers: ['alt'], key: 'left' },
    category: 'navigation',
    context: 'global'
  },
  {
    id: 'go-forward',
    action: 'Page suivante',
    description: 'Aller à la page suivante',
    keys: { modifiers: ['alt'], key: 'right' },
    category: 'navigation',
    context: 'global'
  },

  // ========== ÉDITEUR - ACTIONS ==========
  {
    id: 'save',
    action: 'Sauvegarder',
    description: 'Sauvegarder la note courante',
    keys: { modifiers: ['cmd'], key: 's' },
    category: 'editor-actions',
    context: 'editor'
  },
  {
    id: 'undo',
    action: 'Annuler',
    description: 'Annuler la dernière action',
    keys: { modifiers: ['cmd'], key: 'z' },
    category: 'editor-actions',
    context: 'editor'
  },
  {
    id: 'redo',
    action: 'Rétablir',
    description: 'Rétablir l\'action annulée',
    keys: { modifiers: ['cmd', 'shift'], key: 'z' },
    category: 'editor-actions',
    context: 'editor'
  },
  {
    id: 'find',
    action: 'Rechercher',
    description: 'Rechercher dans la note courante',
    keys: { modifiers: ['cmd'], key: 'f' },
    category: 'editor-actions',
    context: 'editor'
  },
  {
    id: 'find-replace',
    action: 'Rechercher et remplacer',
    description: 'Rechercher et remplacer du texte',
    keys: { modifiers: ['cmd'], key: 'h' },
    category: 'editor-actions',
    context: 'editor'
  },
  {
    id: 'preview',
    action: 'Mode aperçu',
    description: 'Basculer en mode lecture seule',
    keys: { modifiers: ['cmd'], key: 'p' },
    category: 'editor-actions',
    context: 'editor'
  },
  {
    id: 'duplicate-line',
    action: 'Dupliquer la ligne',
    description: 'Dupliquer la ligne courante',
    keys: { modifiers: ['cmd'], key: 'd' },
    category: 'editor-actions',
    context: 'editor'
  },
  {
    id: 'duplicate-note',
    action: 'Dupliquer la note',
    description: 'Créer une copie de la note courante',
    keys: { modifiers: ['cmd', 'shift'], key: 'd' },
    category: 'editor-actions',
    context: 'editor'
  },

  // ========== ÉDITEUR - FORMATAGE ==========
  {
    id: 'bold',
    action: 'Gras',
    description: 'Mettre le texte sélectionné en gras',
    keys: { modifiers: ['cmd'], key: 'b' },
    category: 'editor-formatting',
    context: 'editor'
  },
  {
    id: 'italic',
    action: 'Italique',
    description: 'Mettre le texte sélectionné en italique',
    keys: { modifiers: ['cmd'], key: 'i' },
    category: 'editor-formatting',
    context: 'editor'
  },
  {
    id: 'underline',
    action: 'Souligné',
    description: 'Souligner le texte sélectionné',
    keys: { modifiers: ['cmd'], key: 'u' },
    category: 'editor-formatting',
    context: 'editor'
  },
  {
    id: 'strikethrough',
    action: 'Barré',
    description: 'Barrer le texte sélectionné',
    keys: { modifiers: ['cmd', 'shift'], key: 's' },
    category: 'editor-formatting',
    context: 'editor'
  },
  {
    id: 'highlight',
    action: 'Surligné',
    description: 'Surligner le texte sélectionné',
    keys: { modifiers: ['cmd', 'shift'], key: 'h' },
    category: 'editor-formatting',
    context: 'editor'
  },
  {
    id: 'link',
    action: 'Insérer un lien',
    description: 'Transformer la sélection en lien',
    keys: { modifiers: ['cmd'], key: 'k' },
    category: 'editor-formatting',
    context: 'editor'
  },
  {
    id: 'code',
    action: 'Code inline',
    description: 'Formater comme code inline',
    keys: { modifiers: ['cmd'], key: 'e' },
    category: 'editor-formatting',
    context: 'editor'
  },
  {
    id: 'code-block',
    action: 'Bloc de code',
    description: 'Insérer un bloc de code',
    keys: { modifiers: ['cmd', 'shift'], key: 'c' },
    category: 'editor-formatting',
    context: 'editor'
  },
  {
    id: 'math',
    action: 'Formule mathématique',
    description: 'Insérer une formule LaTeX',
    keys: { modifiers: ['cmd', 'shift'], key: 'm' },
    category: 'editor-formatting',
    context: 'editor'
  },

  // ========== ÉDITEUR - TITRES ==========
  {
    id: 'heading-1',
    action: 'Titre 1',
    description: 'Convertir en titre de niveau 1',
    keys: { modifiers: ['cmd', 'alt'], key: '1' },
    category: 'editor-headings',
    context: 'editor'
  },
  {
    id: 'heading-2',
    action: 'Titre 2',
    description: 'Convertir en titre de niveau 2',
    keys: { modifiers: ['cmd', 'alt'], key: '2' },
    category: 'editor-headings',
    context: 'editor'
  },
  {
    id: 'heading-3',
    action: 'Titre 3',
    description: 'Convertir en titre de niveau 3',
    keys: { modifiers: ['cmd', 'alt'], key: '3' },
    category: 'editor-headings',
    context: 'editor'
  },
  {
    id: 'heading-4',
    action: 'Titre 4',
    description: 'Convertir en titre de niveau 4',
    keys: { modifiers: ['cmd', 'alt'], key: '4' },
    category: 'editor-headings',
    context: 'editor'
  },
  {
    id: 'paragraph',
    action: 'Paragraphe',
    description: 'Convertir en paragraphe normal',
    keys: { modifiers: ['cmd', 'alt'], key: '0' },
    category: 'editor-headings',
    context: 'editor'
  },

  // ========== ÉDITEUR - LISTES ==========
  {
    id: 'numbered-list',
    action: 'Liste numérotée',
    description: 'Créer une liste numérotée',
    keys: { modifiers: ['cmd', 'shift'], key: '7' },
    category: 'editor-lists',
    context: 'editor'
  },
  {
    id: 'bullet-list',
    action: 'Liste à puces',
    description: 'Créer une liste à puces',
    keys: { modifiers: ['cmd', 'shift'], key: '8' },
    category: 'editor-lists',
    context: 'editor'
  },
  {
    id: 'task-list',
    action: 'Liste de tâches',
    description: 'Créer une liste de tâches cochables',
    keys: { modifiers: ['cmd', 'shift'], key: '9' },
    category: 'editor-lists',
    context: 'editor'
  },
  {
    id: 'indent',
    action: 'Indenter',
    description: 'Augmenter l\'indentation',
    keys: { modifiers: ['cmd'], key: ']' },
    category: 'editor-lists',
    context: 'editor'
  },
  {
    id: 'outdent',
    action: 'Désindenter',
    description: 'Réduire l\'indentation',
    keys: { modifiers: ['cmd'], key: '[' },
    category: 'editor-lists',
    context: 'editor'
  },

  // ========== ÉDITEUR - BLOCS ==========
  {
    id: 'blockquote',
    action: 'Citation',
    description: 'Convertir en bloc de citation',
    keys: { modifiers: ['cmd', 'shift'], key: 'b' },
    category: 'editor-blocks',
    context: 'editor'
  },
  {
    id: 'image',
    action: 'Image',
    description: 'Insérer une image',
    keys: { modifiers: ['cmd', 'shift'], key: 'i' },
    category: 'editor-blocks',
    context: 'editor'
  },
  {
    id: 'table',
    action: 'Tableau',
    description: 'Insérer un tableau',
    keys: { modifiers: ['cmd', 'shift'], key: 't' },
    category: 'editor-blocks',
    context: 'editor'
  },
  {
    id: 'horizontal-rule',
    action: 'Ligne horizontale',
    description: 'Insérer une ligne de séparation',
    keys: { modifiers: ['cmd', 'shift'], key: 'l' },
    category: 'editor-blocks',
    context: 'editor'
  },
  {
    id: 'slash-commands',
    action: 'Menu de commandes',
    description: 'Ouvrir le menu de commandes slash',
    keys: { modifiers: [], key: '/' },
    category: 'editor-blocks',
    context: 'editor'
  },

  // ========== SÉLECTION ET DÉPLACEMENT ==========
  {
    id: 'select-all',
    action: 'Tout sélectionner',
    description: 'Sélectionner tout le contenu',
    keys: { modifiers: ['cmd'], key: 'a' },
    category: 'selection',
    context: 'editor'
  },
  {
    id: 'select-line',
    action: 'Sélectionner la ligne',
    description: 'Sélectionner la ligne courante',
    keys: { modifiers: ['cmd'], key: 'l' },
    category: 'selection',
    context: 'editor'
  },
  {
    id: 'move-line-up',
    action: 'Déplacer ligne vers le haut',
    description: 'Déplacer la ligne courante vers le haut',
    keys: { modifiers: ['alt'], key: 'up' },
    category: 'selection',
    context: 'editor'
  },
  {
    id: 'move-line-down',
    action: 'Déplacer ligne vers le bas',
    description: 'Déplacer la ligne courante vers le bas',
    keys: { modifiers: ['alt'], key: 'down' },
    category: 'selection',
    context: 'editor'
  },

  // ========== PANNEAUX ==========
  {
    id: 'focus-explorer',
    action: 'Focus explorateur',
    description: 'Mettre le focus sur l\'explorateur de fichiers',
    keys: { modifiers: ['cmd', 'shift'], key: 'e' },
    category: 'panels',
    context: 'global'
  },
  {
    id: 'focus-search',
    action: 'Focus recherche',
    description: 'Mettre le focus sur la barre de recherche',
    keys: { modifiers: ['cmd', 'shift'], key: 'f' },
    category: 'panels',
    context: 'global'
  },
  {
    id: 'toggle-properties',
    action: 'Panneau Properties',
    description: 'Afficher/masquer le panneau des propriétés',
    keys: { modifiers: ['cmd', 'shift'], key: 'p' },
    category: 'panels',
    context: 'editor'
  },
  {
    id: 'toggle-outline',
    action: 'Panneau Outline',
    description: 'Afficher/masquer la table des matières',
    keys: { modifiers: ['cmd', 'shift'], key: 'o' },
    category: 'panels',
    context: 'editor'
  }
];

/**
 * Récupère les raccourcis par catégorie
 */
export function getShortcutsByCategory(): Map<string, ShortcutDefinition[]> {
  const map = new Map<string, ShortcutDefinition[]>();
  
  for (const shortcut of SHORTCUTS) {
    const existing = map.get(shortcut.category) ?? [];
    existing.push(shortcut);
    map.set(shortcut.category, existing);
  }
  
  return map;
}

/**
 * Recherche dans les raccourcis
 */
export function searchShortcuts(query: string): ShortcutDefinition[] {
  const normalizedQuery = query.toLowerCase().trim();
  
  if (!normalizedQuery) return SHORTCUTS;
  
  return SHORTCUTS.filter(shortcut => 
    shortcut.action.toLowerCase().includes(normalizedQuery) ||
    shortcut.description.toLowerCase().includes(normalizedQuery)
  );
}
```

### 3.3 Hook useKeyboardShortcuts

```typescript
// apps/web/src/hooks/useKeyboardShortcuts.ts

import { useEffect, useCallback, useMemo } from 'react';
import { ShortcutKeys, ModifierKey } from '@plumenote/shared-types';

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

interface ShortcutHandler {
  keys: ShortcutKeys;
  handler: (event: KeyboardEvent) => void;
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * Hook pour gérer les raccourcis clavier
 */
export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignorer si focus dans un champ de formulaire (sauf pour les raccourcis globaux)
    const target = event.target as HTMLElement;
    const isFormField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

    for (const shortcut of shortcuts) {
      if (shortcut.enabled === false) continue;
      if (!matchesShortcut(event, shortcut.keys)) continue;

      // Pour les champs de formulaire, autoriser seulement certains raccourcis
      if (isFormField && !isAllowedInFormField(shortcut.keys)) continue;

      if (shortcut.preventDefault !== false) {
        event.preventDefault();
      }
      shortcut.handler(event);
      break;
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Vérifie si l'événement correspond au raccourci
 */
function matchesShortcut(event: KeyboardEvent, keys: ShortcutKeys): boolean {
  // Vérifier les modifiers
  const cmdPressed = isMac ? event.metaKey : event.ctrlKey;
  const ctrlPressed = event.ctrlKey;
  const altPressed = event.altKey;
  const shiftPressed = event.shiftKey;

  const needsCmd = keys.modifiers.includes('cmd');
  const needsCtrl = keys.modifiers.includes('ctrl');
  const needsAlt = keys.modifiers.includes('alt');
  const needsShift = keys.modifiers.includes('shift');

  // Sur Mac, 'cmd' = metaKey, sur Windows/Linux, 'cmd' = ctrlKey
  if (needsCmd && !cmdPressed) return false;
  if (needsCtrl && !ctrlPressed) return false;
  if (needsAlt && !altPressed) return false;
  if (needsShift && !shiftPressed) return false;

  // Vérifier qu'il n'y a pas de modifiers supplémentaires
  const modifierCount = keys.modifiers.length;
  const pressedModifiers = [
    needsCmd ? cmdPressed : false,
    needsCtrl ? ctrlPressed : false,
    needsAlt ? altPressed : false,
    needsShift ? shiftPressed : false
  ].filter(Boolean).length;

  if (pressedModifiers !== modifierCount) {
    // Il y a des modifiers en plus ou en moins
    const extraModifiers = 
      (!needsCmd && cmdPressed) ||
      (!needsAlt && altPressed) ||
      (!needsShift && shiftPressed);
    if (extraModifiers) return false;
  }

  // Vérifier la touche principale
  const pressedKey = event.key.toLowerCase();
  const expectedKey = normalizeKey(keys.key);

  return pressedKey === expectedKey;
}

/**
 * Normalise le nom de touche
 */
function normalizeKey(key: string): string {
  const keyMap: Record<string, string> = {
    'up': 'arrowup',
    'down': 'arrowdown',
    'left': 'arrowleft',
    'right': 'arrowright',
    'enter': 'enter',
    'escape': 'escape',
    'tab': 'tab',
    'space': ' ',
    'backspace': 'backspace',
    'delete': 'delete'
  };

  return keyMap[key.toLowerCase()] ?? key.toLowerCase();
}

/**
 * Vérifie si le raccourci est autorisé dans un champ de formulaire
 */
function isAllowedInFormField(keys: ShortcutKeys): boolean {
  // Les raccourcis avec Cmd/Ctrl sont généralement OK
  if (keys.modifiers.includes('cmd') || keys.modifiers.includes('ctrl')) {
    return true;
  }
  return false;
}

/**
 * Hook pour un raccourci unique
 */
export function useKeyboardShortcut(
  keys: ShortcutKeys,
  handler: () => void,
  enabled: boolean = true
) {
  useKeyboardShortcuts([
    {
      keys,
      handler,
      enabled
    }
  ]);
}
```

### 3.4 Utilitaires d'affichage

```typescript
// apps/web/src/lib/shortcutUtils.ts

import { ShortcutKeys, ModifierKey, SpecialKey } from '@plumenote/shared-types';

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

const MAC_SYMBOLS: Record<string, string> = {
  cmd: '⌘',
  ctrl: '⌃',
  alt: '⌥',
  shift: '⇧',
  enter: '↵',
  backspace: '⌫',
  delete: '⌦',
  escape: '⎋',
  tab: '⇥',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  space: '␣'
};

const WINDOWS_LABELS: Record<string, string> = {
  cmd: 'Ctrl',
  ctrl: 'Ctrl',
  alt: 'Alt',
  shift: 'Shift',
  enter: 'Enter',
  backspace: 'Backspace',
  delete: 'Delete',
  escape: 'Esc',
  tab: 'Tab',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  space: 'Space'
};

/**
 * Formate un raccourci pour l'affichage
 */
export function formatShortcut(keys: ShortcutKeys): string[] {
  const symbols = isMac ? MAC_SYMBOLS : WINDOWS_LABELS;
  const parts: string[] = [];

  // Ordre des modifiers : Ctrl/Cmd, Alt, Shift
  const orderedModifiers: ModifierKey[] = ['cmd', 'ctrl', 'alt', 'shift'];
  
  for (const mod of orderedModifiers) {
    if (keys.modifiers.includes(mod)) {
      // Sur Mac, ignorer 'ctrl' si 'cmd' est déjà là (sauf si explicitement demandé)
      if (isMac && mod === 'ctrl' && keys.modifiers.includes('cmd')) continue;
      // Sur Windows, 'cmd' devient 'Ctrl' donc pas de doublon
      if (!isMac && mod === 'cmd' && keys.modifiers.includes('ctrl')) continue;
      
      parts.push(symbols[mod] ?? mod);
    }
  }

  // Touche principale
  const keySymbol = symbols[keys.key.toLowerCase()] ?? keys.key.toUpperCase();
  parts.push(keySymbol);

  return parts;
}

/**
 * Formate un raccourci en chaîne lisible
 */
export function formatShortcutString(keys: ShortcutKeys): string {
  const parts = formatShortcut(keys);
  return isMac ? parts.join('') : parts.join(' + ');
}

/**
 * Retourne le symbole de la touche Cmd/Ctrl selon l'OS
 */
export function getCmdSymbol(): string {
  return isMac ? '⌘' : 'Ctrl';
}

/**
 * Retourne vrai si on est sur Mac
 */
export function isMacOS(): boolean {
  return isMac;
}
```

### 3.5 Composants

#### ShortcutsPage.tsx

```typescript
// apps/web/src/components/shortcuts/ShortcutsPage.tsx

import { useState, useMemo } from 'react';
import { Search, Keyboard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ShortcutCategory } from './ShortcutCategory';
import { SHORTCUTS, getShortcutsByCategory, searchShortcuts } from '@/config/shortcuts';
import { SHORTCUT_CATEGORIES } from '@plumenote/shared-types';
import { getCmdSymbol } from '@/lib/shortcutUtils';

export function ShortcutsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) {
      return getShortcutsByCategory();
    }
    
    const results = searchShortcuts(searchQuery);
    const map = new Map<string, typeof SHORTCUTS>();
    
    for (const shortcut of results) {
      const existing = map.get(shortcut.category) ?? [];
      existing.push(shortcut);
      map.set(shortcut.category, existing);
    }
    
    return map;
  }, [searchQuery]);

  const hasResults = filteredShortcuts.size > 0;
  const totalCount = Array.from(filteredShortcuts.values()).reduce(
    (sum, items) => sum + items.length, 
    0
  );

  return (
    <div className="shortcuts-page h-full overflow-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 px-6 py-4 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Keyboard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Raccourcis clavier</h1>
            <p className="text-sm text-muted-foreground">
              {SHORTCUTS.length} raccourcis disponibles
            </p>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un raccourci..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-20"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="kbd">{getCmdSymbol()}</kbd>
            <kbd className="kbd">?</kbd>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="p-6 max-w-4xl mx-auto">
        {!hasResults ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              Aucun raccourci trouvé pour "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {SHORTCUT_CATEGORIES.map(category => {
              const shortcuts = filteredShortcuts.get(category.id);
              if (!shortcuts || shortcuts.length === 0) return null;

              return (
                <ShortcutCategory
                  key={category.id}
                  category={category}
                  shortcuts={shortcuts}
                />
              );
            })}
          </div>
        )}

        {/* Footer */}
        {hasResults && (
          <footer className="mt-12 pt-6 border-t text-center text-sm text-muted-foreground">
            <p>
              Appuyez sur <kbd className="kbd">{getCmdSymbol()}</kbd> <kbd className="kbd">?</kbd> 
              {' '}depuis n'importe où pour ouvrir les raccourcis
            </p>
          </footer>
        )}
      </main>
    </div>
  );
}
```

#### ShortcutCategory.tsx

```typescript
// apps/web/src/components/shortcuts/ShortcutCategory.tsx

import { memo } from 'react';
import * as LucideIcons from 'lucide-react';
import { ShortcutCategoryInfo, ShortcutDefinition } from '@plumenote/shared-types';
import { ShortcutItem } from './ShortcutItem';

interface ShortcutCategoryProps {
  category: ShortcutCategoryInfo;
  shortcuts: ShortcutDefinition[];
}

export const ShortcutCategory = memo(function ShortcutCategory({
  category,
  shortcuts
}: ShortcutCategoryProps) {
  // Récupérer l'icône dynamiquement
  const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[category.icon] 
    ?? LucideIcons.HelpCircle;

  return (
    <section>
      {/* Header de catégorie */}
      <div className="flex items-center gap-2 mb-3">
        <IconComponent className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-medium">{category.label}</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {shortcuts.length}
        </span>
      </div>

      {/* Liste des raccourcis */}
      <div className="border rounded-lg divide-y">
        {shortcuts.map(shortcut => (
          <ShortcutItem key={shortcut.id} shortcut={shortcut} />
        ))}
      </div>
    </section>
  );
});
```

#### ShortcutItem.tsx

```typescript
// apps/web/src/components/shortcuts/ShortcutItem.tsx

import { memo } from 'react';
import { ShortcutDefinition } from '@plumenote/shared-types';
import { KeyboardKey } from './KeyboardKey';
import { formatShortcut } from '@/lib/shortcutUtils';

interface ShortcutItemProps {
  shortcut: ShortcutDefinition;
}

export const ShortcutItem = memo(function ShortcutItem({ shortcut }: ShortcutItemProps) {
  const keyParts = formatShortcut(shortcut.keys);

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
      {/* Action et description */}
      <div className="flex-1 min-w-0 pr-4">
        <p className="font-medium">{shortcut.action}</p>
        <p className="text-sm text-muted-foreground truncate">
          {shortcut.description}
        </p>
      </div>

      {/* Touches */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {keyParts.map((key, index) => (
          <KeyboardKey key={index} keyLabel={key} />
        ))}
      </div>
    </div>
  );
});
```

#### KeyboardKey.tsx

```typescript
// apps/web/src/components/shortcuts/KeyboardKey.tsx

import { memo } from 'react';
import { cn } from '@/lib/utils';

interface KeyboardKeyProps {
  keyLabel: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const KeyboardKey = memo(function KeyboardKey({
  keyLabel,
  size = 'md',
  className
}: KeyboardKeyProps) {
  // Déterminer si c'est un symbole (caractère unique) ou un label (mot)
  const isSymbol = keyLabel.length === 1;

  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center font-sans font-medium",
        "rounded border border-border bg-muted",
        "shadow-[0_1px_0_1px_hsl(var(--border))]",
        {
          'min-w-5 h-5 px-1 text-xs': size === 'sm',
          'min-w-7 h-7 px-1.5 text-sm': size === 'md',
          'min-w-9 h-9 px-2 text-base': size === 'lg',
        },
        isSymbol ? 'font-mono' : 'tracking-wide',
        className
      )}
    >
      {keyLabel}
    </kbd>
  );
});
```

#### ShortcutsModal.tsx

```typescript
// apps/web/src/components/shortcuts/ShortcutsModal.tsx

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Keyboard, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShortcutItem } from './ShortcutItem';
import { SHORTCUTS, searchShortcuts } from '@/config/shortcuts';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { getCmdSymbol } from '@/lib/shortcutUtils';

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search quand on ferme
  useEffect(() => {
    if (!open) setSearchQuery('');
  }, [open]);

  const filteredShortcuts = useMemo(() => {
    const results = searchShortcuts(searchQuery);
    // Limiter à 10 pour la modal
    return results.slice(0, 10);
  }, [searchQuery]);

  const handleViewAll = () => {
    onOpenChange(false);
    navigate('/shortcuts');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Raccourcis clavier
          </DialogTitle>
        </DialogHeader>

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Liste */}
        <ScrollArea className="max-h-[400px]">
          <div className="divide-y">
            {filteredShortcuts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Aucun raccourci trouvé
              </div>
            ) : (
              filteredShortcuts.map(shortcut => (
                <ShortcutItem key={shortcut.id} shortcut={shortcut} />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {SHORTCUTS.length} raccourcis au total
          </p>
          <Button variant="outline" size="sm" onClick={handleViewAll}>
            Voir tous
            <ExternalLink className="ml-2 h-3 w-3" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Wrapper avec raccourci global
 */
export function ShortcutsModalTrigger() {
  const [open, setOpen] = useState(false);

  // Raccourci Cmd + ? ou Cmd + /
  useKeyboardShortcut(
    { modifiers: ['cmd'], key: '?' },
    () => setOpen(true)
  );

  useKeyboardShortcut(
    { modifiers: ['cmd'], key: '/' },
    () => setOpen(true)
  );

  return <ShortcutsModal open={open} onOpenChange={setOpen} />;
}
```

### 3.6 Styles CSS

```css
/* apps/web/src/styles/shortcuts.css */

/* Style de base pour les touches */
.kbd {
  @apply inline-flex items-center justify-center font-sans font-medium;
  @apply min-w-6 h-6 px-1.5 text-xs;
  @apply rounded border border-border bg-muted;
  @apply shadow-[0_1px_0_1px_hsl(var(--border))];
}

/* Variante compacte */
.kbd-sm {
  @apply min-w-5 h-5 px-1 text-[10px];
}

/* Animation au hover sur les items */
.shortcut-item {
  @apply transition-colors duration-150;
}

.shortcut-item:hover .kbd {
  @apply bg-background border-primary/30;
}
```

### 3.7 Modification Sidebar

```typescript
// apps/web/src/components/sidebar/Sidebar.tsx (modification)

import { Keyboard } from 'lucide-react';

// Dans la liste des liens de navigation :
const navItems = [
  { path: '/', label: 'Accueil', icon: Home },
  { path: '/search', label: 'Recherche', icon: Search },
  { path: '/dashboard', label: 'Statistiques', icon: BarChart3 },
  { path: '/calendar', label: 'Calendrier', icon: Calendar },
  { path: '/shortcuts', label: 'Raccourcis', icon: Keyboard }, // NOUVEAU
  // ...
];
```

### 3.8 Routing

```typescript
// apps/web/src/App.tsx ou routes.tsx (ajout)

import { ShortcutsPage } from '@/components/shortcuts/ShortcutsPage';

// Ajouter la route :
<Route path="/shortcuts" element={<ShortcutsPage />} />
```

### 3.9 Intégration globale de la modal

```typescript
// apps/web/src/App.tsx (ajout)

import { ShortcutsModalTrigger } from '@/components/shortcuts/ShortcutsModal';

function App() {
  return (
    <ThemeProvider>
      <Router>
        {/* ... routes ... */}
        
        {/* Modal raccourcis globale */}
        <ShortcutsModalTrigger />
      </Router>
    </ThemeProvider>
  );
}
```

---

## 4. Tests

### 4.1 Tests unitaires

```typescript
// apps/web/src/lib/__tests__/shortcutUtils.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatShortcut, formatShortcutString, isMacOS } from '../shortcutUtils';

describe('shortcutUtils', () => {
  describe('formatShortcut', () => {
    describe('on Mac', () => {
      beforeEach(() => {
        vi.stubGlobal('navigator', { platform: 'MacIntel' });
      });

      it('should format Cmd+K correctly', () => {
        const result = formatShortcut({ modifiers: ['cmd'], key: 'k' });
        expect(result).toEqual(['⌘', 'K']);
      });

      it('should format Cmd+Shift+N correctly', () => {
        const result = formatShortcut({ modifiers: ['cmd', 'shift'], key: 'n' });
        expect(result).toEqual(['⌘', '⇧', 'N']);
      });

      it('should format arrow keys with symbols', () => {
        const result = formatShortcut({ modifiers: ['alt'], key: 'up' });
        expect(result).toEqual(['⌥', '↑']);
      });
    });

    describe('on Windows', () => {
      beforeEach(() => {
        vi.stubGlobal('navigator', { platform: 'Win32' });
      });

      it('should format Cmd as Ctrl', () => {
        const result = formatShortcut({ modifiers: ['cmd'], key: 'k' });
        expect(result).toEqual(['Ctrl', 'K']);
      });

      it('should format Cmd+Shift+N correctly', () => {
        const result = formatShortcut({ modifiers: ['cmd', 'shift'], key: 'n' });
        expect(result).toEqual(['Ctrl', 'Shift', 'N']);
      });
    });
  });

  describe('formatShortcutString', () => {
    beforeEach(() => {
      vi.stubGlobal('navigator', { platform: 'MacIntel' });
    });

    it('should join Mac symbols without separator', () => {
      const result = formatShortcutString({ modifiers: ['cmd', 'shift'], key: 'n' });
      expect(result).toBe('⌘⇧N');
    });
  });
});

// apps/web/src/config/__tests__/shortcuts.test.ts

import { describe, it, expect } from 'vitest';
import { SHORTCUTS, getShortcutsByCategory, searchShortcuts } from '../shortcuts';

describe('shortcuts config', () => {
  describe('SHORTCUTS', () => {
    it('should have unique IDs', () => {
      const ids = SHORTCUTS.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid categories', () => {
      const validCategories = [
        'navigation', 'editor-actions', 'editor-formatting',
        'editor-headings', 'editor-lists', 'editor-blocks',
        'selection', 'panels'
      ];
      
      for (const shortcut of SHORTCUTS) {
        expect(validCategories).toContain(shortcut.category);
      }
    });

    it('should have at least one modifier for most shortcuts', () => {
      const withoutModifiers = SHORTCUTS.filter(
        s => s.keys.modifiers.length === 0 && s.keys.key !== '/'
      );
      // Seul '/' n'a pas de modifier
      expect(withoutModifiers.length).toBe(0);
    });
  });

  describe('getShortcutsByCategory', () => {
    it('should return a Map with all categories', () => {
      const result = getShortcutsByCategory();
      expect(result.size).toBeGreaterThan(0);
      expect(result.has('navigation')).toBe(true);
      expect(result.has('editor-formatting')).toBe(true);
    });

    it('should include all shortcuts', () => {
      const result = getShortcutsByCategory();
      let totalCount = 0;
      result.forEach(shortcuts => {
        totalCount += shortcuts.length;
      });
      expect(totalCount).toBe(SHORTCUTS.length);
    });
  });

  describe('searchShortcuts', () => {
    it('should return all shortcuts for empty query', () => {
      const result = searchShortcuts('');
      expect(result.length).toBe(SHORTCUTS.length);
    });

    it('should filter by action name', () => {
      const result = searchShortcuts('gras');
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(s => s.action === 'Gras')).toBe(true);
    });

    it('should filter by description', () => {
      const result = searchShortcuts('sélectionner');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const result1 = searchShortcuts('GRAS');
      const result2 = searchShortcuts('gras');
      expect(result1.length).toBe(result2.length);
    });

    it('should return empty array for no match', () => {
      const result = searchShortcuts('xyznonexistent');
      expect(result.length).toBe(0);
    });
  });
});
```

### 4.2 Tests de composants

```typescript
// apps/web/src/components/shortcuts/__tests__/ShortcutsPage.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ShortcutsPage } from '../ShortcutsPage';

describe('ShortcutsPage', () => {
  const renderPage = () => {
    return render(
      <BrowserRouter>
        <ShortcutsPage />
      </BrowserRouter>
    );
  };

  it('should render the page title', () => {
    renderPage();
    expect(screen.getByText('Raccourcis clavier')).toBeInTheDocument();
  });

  it('should render the search input', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Rechercher un raccourci...')).toBeInTheDocument();
  });

  it('should display all categories', () => {
    renderPage();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Éditeur - Formatage')).toBeInTheDocument();
  });

  it('should filter shortcuts on search', () => {
    renderPage();
    
    const searchInput = screen.getByPlaceholderText('Rechercher un raccourci...');
    fireEvent.change(searchInput, { target: { value: 'gras' } });

    expect(screen.getByText('Gras')).toBeInTheDocument();
    // Les autres catégories non matchées ne devraient pas être visibles
  });

  it('should show no results message for invalid search', () => {
    renderPage();
    
    const searchInput = screen.getByPlaceholderText('Rechercher un raccourci...');
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });

    expect(screen.getByText(/Aucun raccourci trouvé/)).toBeInTheDocument();
  });
});

// apps/web/src/components/shortcuts/__tests__/KeyboardKey.test.tsx

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KeyboardKey } from '../KeyboardKey';

describe('KeyboardKey', () => {
  it('should render the key label', () => {
    render(<KeyboardKey keyLabel="K" />);
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('should render with kbd tag', () => {
    render(<KeyboardKey keyLabel="⌘" />);
    const kbd = screen.getByText('⌘');
    expect(kbd.tagName).toBe('KBD');
  });

  it('should apply size classes', () => {
    const { rerender } = render(<KeyboardKey keyLabel="A" size="sm" />);
    expect(screen.getByText('A')).toHaveClass('min-w-5', 'h-5');

    rerender(<KeyboardKey keyLabel="A" size="lg" />);
    expect(screen.getByText('A')).toHaveClass('min-w-9', 'h-9');
  });
});
```

### 4.3 Tests E2E (Playwright)

```typescript
// e2e/shortcuts.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Shortcuts Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/');
  });

  test('should be accessible from sidebar', async ({ page }) => {
    await page.click('text=Raccourcis');
    await expect(page).toHaveURL('/shortcuts');
    await expect(page.getByText('Raccourcis clavier')).toBeVisible();
  });

  test('should display shortcut categories', async ({ page }) => {
    await page.goto('/shortcuts');

    await expect(page.getByText('Navigation')).toBeVisible();
    await expect(page.getByText('Éditeur - Formatage')).toBeVisible();
    await expect(page.getByText('Éditeur - Listes')).toBeVisible();
  });

  test('should filter shortcuts with search', async ({ page }) => {
    await page.goto('/shortcuts');

    await page.fill('input[placeholder="Rechercher un raccourci..."]', 'gras');

    await expect(page.getByText('Gras')).toBeVisible();
    // Vérifier que les autres sections sont filtrées
    await expect(page.getByText('Navigation')).not.toBeVisible();
  });

  test('should open modal with Cmd+?', async ({ page }) => {
    await page.goto('/');

    // Simuler Cmd+?
    await page.keyboard.press('Meta+?');

    // La modal devrait s'ouvrir
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Raccourcis clavier')).toBeVisible();
  });

  test('should close modal with Escape', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Meta+?');

    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should navigate to full page from modal', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Meta+?');

    await page.getByRole('dialog').getByText('Voir tous').click();

    await expect(page).toHaveURL('/shortcuts');
  });

  test('should display correct key symbols for OS', async ({ page }) => {
    await page.goto('/shortcuts');

    // Sur la CI, c'est généralement Linux
    // Vérifier que les symboles sont corrects
    const isWebKit = page.context().browser()?.browserType().name() === 'webkit';
    
    if (isWebKit) {
      // Safari = probablement Mac
      await expect(page.locator('kbd:has-text("⌘")')).toBeVisible();
    } else {
      // Chrome/Firefox = probablement Windows/Linux
      await expect(page.locator('kbd:has-text("Ctrl")')).toBeVisible();
    }
  });
});
```

---

## 5. Plan d'implémentation

### Ordre des tâches

1. [ ] **Shared-types : Interfaces shortcuts**
    
    - `ShortcutDefinition`, `ShortcutKeys`, `ShortcutCategory`
2. [ ] **Frontend : Config shortcuts.ts**
    
    - Registre complet des raccourcis
    - Fonctions `getShortcutsByCategory`, `searchShortcuts`
3. [ ] **Frontend : Utilitaires shortcutUtils.ts**
    
    - `formatShortcut`, `getCmdSymbol`, `isMacOS`
4. [ ] **Frontend : Hook useKeyboardShortcuts**
    
    - Gestion des événements clavier
    - Support multi-raccourcis
5. [ ] **Frontend : Composant KeyboardKey**
    
    - Style visuel des touches
6. [ ] **Frontend : Composant ShortcutItem**
    
    - Affichage d'un raccourci individuel
7. [ ] **Frontend : Composant ShortcutCategory**
    
    - Groupe de raccourcis par catégorie
8. [ ] **Frontend : Page ShortcutsPage**
    
    - Layout complet avec recherche
9. [ ] **Frontend : Modal ShortcutsModal**
    
    - Version condensée avec trigger global
10. [ ] **Frontend : Modifier la Sidebar**
    
    - Ajouter le lien "Raccourcis"
11. [ ] **Frontend : Ajouter la route /shortcuts**
    
12. [ ] **Frontend : Intégrer ShortcutsModalTrigger dans App**
    
13. [ ] **CSS : Styles shortcuts.css**
    
14. [ ] **Tests : Suite complète**
    

### Estimation révisée

|Tâche|Durée|
|---|---|
|Types et config|2h|
|Utilitaires et hook|2h|
|Composants|4h|
|Page et modal|2h|
|Intégration|1h|
|Tests|2h|
|**Total**|**13h (~1.5 jours)**|

---

## 6. Notes pour Claude Code

### Commandes à exécuter

```bash
# 1. Types partagés
cd /path/to/plumenote/packages/shared-types
# Créer src/shortcuts.ts
npm run build

# 2. Frontend
cd ../apps/web
# Créer les fichiers dans src/config/, src/lib/, src/hooks/, src/components/shortcuts/

# 3. Modifier la sidebar et les routes

# 4. Tests
npm run test -- shortcuts

# 5. Tests E2E
cd ../..
npm run test:e2e -- shortcuts
```

### Points d'attention

- **Détection OS** : Utiliser `navigator.platform` pour fiabilité
- **Symboles Mac** : Utiliser les vrais symboles Unicode (⌘, ⌥, ⇧)
- **Conflits** : Certains raccourcis peuvent être capturés par le navigateur
- **Accessibilité** : Les touches doivent avoir un bon contraste
- **Performance** : Le hook doit éviter les re-renders inutiles

### Dépendances npm

Aucune nouvelle dépendance requise. Utilise les composants UI existants.

---

## 7. Annexes

### A. Arborescence des fichiers

```
plumenote/
├── packages/
│   └── shared-types/
│       └── src/
│           └── shortcuts.ts                    # [CRÉER] Types shortcuts
│
└── apps/
    └── web/
        └── src/
            ├── config/
            │   └── shortcuts.ts                # [CRÉER] Registre des raccourcis
            ├── lib/
            │   └── shortcutUtils.ts            # [CRÉER] Utilitaires d'affichage
            ├── hooks/
            │   └── useKeyboardShortcuts.ts     # [CRÉER] Hook clavier
            ├── styles/
            │   └── shortcuts.css               # [CRÉER] Styles spécifiques
            ├── components/
            │   ├── shortcuts/                  # [CRÉER] Nouveau dossier
            │   │   ├── ShortcutsPage.tsx
            │   │   ├── ShortcutCategory.tsx
            │   │   ├── ShortcutItem.tsx
            │   │   ├── KeyboardKey.tsx
            │   │   ├── ShortcutsModal.tsx
            │   │   └── __tests__/
            │   │       ├── ShortcutsPage.test.tsx
            │   │       └── KeyboardKey.test.tsx
            │   └── sidebar/
            │       └── Sidebar.tsx             # [MODIFIER] Ajouter lien
            └── App.tsx                         # [MODIFIER] Route + Modal
```

### B. Référence des symboles clavier

|Touche|Mac|Windows/Linux|
|---|---|---|
|Command/Ctrl|⌘|Ctrl|
|Control|⌃|Ctrl|
|Alt/Option|⌥|Alt|
|Shift|⇧|Shift|
|Enter|↵|Enter|
|Backspace|⌫|Backspace|
|Delete|⌦|Delete|
|Escape|⎋|Esc|
|Tab|⇥|Tab|
|Flèches|↑↓←→|↑↓←→|

### C. Checklist de validation

- [ ] Le lien "Raccourcis" apparaît dans la sidebar avec icône Keyboard
- [ ] La page /shortcuts affiche toutes les catégories
- [ ] La recherche filtre les raccourcis en temps réel
- [ ] Les symboles s'adaptent à l'OS (⌘ sur Mac, Ctrl sur Windows)
- [ ] `Cmd/Ctrl + ?` ouvre la modal depuis n'importe où
- [ ] La modal se ferme avec Escape
- [ ] Le lien "Voir tous" dans la modal redirige vers /shortcuts
- [ ] Les touches ont un style visuel distinctif
- [ ] La page est responsive
- [ ] Les tests passent à 100%