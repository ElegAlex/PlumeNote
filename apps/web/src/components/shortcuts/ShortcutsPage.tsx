// ===========================================
// Page des Raccourcis Clavier - P3
// ===========================================

import { useState, useMemo } from 'react';
import { Search, Keyboard } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { ShortcutCategory } from './ShortcutCategory';
import { KeyboardKey } from './KeyboardKey';
import { SHORTCUTS, getShortcutsByCategory, searchShortcuts } from '@/config/shortcuts';
import { SHORTCUT_CATEGORIES } from '@plumenote/types';
import { getCmdSymbol } from '@/lib/shortcutUtils';

/**
 * Page complète des raccourcis clavier
 */
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

  return (
    <div className="shortcuts-page h-full overflow-auto" data-testid="shortcuts-page">
      {/* Header */}
      <header className="sticky top-0 z-10 px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Rechercher un raccourci..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-20"
            data-testid="shortcuts-search"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <KeyboardKey keyLabel={getCmdSymbol()} size="sm" />
            <KeyboardKey keyLabel="?" size="sm" />
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="p-6 max-w-4xl mx-auto">
        {!hasResults ? (
          <div className="py-12 text-center" data-testid="no-results">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              Aucun raccourci trouvé pour "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {SHORTCUT_CATEGORIES.map((category) => {
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
            <p className="inline-flex items-center gap-2">
              Appuyez sur{' '}
              <KeyboardKey keyLabel={getCmdSymbol()} size="sm" />
              <KeyboardKey keyLabel="?" size="sm" />
              depuis n'importe où pour ouvrir les raccourcis
            </p>
          </footer>
        )}
      </main>
    </div>
  );
}
