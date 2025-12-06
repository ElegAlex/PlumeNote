// ===========================================
// Section Notes Personnelles dans la Sidebar
// Espace privé isolé pour chaque utilisateur
// ===========================================

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePersonalStore } from '../../stores/personalStore';
import { useAuthStore } from '../../stores/auth';
import { Button } from '../ui/Button';
import { InlineCreateForm } from '../common';
import { toast } from '../ui/Toaster';
import { cn } from '../../lib/utils';
import type { PersonalTreeNode, PersonalNotePreview } from '@collabnotes/types';

// Icons
const LockIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const FolderIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    />
  </svg>
);

const FileTextIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

// ===========================================
// Composant Principal
// ===========================================

export function PersonalSidebarSection() {
  const { user } = useAuthStore();
  const {
    tree,
    rootNotes,
    expandedFolderIds,
    fetchTree,
    toggleFolderExpanded,
    createFolder,
    createNote,
  } = usePersonalStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  // Ne pas afficher pour les utilisateurs "reader"
  if (user?.role?.name === 'reader') {
    return null;
  }

  // Charger l'arborescence quand on expand la section
  useEffect(() => {
    if (isExpanded && tree.length === 0 && rootNotes.length === 0) {
      setIsLoading(true);
      fetchTree().finally(() => setIsLoading(false));
    }
  }, [isExpanded, tree.length, rootNotes.length, fetchTree]);

  // Détecter si on est dans l'espace personnel
  const isInPersonalSpace = location.pathname.startsWith('/personal');

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleCreateNote = async (title: string) => {
    try {
      const note = await createNote({ title });
      setIsCreatingNote(false);
      navigate(`/personal/note/${note.id}`);
    } catch {
      toast.error('Erreur lors de la création');
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      await createFolder({ name });
      setIsCreatingFolder(false);
      toast.success('Dossier créé');
      await fetchTree();
    } catch {
      toast.error('Erreur lors de la création');
    }
  };

  return (
    <div className="border-t border-border pt-3 mt-3">
      {/* Header de la section */}
      <button
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded-md transition-colors',
          isInPersonalSpace
            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
            : 'text-foreground hover:bg-muted'
        )}
      >
        <span className="text-purple-600 dark:text-purple-400">
          <LockIcon />
        </span>
        <span className="flex-1 text-left">Notes personnelles</span>
        {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
      </button>

      {/* Contenu expandable */}
      {isExpanded && (
        <div className="mt-1 ml-2 space-y-0.5">
          {/* Actions rapides */}
          <div className="flex gap-1 px-1 py-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 flex-1 text-xs gap-1"
              onClick={() => setIsCreatingFolder(true)}
              title="Nouveau dossier"
            >
              <PlusIcon />
              <FolderIcon />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 flex-1 text-xs gap-1"
              onClick={() => setIsCreatingNote(true)}
              title="Nouvelle note"
            >
              <PlusIcon />
              <FileTextIcon />
            </Button>
          </div>

          {/* Formulaire création dossier */}
          {isCreatingFolder && (
            <div className="px-1 py-1">
              <InlineCreateForm
                onSubmit={handleCreateFolder}
                onCancel={() => setIsCreatingFolder(false)}
                placeholder="Nom du dossier"
                compact
              />
            </div>
          )}

          {/* Formulaire création note */}
          {isCreatingNote && (
            <div className="px-1 py-1">
              <InlineCreateForm
                onSubmit={handleCreateNote}
                onCancel={() => setIsCreatingNote(false)}
                placeholder="Titre de la note"
                compact
              />
            </div>
          )}

          {/* Chargement */}
          {isLoading && (
            <div className="px-2 py-2 text-xs text-muted-foreground">
              Chargement...
            </div>
          )}

          {/* Arborescence */}
          {!isLoading && (
            <div className="space-y-0.5">
              {/* Dossiers */}
              {tree.map((folder) => (
                <PersonalFolderItem
                  key={folder.id}
                  folder={folder}
                  level={0}
                  expandedIds={expandedFolderIds}
                  onToggle={toggleFolderExpanded}
                />
              ))}

              {/* Notes à la racine */}
              {rootNotes.map((note) => (
                <PersonalNoteItem key={note.id} note={note} level={0} />
              ))}

              {/* État vide */}
              {tree.length === 0 && rootNotes.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  Aucune note personnelle
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===========================================
// Composant Dossier
// ===========================================

interface PersonalFolderItemProps {
  folder: PersonalTreeNode;
  level: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}

function PersonalFolderItem({
  folder,
  level,
  expandedIds,
  onToggle,
}: PersonalFolderItemProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isExpanded = expandedIds.has(folder.id);
  const isActive = location.pathname === `/personal/folder/${folder.id}`;
  const hasContent = folder.hasChildren || folder.notes.length > 0;

  const handleClick = () => {
    navigate(`/personal/folder/${folder.id}`);
    if (hasContent) {
      onToggle(folder.id);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          'w-full flex items-center gap-1.5 px-2 py-1 text-sm rounded transition-colors',
          isActive
            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
            : 'text-foreground hover:bg-muted'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {/* Chevron */}
        <span className="w-3 h-3 flex items-center justify-center">
          {hasContent && (isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />)}
        </span>

        {/* Icon dossier */}
        <span
          className="flex-shrink-0"
          style={{ color: folder.color ?? 'currentColor' }}
        >
          <FolderIcon />
        </span>

        {/* Nom */}
        <span className="truncate flex-1 text-left">{folder.name}</span>

        {/* Compteur */}
        {folder.notes.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {folder.notes.length}
          </span>
        )}
      </button>

      {/* Enfants */}
      {isExpanded && (
        <>
          {folder.children.map((child) => (
            <PersonalFolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
          {folder.notes.map((note) => (
            <PersonalNoteItem key={note.id} note={note} level={level + 1} />
          ))}
        </>
      )}
    </>
  );
}

// ===========================================
// Composant Note
// ===========================================

interface PersonalNoteItemProps {
  note: PersonalNotePreview;
  level: number;
}

function PersonalNoteItem({ note, level }: PersonalNoteItemProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = location.pathname === `/personal/note/${note.id}`;

  return (
    <button
      onClick={() => navigate(`/personal/note/${note.id}`)}
      className={cn(
        'w-full flex items-center gap-1.5 px-2 py-1 text-sm rounded transition-colors',
        isActive
          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
          : 'text-foreground hover:bg-muted'
      )}
      style={{ paddingLeft: `${level * 12 + 8 + 12}px` }}
    >
      <span className="text-muted-foreground flex-shrink-0">
        <FileTextIcon />
      </span>
      <span className="truncate flex-1 text-left">{note.title}</span>
    </button>
  );
}
