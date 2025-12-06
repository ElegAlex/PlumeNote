// ===========================================
// Composant NoteItem - P0
// Affichage d'une note dans la sidebar
// ===========================================

import { memo, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useSidebarStore } from '../../stores/sidebarStore';
import { usePanesStore } from '../../stores/panesStore';
import { cn } from '../../lib/utils';
import type { NotePreview } from '@collabnotes/types';

// Même constante d'indentation que FolderItem
const INDENT_PER_LEVEL = 16;

interface NoteItemProps {
  note: NotePreview;
  level: number;
}

export const NoteItem = memo(function NoteItem({ note, level }: NoteItemProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { noteId: currentNoteId } = useParams<{ noteId: string }>();
  const { selectNote } = useSidebarStore();
  const { openNoteInActivePane } = usePanesStore();

  const isActive = currentNoteId === note.id;
  const paddingLeft = level * INDENT_PER_LEVEL + 8;
  const isSplitView = location.pathname.startsWith('/split');

  const handleClick = useCallback(() => {
    selectNote(note.id);
    if (isSplitView) {
      openNoteInActivePane(note.id);
    } else {
      navigate(`/notes/${note.id}`);
    }
  }, [navigate, note.id, selectNote, isSplitView, openNoteInActivePane]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <li role="treeitem">
      <div
        className={cn(
          'flex items-center h-8 px-2 rounded-md cursor-pointer',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'transition-colors duration-150',
          isActive && 'bg-accent text-accent-foreground font-medium'
        )}
        style={{ paddingLeft }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Note ${note.title}`}
        aria-current={isActive ? 'page' : undefined}
      >
        {/* Espace pour alignement avec les chevrons des dossiers */}
        <span className="w-4 h-4 mr-1" />

        {/* Icône note */}
        <svg
          className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>

        {/* Titre de la note */}
        <span className="truncate text-sm">{note.title}</span>
      </div>
    </li>
  );
});
