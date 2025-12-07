// ===========================================
// Composant ShortcutCategory - Groupe de raccourcis
// ===========================================

import { memo } from 'react';
import * as LucideIcons from 'lucide-react';
import type { ShortcutCategoryInfo, ShortcutDefinition } from '@plumenote/types';
import { ShortcutItem } from './ShortcutItem';

interface ShortcutCategoryProps {
  category: ShortcutCategoryInfo;
  shortcuts: ShortcutDefinition[];
}

// Type pour les icônes Lucide
type LucideIcon = React.ComponentType<{ className?: string }>;

/**
 * Composant pour afficher une catégorie de raccourcis
 */
export const ShortcutCategory = memo(function ShortcutCategory({
  category,
  shortcuts,
}: ShortcutCategoryProps) {
  // Récupérer l'icône dynamiquement depuis lucide-react
  const IconComponent =
    (LucideIcons as Record<string, LucideIcon>)[category.icon] ??
    LucideIcons.HelpCircle;

  return (
    <section data-testid={`shortcut-category-${category.id}`}>
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
        {shortcuts.map((shortcut) => (
          <ShortcutItem key={shortcut.id} shortcut={shortcut} />
        ))}
      </div>
    </section>
  );
});
