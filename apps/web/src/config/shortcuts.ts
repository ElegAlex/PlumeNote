// ===========================================
// Registre des raccourcis clavier
// UNIQUEMENT les raccourcis réellement implémentés
// ===========================================

import type { ShortcutDefinition } from '@plumenote/types';

/**
 * Liste des raccourcis IMPLÉMENTÉS de l'application
 */
export const SHORTCUTS: ShortcutDefinition[] = [
  // ========== NAVIGATION (MainLayout.tsx) ==========
  {
    id: 'quick-search',
    action: 'Recherche rapide',
    description: 'Ouvrir la page de recherche',
    keys: { modifiers: ['cmd'], key: 'k' },
    category: 'navigation',
    context: 'global',
  },
  {
    id: 'new-note',
    action: 'Nouvelle note',
    description: 'Créer une nouvelle note',
    keys: { modifiers: ['alt'], key: 'n' },
    category: 'navigation',
    context: 'global',
  },
  {
    id: 'new-folder',
    action: 'Nouveau dossier',
    description: 'Créer un nouveau dossier',
    keys: { modifiers: ['alt', 'shift'], key: 'n' },
    category: 'navigation',
    context: 'global',
  },
  {
    id: 'settings',
    action: 'Paramètres',
    description: "Ouvrir les paramètres",
    keys: { modifiers: ['cmd'], key: ',' },
    category: 'navigation',
    context: 'global',
  },
  {
    id: 'shortcuts',
    action: 'Raccourcis clavier',
    description: 'Afficher les raccourcis',
    keys: { modifiers: ['cmd'], key: '?' },
    category: 'navigation',
    context: 'global',
  },
  {
    id: 'toggle-sidebar',
    action: 'Toggle sidebar',
    description: 'Afficher/masquer la sidebar',
    keys: { modifiers: ['cmd'], key: '\\' },
    category: 'navigation',
    context: 'global',
  },
  {
    id: 'focus-explorer',
    action: 'Accueil',
    description: "Aller à la page d'accueil",
    keys: { modifiers: ['cmd', 'shift'], key: 'e' },
    category: 'navigation',
    context: 'global',
  },
  {
    id: 'focus-search',
    action: 'Recherche',
    description: 'Aller à la page de recherche',
    keys: { modifiers: ['cmd', 'shift'], key: 'f' },
    category: 'navigation',
    context: 'global',
  },

  // ========== ÉDITEUR - ACTIONS (MarkdownEditor.tsx) ==========
  {
    id: 'save',
    action: 'Sauvegarder',
    description: 'Sauvegarder la note',
    keys: { modifiers: ['cmd'], key: 's' },
    category: 'editor-actions',
    context: 'editor',
  },

  // ========== ÉDITEUR - FORMATAGE ==========
  {
    id: 'bold',
    action: 'Gras',
    description: 'Texte en gras',
    keys: { modifiers: ['cmd'], key: 'b' },
    category: 'editor-formatting',
    context: 'editor',
  },
  {
    id: 'italic',
    action: 'Italique',
    description: 'Texte en italique',
    keys: { modifiers: ['cmd'], key: 'i' },
    category: 'editor-formatting',
    context: 'editor',
  },
  {
    id: 'underline',
    action: 'Souligné',
    description: 'Texte souligné',
    keys: { modifiers: ['cmd'], key: 'u' },
    category: 'editor-formatting',
    context: 'editor',
  },
  {
    id: 'strikethrough',
    action: 'Barré',
    description: 'Texte barré',
    keys: { modifiers: ['cmd', 'shift'], key: 's' },
    category: 'editor-formatting',
    context: 'editor',
  },
  {
    id: 'highlight',
    action: 'Surligné',
    description: 'Texte surligné',
    keys: { modifiers: ['cmd', 'shift'], key: 'h' },
    category: 'editor-formatting',
    context: 'editor',
  },
  {
    id: 'link',
    action: 'Lien',
    description: 'Insérer un lien',
    keys: { modifiers: ['cmd'], key: 'l' },
    category: 'editor-formatting',
    context: 'editor',
  },
  {
    id: 'code',
    action: 'Code inline',
    description: 'Formater en code',
    keys: { modifiers: ['cmd'], key: 'e' },
    category: 'editor-formatting',
    context: 'editor',
  },
  {
    id: 'math',
    action: 'Formule math',
    description: 'Insérer formule LaTeX',
    keys: { modifiers: ['cmd', 'shift'], key: 'm' },
    category: 'editor-formatting',
    context: 'editor',
  },

  // ========== ÉDITEUR - TITRES ==========
  {
    id: 'heading-1',
    action: 'Titre 1',
    description: 'Titre niveau 1',
    keys: { modifiers: ['cmd', 'alt'], key: '1' },
    category: 'editor-headings',
    context: 'editor',
  },
  {
    id: 'heading-2',
    action: 'Titre 2',
    description: 'Titre niveau 2',
    keys: { modifiers: ['cmd', 'alt'], key: '2' },
    category: 'editor-headings',
    context: 'editor',
  },
  {
    id: 'heading-3',
    action: 'Titre 3',
    description: 'Titre niveau 3',
    keys: { modifiers: ['cmd', 'alt'], key: '3' },
    category: 'editor-headings',
    context: 'editor',
  },
  {
    id: 'heading-4',
    action: 'Titre 4',
    description: 'Titre niveau 4',
    keys: { modifiers: ['cmd', 'alt'], key: '4' },
    category: 'editor-headings',
    context: 'editor',
  },
  {
    id: 'paragraph',
    action: 'Paragraphe',
    description: 'Retirer le titre',
    keys: { modifiers: ['cmd', 'alt'], key: '0' },
    category: 'editor-headings',
    context: 'editor',
  },

  // ========== ÉDITEUR - LISTES ==========
  {
    id: 'numbered-list',
    action: 'Liste numérotée',
    description: 'Créer liste numérotée',
    keys: { modifiers: ['cmd', 'shift'], key: '7' },
    category: 'editor-lists',
    context: 'editor',
  },
  {
    id: 'bullet-list',
    action: 'Liste à puces',
    description: 'Créer liste à puces',
    keys: { modifiers: ['cmd', 'shift'], key: '8' },
    category: 'editor-lists',
    context: 'editor',
  },
  {
    id: 'task-list',
    action: 'Liste de tâches',
    description: 'Créer checklist',
    keys: { modifiers: ['cmd', 'shift'], key: '9' },
    category: 'editor-lists',
    context: 'editor',
  },

  // ========== ÉDITEUR - BLOCS ==========
  {
    id: 'blockquote',
    action: 'Citation',
    description: 'Insérer citation',
    keys: { modifiers: ['cmd', 'shift'], key: 'b' },
    category: 'editor-blocks',
    context: 'editor',
  },
  {
    id: 'code-block',
    action: 'Bloc de code',
    description: 'Insérer bloc de code',
    keys: { modifiers: ['cmd', 'shift'], key: 'c' },
    category: 'editor-blocks',
    context: 'editor',
  },
  {
    id: 'image',
    action: 'Image',
    description: 'Insérer image',
    keys: { modifiers: ['cmd', 'shift'], key: 'i' },
    category: 'editor-blocks',
    context: 'editor',
  },
  {
    id: 'table',
    action: 'Tableau',
    description: 'Insérer tableau',
    keys: { modifiers: ['cmd', 'shift'], key: 't' },
    category: 'editor-blocks',
    context: 'editor',
  },
  {
    id: 'horizontal-rule',
    action: 'Ligne horizontale',
    description: 'Insérer séparateur',
    keys: { modifiers: ['cmd', 'shift'], key: '-' },
    category: 'editor-blocks',
    context: 'editor',
  },
];

/**
 * Récupère les raccourcis groupés par catégorie
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

  return SHORTCUTS.filter(
    (shortcut) =>
      shortcut.action.toLowerCase().includes(normalizedQuery) ||
      shortcut.description.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Récupère un raccourci par son ID
 */
export function getShortcutById(id: string): ShortcutDefinition | undefined {
  return SHORTCUTS.find((s) => s.id === id);
}
