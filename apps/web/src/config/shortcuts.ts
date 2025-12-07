// ===========================================
// Registre des raccourcis clavier - P3
// ===========================================

import type { ShortcutDefinition } from '@plumenote/types';

/**
 * Liste complète des raccourcis de l'application
 */
export const SHORTCUTS: ShortcutDefinition[] = [
  // ========== NAVIGATION ==========
  {
    id: 'quick-search',
    action: 'Recherche rapide',
    description: 'Ouvrir la palette de recherche pour trouver rapidement notes et commandes',
    keys: { modifiers: ['cmd'], key: 'k' },
    category: 'navigation',
    context: 'global',
  },
  {
    id: 'new-note',
    action: 'Nouvelle note',
    description: 'Créer une nouvelle note dans le dossier courant',
    keys: { modifiers: ['cmd'], key: 'n' },
    category: 'navigation',
    context: 'global',
  },
  {
    id: 'new-folder',
    action: 'Nouveau dossier',
    description: 'Créer un nouveau dossier',
    keys: { modifiers: ['cmd', 'shift'], key: 'n' },
    category: 'navigation',
    context: 'global',
  },
  {
    id: 'settings',
    action: 'Paramètres',
    description: "Ouvrir les paramètres de l'application",
    keys: { modifiers: ['cmd'], key: ',' },
    category: 'navigation',
    context: 'global',
  },
  {
    id: 'shortcuts',
    action: 'Raccourcis clavier',
    description: 'Afficher cette page de raccourcis',
    keys: { modifiers: ['cmd'], key: '?' },
    category: 'navigation',
    context: 'global',
  },
  {
    id: 'toggle-sidebar',
    action: 'Afficher/masquer sidebar',
    description: 'Afficher ou masquer la barre latérale',
    keys: { modifiers: ['cmd'], key: '\\' },
    category: 'navigation',
    context: 'global',
  },
  {
    id: 'go-back',
    action: 'Page précédente',
    description: 'Revenir à la page précédente',
    keys: { modifiers: ['alt'], key: 'left' },
    category: 'navigation',
    context: 'global',
  },
  {
    id: 'go-forward',
    action: 'Page suivante',
    description: 'Aller à la page suivante',
    keys: { modifiers: ['alt'], key: 'right' },
    category: 'navigation',
    context: 'global',
  },

  // ========== ÉDITEUR - ACTIONS ==========
  {
    id: 'save',
    action: 'Sauvegarder',
    description: 'Sauvegarder la note courante',
    keys: { modifiers: ['cmd'], key: 's' },
    category: 'editor-actions',
    context: 'editor',
  },
  {
    id: 'undo',
    action: 'Annuler',
    description: 'Annuler la dernière action',
    keys: { modifiers: ['cmd'], key: 'z' },
    category: 'editor-actions',
    context: 'editor',
  },
  {
    id: 'redo',
    action: 'Rétablir',
    description: "Rétablir l'action annulée",
    keys: { modifiers: ['cmd', 'shift'], key: 'z' },
    category: 'editor-actions',
    context: 'editor',
  },
  {
    id: 'find',
    action: 'Rechercher',
    description: 'Rechercher dans la note courante',
    keys: { modifiers: ['cmd'], key: 'f' },
    category: 'editor-actions',
    context: 'editor',
  },
  {
    id: 'find-replace',
    action: 'Rechercher et remplacer',
    description: 'Rechercher et remplacer du texte',
    keys: { modifiers: ['cmd'], key: 'h' },
    category: 'editor-actions',
    context: 'editor',
  },
  {
    id: 'preview',
    action: 'Mode aperçu',
    description: 'Basculer en mode lecture seule',
    keys: { modifiers: ['cmd'], key: 'p' },
    category: 'editor-actions',
    context: 'editor',
  },
  {
    id: 'duplicate-line',
    action: 'Dupliquer la ligne',
    description: 'Dupliquer la ligne courante',
    keys: { modifiers: ['cmd'], key: 'd' },
    category: 'editor-actions',
    context: 'editor',
  },
  {
    id: 'duplicate-note',
    action: 'Dupliquer la note',
    description: 'Créer une copie de la note courante',
    keys: { modifiers: ['cmd', 'shift'], key: 'd' },
    category: 'editor-actions',
    context: 'editor',
  },

  // ========== ÉDITEUR - FORMATAGE ==========
  {
    id: 'bold',
    action: 'Gras',
    description: 'Mettre le texte sélectionné en gras',
    keys: { modifiers: ['cmd'], key: 'b' },
    category: 'editor-formatting',
    context: 'editor',
  },
  {
    id: 'italic',
    action: 'Italique',
    description: 'Mettre le texte sélectionné en italique',
    keys: { modifiers: ['cmd'], key: 'i' },
    category: 'editor-formatting',
    context: 'editor',
  },
  {
    id: 'underline',
    action: 'Souligné',
    description: 'Souligner le texte sélectionné',
    keys: { modifiers: ['cmd'], key: 'u' },
    category: 'editor-formatting',
    context: 'editor',
  },
  {
    id: 'strikethrough',
    action: 'Barré',
    description: 'Barrer le texte sélectionné',
    keys: { modifiers: ['cmd', 'shift'], key: 's' },
    category: 'editor-formatting',
    context: 'editor',
  },
  {
    id: 'highlight',
    action: 'Surligné',
    description: 'Surligner le texte sélectionné',
    keys: { modifiers: ['cmd', 'shift'], key: 'h' },
    category: 'editor-formatting',
    context: 'editor',
  },
  {
    id: 'link',
    action: 'Insérer un lien',
    description: 'Transformer la sélection en lien',
    keys: { modifiers: ['cmd'], key: 'k' },
    category: 'editor-formatting',
    context: 'editor',
  },
  {
    id: 'code',
    action: 'Code inline',
    description: 'Formater comme code inline',
    keys: { modifiers: ['cmd'], key: 'e' },
    category: 'editor-formatting',
    context: 'editor',
  },
  {
    id: 'code-block',
    action: 'Bloc de code',
    description: 'Insérer un bloc de code',
    keys: { modifiers: ['cmd', 'shift'], key: 'c' },
    category: 'editor-formatting',
    context: 'editor',
  },
  {
    id: 'math',
    action: 'Formule mathématique',
    description: 'Insérer une formule LaTeX',
    keys: { modifiers: ['cmd', 'shift'], key: 'm' },
    category: 'editor-formatting',
    context: 'editor',
  },

  // ========== ÉDITEUR - TITRES ==========
  {
    id: 'heading-1',
    action: 'Titre 1',
    description: 'Convertir en titre de niveau 1',
    keys: { modifiers: ['cmd', 'alt'], key: '1' },
    category: 'editor-headings',
    context: 'editor',
  },
  {
    id: 'heading-2',
    action: 'Titre 2',
    description: 'Convertir en titre de niveau 2',
    keys: { modifiers: ['cmd', 'alt'], key: '2' },
    category: 'editor-headings',
    context: 'editor',
  },
  {
    id: 'heading-3',
    action: 'Titre 3',
    description: 'Convertir en titre de niveau 3',
    keys: { modifiers: ['cmd', 'alt'], key: '3' },
    category: 'editor-headings',
    context: 'editor',
  },
  {
    id: 'heading-4',
    action: 'Titre 4',
    description: 'Convertir en titre de niveau 4',
    keys: { modifiers: ['cmd', 'alt'], key: '4' },
    category: 'editor-headings',
    context: 'editor',
  },
  {
    id: 'paragraph',
    action: 'Paragraphe',
    description: 'Convertir en paragraphe normal',
    keys: { modifiers: ['cmd', 'alt'], key: '0' },
    category: 'editor-headings',
    context: 'editor',
  },

  // ========== ÉDITEUR - LISTES ==========
  {
    id: 'numbered-list',
    action: 'Liste numérotée',
    description: 'Créer une liste numérotée',
    keys: { modifiers: ['cmd', 'shift'], key: '7' },
    category: 'editor-lists',
    context: 'editor',
  },
  {
    id: 'bullet-list',
    action: 'Liste à puces',
    description: 'Créer une liste à puces',
    keys: { modifiers: ['cmd', 'shift'], key: '8' },
    category: 'editor-lists',
    context: 'editor',
  },
  {
    id: 'task-list',
    action: 'Liste de tâches',
    description: 'Créer une liste de tâches cochables',
    keys: { modifiers: ['cmd', 'shift'], key: '9' },
    category: 'editor-lists',
    context: 'editor',
  },
  {
    id: 'indent',
    action: 'Indenter',
    description: "Augmenter l'indentation",
    keys: { modifiers: ['cmd'], key: ']' },
    category: 'editor-lists',
    context: 'editor',
  },
  {
    id: 'outdent',
    action: 'Désindenter',
    description: "Réduire l'indentation",
    keys: { modifiers: ['cmd'], key: '[' },
    category: 'editor-lists',
    context: 'editor',
  },

  // ========== ÉDITEUR - BLOCS ==========
  {
    id: 'blockquote',
    action: 'Citation',
    description: 'Convertir en bloc de citation',
    keys: { modifiers: ['cmd', 'shift'], key: 'b' },
    category: 'editor-blocks',
    context: 'editor',
  },
  {
    id: 'image',
    action: 'Image',
    description: 'Insérer une image',
    keys: { modifiers: ['cmd', 'shift'], key: 'i' },
    category: 'editor-blocks',
    context: 'editor',
  },
  {
    id: 'table',
    action: 'Tableau',
    description: 'Insérer un tableau',
    keys: { modifiers: ['cmd', 'shift'], key: 't' },
    category: 'editor-blocks',
    context: 'editor',
  },
  {
    id: 'horizontal-rule',
    action: 'Ligne horizontale',
    description: 'Insérer une ligne de séparation',
    keys: { modifiers: ['cmd', 'shift'], key: 'l' },
    category: 'editor-blocks',
    context: 'editor',
  },
  {
    id: 'slash-commands',
    action: 'Menu de commandes',
    description: 'Ouvrir le menu de commandes slash',
    keys: { modifiers: [], key: '/' },
    category: 'editor-blocks',
    context: 'editor',
  },

  // ========== SÉLECTION ET DÉPLACEMENT ==========
  {
    id: 'select-all',
    action: 'Tout sélectionner',
    description: 'Sélectionner tout le contenu',
    keys: { modifiers: ['cmd'], key: 'a' },
    category: 'selection',
    context: 'editor',
  },
  {
    id: 'select-line',
    action: 'Sélectionner la ligne',
    description: 'Sélectionner la ligne courante',
    keys: { modifiers: ['cmd'], key: 'l' },
    category: 'selection',
    context: 'editor',
  },
  {
    id: 'move-line-up',
    action: 'Déplacer ligne vers le haut',
    description: 'Déplacer la ligne courante vers le haut',
    keys: { modifiers: ['alt'], key: 'up' },
    category: 'selection',
    context: 'editor',
  },
  {
    id: 'move-line-down',
    action: 'Déplacer ligne vers le bas',
    description: 'Déplacer la ligne courante vers le bas',
    keys: { modifiers: ['alt'], key: 'down' },
    category: 'selection',
    context: 'editor',
  },

  // ========== PANNEAUX ==========
  {
    id: 'focus-explorer',
    action: 'Focus explorateur',
    description: "Mettre le focus sur l'explorateur de fichiers",
    keys: { modifiers: ['cmd', 'shift'], key: 'e' },
    category: 'panels',
    context: 'global',
  },
  {
    id: 'focus-search',
    action: 'Focus recherche',
    description: 'Mettre le focus sur la barre de recherche',
    keys: { modifiers: ['cmd', 'shift'], key: 'f' },
    category: 'panels',
    context: 'global',
  },
  {
    id: 'toggle-properties',
    action: 'Panneau Properties',
    description: 'Afficher/masquer le panneau des propriétés',
    keys: { modifiers: ['cmd', 'shift'], key: 'p' },
    category: 'panels',
    context: 'editor',
  },
  {
    id: 'toggle-outline',
    action: 'Panneau Outline',
    description: 'Afficher/masquer la table des matières',
    keys: { modifiers: ['cmd', 'shift'], key: 'o' },
    category: 'panels',
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
 * Recherche dans les raccourcis par action ou description
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
