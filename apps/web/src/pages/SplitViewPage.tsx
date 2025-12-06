// ===========================================
// Split View Page - Édition multi-panneaux
// Permet d'ouvrir plusieurs notes côte à côte
// ===========================================

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePanesStore } from '../stores/panesStore';
import { PaneContainer } from '../components/layout/PaneContainer';
import { Button } from '../components/ui/Button';

export function SplitViewPage() {
  const { noteId } = useParams<{ noteId?: string }>();
  const { root, openNoteInActivePane, resetPanes, getPaneCount } = usePanesStore();

  // Open note in active pane when navigating to this page with noteId
  useEffect(() => {
    if (noteId) {
      openNoteInActivePane(noteId);
    }
  }, [noteId, openNoteInActivePane]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
            />
          </svg>
          <h1 className="text-sm font-medium">Mode Split View</h1>
          <span className="text-xs text-muted-foreground">
            {getPaneCount()} panneau{getPaneCount() > 1 ? 'x' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetPanes}>
            Réinitialiser
          </Button>
        </div>
      </div>

      {/* Panes */}
      <div className="flex-1 overflow-hidden">
        <PaneContainer node={root} />
      </div>
    </div>
  );
}
