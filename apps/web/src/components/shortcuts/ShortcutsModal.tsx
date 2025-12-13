// ===========================================
// Modal Raccourcis Clavier - P3
// ===========================================

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Keyboard, ExternalLink, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ShortcutItem } from './ShortcutItem';
import { SHORTCUTS, searchShortcuts } from '@/config/shortcuts';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal de consultation rapide des raccourcis
 */
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]',
            'bg-background rounded-lg border shadow-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            'duration-200'
          )}
          data-testid="shortcuts-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <Dialog.Title className="flex items-center gap-2 text-lg font-semibold">
              <Keyboard className="h-5 w-5" />
              Raccourcis clavier
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Liste des raccourcis clavier disponibles dans l'application
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Recherche */}
          <div className="px-4 py-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
                data-testid="modal-search"
              />
            </div>
          </div>

          {/* Liste */}
          <div className="max-h-[400px] overflow-y-auto">
            <div className="divide-y">
              {filteredShortcuts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Aucun raccourci trouvé
                </div>
              ) : (
                filteredShortcuts.map((shortcut) => (
                  <ShortcutItem key={shortcut.id} shortcut={shortcut} compact />
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {SHORTCUTS.length} raccourcis au total
            </p>
            <Button variant="outline" size="sm" onClick={handleViewAll}>
              Voir tous
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Wrapper avec raccourci global Cmd+? et Cmd+/
 * À intégrer dans App.tsx pour activer globalement
 */
export function ShortcutsModalTrigger() {
  const [open, setOpen] = useState(false);

  // Raccourci Cmd + ?
  useKeyboardShortcut({ modifiers: ['cmd'], key: '?' }, () => setOpen(true));

  // Raccourci Cmd + / (alternative)
  useKeyboardShortcut({ modifiers: ['cmd'], key: '/' }, () => setOpen(true));

  return <ShortcutsModal open={open} onOpenChange={setOpen} />;
}
