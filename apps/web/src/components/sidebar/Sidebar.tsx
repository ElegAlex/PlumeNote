// ===========================================
// Composant Sidebar - P0 Refactored
// Arborescence des dossiers avec lazy loading
// US-007: Drag & Drop pour réorganisation
// ===========================================

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { useSidebarStore } from '../../stores/sidebarStore';
import { useFoldersStore } from '../../stores/folders';
import { useNotesStore } from '../../stores/notes';
import { FolderTree } from './FolderTree';
import { PersonalSidebarSection } from './PersonalSidebarSection';
import { InlineCreateForm } from '../common';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toaster';
import type { SidebarFolderNode } from '@plumenote/types';

// ===========================================
// Types pour Drag & Drop
// ===========================================

type DragItemType = 'folder' | 'note';

interface DragItem {
  type: DragItemType;
  id: string;
  name: string;
  parentId?: string | null;
}

// ===========================================
// Composant Principal
// ===========================================

export function Sidebar() {
  const navigate = useNavigate();
  const { tree, fetchTree, refreshFolder, addFolderToTree, removeFolderFromTree } = useSidebarStore();
  const { createFolder, moveFolder, moveNote } = useFoldersStore();
  const { createNote } = useNotesStore();

  // État section dossiers
  const [isFoldersExpanded, setIsFoldersExpanded] = useState(true);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingRootNote, setIsCreatingRootNote] = useState(false);
  const [parentFolderForNew, setParentFolderForNew] = useState<string | null>(null);

  // État Drag & Drop
  const [activeItem, setActiveItem] = useState<DragItem | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Sensors pour le drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // ===========================================
  // Handlers création
  // ===========================================

  const handleCreateFolder = async (name: string) => {
    try {
      const newFolder = await createFolder(name, parentFolderForNew);
      setIsCreatingFolder(false);
      setParentFolderForNew(null);

      // Mise à jour optimiste immédiate de l'UI
      addFolderToTree({
        id: newFolder.id,
        name: newFolder.name,
        slug: newFolder.slug,
        parentId: parentFolderForNew,
        color: newFolder.color,
        icon: newFolder.icon,
        position: newFolder.position,
        hasChildren: false,
        notesCount: 0,
        children: [],
        notes: [],
        isLoaded: true,
      }, parentFolderForNew);

      toast.success('Dossier créé');
    } catch {
      toast.error('Erreur lors de la création');
    }
  };

  const handleCancelCreateFolder = () => {
    setIsCreatingFolder(false);
    setParentFolderForNew(null);
  };

  // Création note racine (sans dossier)
  const handleCreateRootNote = async (title: string) => {
    try {
      const note = await createNote({ title });
      setIsCreatingRootNote(false);
      navigate(`/notes/${note.id}`);
    } catch {
      toast.error('Erreur lors de la création');
    }
  };

  const handleCreateNote = useCallback(async (folderId: string) => {
    try {
      const note = await createNote({
        title: 'Sans titre',
        folderId,
      });
      navigate(`/notes/${note.id}`);
      // Rafraîchir le dossier parent
      await refreshFolder(folderId);
    } catch {
      toast.error('Erreur lors de la création');
    }
  }, [createNote, navigate, refreshFolder]);

  // Création de sous-dossier depuis FolderItem (nouvelle signature)
  const handleCreateFolderInFolder = useCallback(async (name: string, parentId: string) => {
    try {
      const newFolder = await createFolder(name, parentId);

      // Mise à jour optimiste immédiate de l'UI
      addFolderToTree({
        id: newFolder.id,
        name: newFolder.name,
        slug: newFolder.slug,
        parentId: parentId,
        color: newFolder.color,
        icon: newFolder.icon,
        position: newFolder.position,
        hasChildren: false,
        notesCount: 0,
        children: [],
        notes: [],
        isLoaded: true,
      }, parentId);

      toast.success('Dossier créé');
    } catch {
      toast.error('Erreur lors de la création');
      throw new Error('Création échouée');
    }
  }, [createFolder, addFolderToTree]);

  // ===========================================
  // Handlers Drag & Drop
  // ===========================================

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragItem;
    setActiveItem(data);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over?.id as string | null;
    setOverId(overId);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveItem(null);
      setOverId(null);

      if (!over) return;

      const draggedItem = active.data.current as DragItem;
      const dropTarget = over.id as string;

      // Extraire l'ID du dossier cible
      const targetFolderId = dropTarget.startsWith('folder:')
        ? dropTarget.replace('folder:', '')
        : null;

      if (!targetFolderId) return;

      // Vérifier qu'on ne dépose pas sur soi-même
      if (draggedItem.type === 'folder' && draggedItem.id === targetFolderId) {
        return;
      }

      // Vérifier descendance (dossier dans son enfant)
      if (draggedItem.type === 'folder') {
        const isDescendant = checkIsDescendant(tree, draggedItem.id, targetFolderId);
        if (isDescendant) {
          toast.error('Impossible de déplacer un dossier dans un de ses sous-dossiers');
          return;
        }
      }

      // Vérifier que la destination est différente
      if (draggedItem.parentId === targetFolderId) {
        return;
      }

      try {
        if (draggedItem.type === 'folder') {
          await moveFolder(draggedItem.id, targetFolderId);
          toast.success(`Dossier "${draggedItem.name}" déplacé`);
        } else {
          await moveNote(draggedItem.id, targetFolderId);
          toast.success(`Note "${draggedItem.name}" déplacée`);
        }
        // Rafraîchir les dossiers concernés
        if (draggedItem.parentId) {
          await refreshFolder(draggedItem.parentId);
        }
        await refreshFolder(targetFolderId);
      } catch {
        toast.error('Erreur lors du déplacement');
      }
    },
    [tree, moveFolder, moveNote, refreshFolder]
  );

  // Vérifier si targetId est un descendant de folderId
  const checkIsDescendant = (
    nodes: SidebarFolderNode[],
    folderId: string,
    targetId: string
  ): boolean => {
    const findFolder = (
      nodes: SidebarFolderNode[],
      id: string
    ): SidebarFolderNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findFolder(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const folder = findFolder(nodes, folderId);
    if (!folder?.children) return false;

    const checkChildren = (children: SidebarFolderNode[]): boolean => {
      for (const child of children) {
        if (child.id === targetId) return true;
        if (child.children && checkChildren(child.children)) return true;
      }
      return false;
    };

    return checkChildren(folder.children);
  };

  // ===========================================
  // Overlay pendant le drag
  // ===========================================

  const renderDragOverlay = () => {
    if (!activeItem) return null;

    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-card border rounded-md shadow-lg">
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={
              activeItem.type === 'folder'
                ? 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
                : 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
            }
          />
        </svg>
        <span className="text-sm font-medium">{activeItem.name}</span>
      </div>
    );
  };

  // ===========================================
  // Rendu principal
  // ===========================================

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div>
        {/* Header cliquable */}
        <button
          onClick={() => setIsFoldersExpanded(!isFoldersExpanded)}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded-md transition-colors bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
        >
          <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="flex-1 text-left">Dossiers</span>
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isFoldersExpanded ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
          </svg>
        </button>

        {/* Contenu collapsable */}
        {isFoldersExpanded && (
          <div className="mt-1 ml-2 space-y-0.5">
            {/* Boutons de création */}
            <div className="flex gap-1 px-1 py-1">
              <Button variant="ghost" size="sm" className="h-6 flex-1 text-xs gap-1" onClick={() => { setParentFolderForNew(null); setIsCreatingFolder(true); }} title="Nouveau dossier">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
              </Button>
              <Button variant="ghost" size="sm" className="h-6 flex-1 text-xs gap-1" onClick={() => setIsCreatingRootNote(true)} title="Nouvelle note">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </Button>
            </div>

            {/* Formulaire création dossier */}
            {isCreatingFolder && (
              <div className="px-1 py-1">
                <InlineCreateForm onSubmit={handleCreateFolder} onCancel={handleCancelCreateFolder} placeholder="Nom du dossier" compact />
              </div>
            )}

            {/* Formulaire création note */}
            {isCreatingRootNote && (
              <div className="px-1 py-1">
                <InlineCreateForm onSubmit={handleCreateRootNote} onCancel={() => setIsCreatingRootNote(false)} placeholder="Titre de la note" compact />
              </div>
            )}

            {/* Folder Tree */}
            <FolderTree onCreateNote={handleCreateNote} onCreateFolder={handleCreateFolderInFolder} />
          </div>
        )}

        {/* Section Notes Personnelles */}
        <PersonalSidebarSection />
      </div>

      {/* Drag Overlay */}
      <DragOverlay>{renderDragOverlay()}</DragOverlay>
    </DndContext>
  );
}
