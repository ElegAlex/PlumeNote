// ===========================================
// Composant NoteItem - P0
// Affichage d'une note dans la sidebar
// US-007: Déplacement via menu contextuel
// ===========================================

import { memo, useCallback, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useDraggable } from '@dnd-kit/core';
import { useSidebarStore } from '../../stores/sidebarStore';
import { useFoldersStore } from '../../stores/folders';
import { usePanesStore } from '../../stores/panesStore';
import { MoveToFolderDialog, type FolderTreeNode } from '../common/MoveToFolderDialog';
import { toast } from '../ui/Toaster';
import { cn } from '../../lib/utils';
import type { NotePreview, SidebarFolderNode } from '@plumenote/types';

// Même constante d'indentation que FolderItem
const INDENT_PER_LEVEL = 16;

interface NoteItemProps {
  note: NotePreview;
  level: number;
  folderId?: string | null;
  /** Mode espace personnel (navigation vers /personal/note/) */
  isPersonal?: boolean;
}

// Convertir SidebarFolderNode en FolderTreeNode pour MoveToFolderDialog
function convertToFolderTreeNode(node: SidebarFolderNode): FolderTreeNode {
  return {
    id: node.id,
    name: node.name,
    children: node.children.map(convertToFolderTreeNode),
  };
}

export const NoteItem = memo(function NoteItem({ note, level, folderId, isPersonal = false }: NoteItemProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { noteId: currentNoteId } = useParams<{ noteId: string }>();
  const { selectNote, tree, refreshFolder } = useSidebarStore();
  const { moveNote } = useFoldersStore();
  const { openNoteInActivePane } = usePanesStore();

  // État pour le menu contextuel et la modale de déplacement
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  // Chemins de navigation selon le mode
  const notePath = isPersonal ? `/personal/note/${note.id}` : `/notes/${note.id}`;
  const isActive = currentNoteId === note.id || location.pathname === notePath;
  const paddingLeft = level * INDENT_PER_LEVEL + 8;
  const isSplitView = location.pathname.startsWith('/split');

  // Drag & Drop support (US-007)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `note:${note.id}`,
    data: {
      type: 'note',
      id: note.id,
      name: note.title,
      parentId: folderId,
      isPersonal,
    },
  });

  const handleClick = useCallback(() => {
    if (!isPersonal) {
      selectNote(note.id);
    }
    if (isSplitView) {
      openNoteInActivePane(note.id);
    } else {
      navigate(notePath);
    }
  }, [navigate, note.id, notePath, selectNote, isSplitView, openNoteInActivePane, isPersonal]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  // Menu contextuel (clic droit)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setShowContextMenu(false);
  }, []);

  // Handler pour le déplacement de note
  const handleMoveNote = useCallback(
    async (targetFolderId: string | null) => {
      try {
        await moveNote(note.id, targetFolderId || '');
        toast.success(`Note "${note.title}" déplacée`);
        // Rafraîchir le dossier source et destination
        if (folderId) {
          await refreshFolder(folderId);
        }
        if (targetFolderId) {
          await refreshFolder(targetFolderId);
        }
      } catch (error) {
        toast.error('Erreur lors du déplacement');
        throw error;
      }
    },
    [note.id, note.title, folderId, moveNote, refreshFolder]
  );

  // Convertir l'arbre pour le dialog
  const folderTreeNodes = tree.map(convertToFolderTreeNode);

  // Style pour le drag
  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <li role="treeitem">
      <div
        ref={setNodeRef}
        className={cn(
          'group flex items-center h-8 px-2 rounded-md cursor-pointer',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'transition-colors duration-150',
          isActive && 'bg-accent text-accent-foreground font-medium',
          isDragging && 'opacity-50'
        )}
        style={{ ...dragStyle, paddingLeft }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        aria-label={`Note ${note.title}`}
        aria-current={isActive ? 'page' : undefined}
        {...attributes}
        {...listeners}
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
        <span className="flex-1 truncate text-sm">{note.title}</span>

        {/* Bouton menu (visible au hover) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setContextMenuPosition({ x: e.clientX, y: e.clientY });
            setShowContextMenu(true);
          }}
          className="hidden group-hover:flex h-5 w-5 rounded hover:bg-muted items-center justify-center"
          title="Actions"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* Menu contextuel */}
      {showContextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={handleCloseContextMenu}
          />
          <div
            className="fixed z-50 min-w-[160px] bg-popover border rounded-md shadow-lg py-1"
            style={{
              left: contextMenuPosition.x,
              top: contextMenuPosition.y,
            }}
          >
            <button
              onClick={() => {
                setShowContextMenu(false);
                setShowMoveDialog(true);
              }}
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Déplacer vers...
            </button>
            <button
              onClick={() => {
                setShowContextMenu(false);
                navigate(notePath);
              }}
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Ouvrir
            </button>
          </div>
        </>
      )}

      {/* Dialog de déplacement */}
      {showMoveDialog && (
        <MoveToFolderDialog
          title={`Déplacer "${note.title}"`}
          folders={folderTreeNodes}
          currentFolderId={folderId}
          onMove={handleMoveNote}
          onClose={() => setShowMoveDialog(false)}
        />
      )}
    </li>
  );
});
