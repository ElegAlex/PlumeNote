// ===========================================
// Section Notes Personnelles dans la Sidebar
// Espace privé isolé pour chaque utilisateur
// Réutilise FolderItem/NoteItem avec isPersonal=true
// ===========================================

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePersonalStore } from '../../stores/personalStore';
import { useAuthStore } from '../../stores/auth';
import { Button } from '../ui/Button';
import { InlineCreateForm } from '../common';
import { TemplatePickerDialog } from '../templates';
import { FolderItem } from './FolderItem';
import { NoteItem } from './NoteItem';
import { toast } from '../ui/Toaster';
import { cn } from '../../lib/utils';
import type { PersonalTreeNode, PersonalNotePreview, SidebarFolderNode, NotePreview } from '@plumenote/types';
import type { NoteTemplate } from '../../services/templatesApi';

// Icons (seuls ceux utilisés dans ce composant)
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
// Fonctions de conversion de types
// ===========================================

/**
 * Convertit PersonalNotePreview en NotePreview (format attendu par NoteItem)
 */
function convertToNotePreview(note: PersonalNotePreview): NotePreview {
  return {
    id: note.id,
    title: note.title,
    slug: note.slug,
    position: 0,
    updatedAt: note.updatedAt,
    createdAt: note.createdAt,
  };
}

/**
 * Convertit PersonalTreeNode en SidebarFolderNode (format attendu par FolderItem)
 */
function convertToSidebarFolderNode(node: PersonalTreeNode): SidebarFolderNode {
  return {
    id: node.id,
    name: node.name,
    slug: node.slug,
    parentId: null,
    color: node.color,
    icon: node.icon,
    position: 0,
    hasChildren: node.hasChildren || node.children.length > 0,
    notesCount: node.notes.length,
    children: node.children.map(convertToSidebarFolderNode),
    notes: node.notes.map(convertToNotePreview),
    isLoaded: true,
  };
}

// ===========================================
// Composant Principal
// ===========================================

export function PersonalSidebarSection() {
  const { user } = useAuthStore();
  const {
    tree,
    rootNotes,
    fetchTree,
    createFolder,
    createNote,
    addFolderToTree,
  } = usePersonalStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // État Template Picker (cohérence avec espace général)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templateTargetFolderId, setTemplateTargetFolderId] = useState<string | null>(null);

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

  // Handler sélection template (cohérence avec espace général)
  const handleTemplateSelect = useCallback(async (template: NoteTemplate | null) => {
    try {
      // Préparer le contenu avec substitution de date
      let content = template?.content || '';
      if (content) {
        const today = new Date().toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        content = content.replace(/\{\{date\}\}/g, today);
      }

      const note = await createNote({
        title: template?.name || 'Sans titre',
        content,
        folderId: templateTargetFolderId || undefined,
      });

      navigate(`/personal/note/${note.id}`);
      toast.success('Note créée');
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setShowTemplatePicker(false);
      setTemplateTargetFolderId(null);
    }
  }, [createNote, navigate, templateTargetFolderId]);

  // Ouvrir le picker de template
  const handleOpenTemplatePicker = useCallback((folderId?: string) => {
    setTemplateTargetFolderId(folderId || null);
    setShowTemplatePicker(true);
  }, []);

  const handleCreateFolder = async (name: string) => {
    try {
      const newFolder = await createFolder({ name });
      setIsCreatingFolder(false);

      // Mise à jour optimiste immédiate de l'UI
      addFolderToTree({
        id: newFolder.id,
        name: newFolder.name,
        slug: newFolder.slug,
        color: newFolder.color,
        icon: newFolder.icon,
        hasChildren: false,
        children: [],
        notes: [],
      }, null);

      toast.success('Dossier créé');
    } catch {
      toast.error('Erreur lors de la création');
    }
  };

  const handleCreateSubfolder = useCallback(async (name: string, parentId: string) => {
    try {
      const newFolder = await createFolder({ name, parentId });
      addFolderToTree({
        id: newFolder.id,
        name: newFolder.name,
        slug: newFolder.slug,
        color: newFolder.color,
        icon: newFolder.icon,
        hasChildren: false,
        children: [],
        notes: [],
      }, parentId);
      toast.success('Sous-dossier créé');
    } catch {
      toast.error('Erreur lors de la création');
    }
  }, [createFolder, addFolderToTree]);

  // Conversion des données pour les composants FolderItem/NoteItem
  const convertedTree = useMemo(
    () => tree.map(convertToSidebarFolderNode),
    [tree]
  );

  const convertedRootNotes = useMemo(
    () => rootNotes.map(convertToNotePreview),
    [rootNotes]
  );

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
              onClick={() => handleOpenTemplatePicker()}
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

          {/* Chargement */}
          {isLoading && (
            <div className="px-2 py-2 text-xs text-muted-foreground">
              Chargement...
            </div>
          )}

          {/* Arborescence - utilise FolderItem/NoteItem avec isPersonal=true */}
          {!isLoading && (
            <ul role="tree" className="space-y-0.5">
              {/* Dossiers */}
              {convertedTree.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  level={0}
                  onCreateNote={handleOpenTemplatePicker}
                  onCreateFolder={handleCreateSubfolder}
                  isPersonal
                />
              ))}

              {/* Notes à la racine */}
              {convertedRootNotes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  level={0}
                  folderId={null}
                  isPersonal
                />
              ))}

              {/* État vide */}
              {tree.length === 0 && rootNotes.length === 0 && (
                <li className="px-2 py-3 text-xs text-muted-foreground text-center">
                  Aucune note personnelle
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Template Picker Dialog (cohérence avec espace général) */}
      <TemplatePickerDialog
        open={showTemplatePicker}
        onOpenChange={setShowTemplatePicker}
        onSelect={handleTemplateSelect}
      />
    </div>
  );
}
