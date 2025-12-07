// ===========================================
// Composant ShortcutItem - Affichage d'un raccourci
// ===========================================

import { memo } from 'react';
import type { ShortcutDefinition } from '@plumenote/types';
import { KeyboardKey } from './KeyboardKey';
import { formatShortcut } from '@/lib/shortcutUtils';

interface ShortcutItemProps {
  shortcut: ShortcutDefinition;
  compact?: boolean;
}

/**
 * Composant pour afficher un raccourci avec son action et ses touches
 */
export const ShortcutItem = memo(function ShortcutItem({
  shortcut,
  compact = false,
}: ShortcutItemProps) {
  const keyParts = formatShortcut(shortcut.keys);

  if (compact) {
    return (
      <div className="flex items-center justify-between py-2 px-3 hover:bg-muted/50 transition-colors">
        <span className="text-sm font-medium truncate">{shortcut.action}</span>
        <div className="flex items-center gap-0.5 flex-shrink-0 ml-3">
          {keyParts.map((key, index) => (
            <KeyboardKey key={index} keyLabel={key} size="sm" />
          ))}
        </div>
      </div>
    );
  }

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
