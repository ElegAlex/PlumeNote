// ===========================================
// Composant FolderItem - P0
// Composant récursif pour l'arborescence des dossiers
// Utilise InlineCreateForm pour création de sous-dossiers
// US-007: Support drag-and-drop avec feedback visuel
// ===========================================

import { memo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDroppable } from '@dnd-kit/core';
import { useSidebarStore } from '../../stores/sidebarStore';
import { NoteItem } from './NoteItem';
import { Spinner } from '../ui/Spinner';
import { InlineCreateForm } from '../common';
import { cn } from '../../lib/utils';
import type { SidebarFolderNode } from '@plumenote/types';

// Constante d'indentation par niveau (en pixels)
const INDENT_PER_LEVEL = 16;

interface FolderItemProps {
  folder: SidebarFolderNode;
  level: number;
  onCreateNote?: (folderId: string) => void;
  onCreateFolder?: (name: string, parentId: string) => Promise<void>;
}

export const FolderItem = memo(function FolderItem({
  folder,
  level,
  onCreateNote,
  onCreateFolder,
}: FolderItemProps) {
  const navigate = useNavigate();
  const {
    expandedIds,
    loadedFolders,
    isLoadingFolder,
    selectedFolderId,
    toggleFolder,
    selectFolder,
  } = useSidebarStore();

  const isExpanded = expandedIds.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const isLoading = isLoadingFolder === folder.id;
  const cache = loadedFolders.get(folder.id);

  // État local pour création de sous-dossier
  const [isCreatingSubfolder, setIsCreatingSubfolder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Droppable pour le drag-and-drop (US-007)
  const { setNodeRef, isOver } = useDroppable({
    id: `folder:${folder.id}`,
    data: {
      type: 'folder',
      id: folder.id,
      name: folder.name,
    },
  });

  // Contenu à afficher (cache ou données initiales)
  const children = cache?.children ?? folder.children;
  const notes = cache?.notes ?? folder.notes;

  // Détermine si le dossier a du contenu
  const hasContent = folder.hasChildren || folder.notesCount > 0;

  // Handlers
  // Clic sur toute la ligne = navigation + toggle expand/collapse
  const handleRowClick = useCallback(() => {
    navigate(`/folders/${folder.id}`);
    if (hasContent) {
      toggleFolder(folder.id);
    }
    selectFolder(folder.id);
  }, [folder.id, hasContent, toggleFolder, selectFolder, navigate]);

  // Handler séparé pour le chevron (même comportement mais avec stopPropagation)
  const handleChevronClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasContent) {
        toggleFolder(folder.id);
      }
    },
    [folder.id, hasContent, toggleFolder]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (hasContent) {
          toggleFolder(folder.id);
        }
      }
      if (e.key === 'ArrowRight' && hasContent && !isExpanded) {
        e.preventDefault();
        toggleFolder(folder.id);
      }
      if (e.key === 'ArrowLeft' && isExpanded) {
        e.preventDefault();
        toggleFolder(folder.id);
      }
    },
    [folder.id, hasContent, isExpanded, toggleFolder]
  );

  const handleCreateNote = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCreateNote?.(folder.id);
    },
    [folder.id, onCreateNote]
  );

  const handleCreateFolderClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      // Ouvrir le dossier si pas déjà ouvert
      if (!isExpanded && hasContent) {
        toggleFolder(folder.id);
      }
      setIsCreatingSubfolder(true);
    },
    [folder.id, isExpanded, hasContent, toggleFolder]
  );

  const handleCreateFolderSubmit = useCallback(
    async (name: string) => {
      if (!onCreateFolder) return;
      setIsSubmitting(true);
      try {
        await onCreateFolder(name, folder.id);
        setIsCreatingSubfolder(false);
      } finally {
        setIsSubmitting(false);
      }
    },
    [folder.id, onCreateFolder]
  );

  const handleCancelCreateFolder = useCallback(() => {
    setIsCreatingSubfolder(false);
  }, []);

  // Calcul de l'indentation
  const paddingLeft = level * INDENT_PER_LEVEL + 8;

  // Couleur de l'icône : utiliser la couleur définie ou la couleur par défaut
  const folderIconColor = folder.color || 'currentColor';

  return (
    <li role="treeitem" aria-expanded={isExpanded}>
      {/* En-tête du dossier */}
      <div
        ref={setNodeRef}
        className={cn(
          'group flex items-center h-8 px-2 rounded-md cursor-pointer',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'transition-colors duration-150',
          isSelected && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
          // Feedback visuel pendant le drag-over (US-007)
          isOver && 'ring-2 ring-primary ring-inset bg-primary/10'
        )}
        style={{ paddingLeft }}
        onClick={handleRowClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Dossier ${folder.name}${hasContent ? ', cliquez pour déplier' : ''}`}
      >
        {/* Chevron de dépliage */}
        <button
          onClick={handleChevronClick}
          className="w-4 h-4 flex items-center justify-center mr-1 hover:bg-muted rounded"
          tabIndex={-1}
        >
          {isLoading ? (
            <Spinner size="sm" />
          ) : hasContent ? (
            <svg
              className={cn(
                'h-3 w-3 text-muted-foreground transition-transform duration-200',
                isExpanded && 'rotate-90'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          ) : null}
        </button>

        {/* Icône dossier */}
        <svg
          className="h-4 w-4 mr-2 flex-shrink-0"
          style={{ color: folderIconColor }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={
              isExpanded
                ? 'M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z'
                : 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
            }
          />
        </svg>

        {/* Nom du dossier */}
        <span className="flex-1 truncate text-sm">{folder.name}</span>

        {/* Actions (visibles au hover) */}
        <div className="hidden group-hover:flex items-center gap-0.5">
          {onCreateNote && (
            <button
              onClick={handleCreateNote}
              className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center"
              title="Nouvelle note"
            >
              <svg
                className="h-3 w-3"
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
            </button>
          )}
          {onCreateFolder && (
            <button
              onClick={handleCreateFolderClick}
              className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center"
              title="Nouveau sous-dossier"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Badge compteur (quand replié) */}
        {!isExpanded && folder.notesCount > 0 && (
          <span className="ml-1 text-xs text-muted-foreground group-hover:hidden">
            {folder.notesCount}
          </span>
        )}
      </div>

      {/* Contenu déplié : formulaire création, sous-dossiers puis notes */}
      {(isExpanded || isCreatingSubfolder) && (
        <ul role="group" className="mt-0.5">
          {/* Formulaire de création de sous-dossier (composant générique) */}
          {isCreatingSubfolder && (
            <li
              className="py-1"
              style={{ paddingLeft: (level + 1) * INDENT_PER_LEVEL + 8 }}
            >
              <InlineCreateForm
                onSubmit={handleCreateFolderSubmit}
                onCancel={handleCancelCreateFolder}
                placeholder="Nom du dossier"
                isLoading={isSubmitting}
                compact
              />
            </li>
          )}

          {/* D'abord les sous-dossiers (tri alphabétique déjà fait côté API) */}
          {children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              onCreateNote={onCreateNote}
              onCreateFolder={onCreateFolder}
            />
          ))}

          {/* Ensuite les notes (tri alphabétique déjà fait côté API) */}
          {notes.map((note) => (
            <NoteItem key={note.id} note={note} level={level + 1} folderId={folder.id} />
          ))}

          {/* État vide */}
          {children.length === 0 && notes.length === 0 && !isLoading && !isCreatingSubfolder && (
            <li
              className="text-xs text-muted-foreground italic py-1"
              style={{ paddingLeft: (level + 1) * INDENT_PER_LEVEL + 8 }}
            >
              Dossier vide
            </li>
          )}
        </ul>
      )}
    </li>
  );
});
