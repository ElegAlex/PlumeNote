// ===========================================
// Page Dossier Personnel
// Vue du contenu d'un dossier avec breadcrumb
// ===========================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePersonalStore } from '../stores/personalStore';
import { useAuthStore } from '../stores/auth';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Input } from '../components/ui/Input';
import { toast } from '../components/ui/Toaster';
import {
  FolderCard,
  NoteCard,
  CreateFolderForm,
  EmptyState,
  Breadcrumb,
  ActionMenu,
} from '../components/common';
import type { ActionMenuItem } from '../components/common';

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

const FolderIcon = ({ color }: { color?: string }) => (
  <svg className="h-5 w-5" fill="none" stroke={color || 'currentColor'} viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const PencilIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
    />
  </svg>
);

// ===========================================
// Composant Principal
// ===========================================

export function PersonalFolderPage() {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentFolder,
    folders,
    notes,
    breadcrumb,
    isLoading,
    isSaving,
    error,
    fetchFolder,
    createFolder,
    createNote,
    updateFolder,
    deleteFolder,
    addFolderToTree,
    removeFolderFromTree,
  } = usePersonalStore();

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  // Rediriger les readers
  useEffect(() => {
    if (user?.role?.name === 'reader') {
      navigate('/');
    }
  }, [user, navigate]);

  // Charger le dossier
  useEffect(() => {
    if (folderId) {
      fetchFolder(folderId).catch(() => {
        navigate('/personal');
      });
    }
  }, [folderId, fetchFolder, navigate]);

  // Initialiser le nom pour édition
  useEffect(() => {
    if (currentFolder) {
      setEditName(currentFolder.folder.name);
    }
  }, [currentFolder]);

  const handleCreateFolder = async (name: string) => {
    if (!folderId) return;
    try {
      const newFolder = await createFolder({ name, parentId: folderId });

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
      }, folderId);

      toast.success('Sous-dossier créé');
      setIsCreatingFolder(false);
    } catch {
      toast.error('Erreur lors de la création');
    }
  };

  const handleCreateNote = async () => {
    if (!folderId) return;
    try {
      const note = await createNote({ title: 'Sans titre', folderId });
      navigate(`/personal/note/${note.id}`);
    } catch {
      toast.error('Erreur lors de la création');
    }
  };

  const handleRename = async () => {
    if (!folderId || !editName.trim()) return;
    try {
      await updateFolder(folderId, { name: editName.trim() });
      toast.success('Dossier renommé');
      setIsEditing(false);
    } catch {
      toast.error('Erreur lors du renommage');
    }
  };

  const handleDelete = async () => {
    if (!folderId) return;
    if (window.confirm('Voulez-vous vraiment supprimer ce dossier et tout son contenu ?')) {
      try {
        await deleteFolder(folderId);
        // Mise à jour optimiste immédiate de l'UI
        removeFolderFromTree(folderId);
        toast.success('Dossier supprimé');
        navigate('/personal');
      } catch {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const handleFolderClick = (id: string) => {
    navigate(`/personal/folder/${id}`);
  };

  const handleNoteClick = (id: string) => {
    navigate(`/personal/note/${id}`);
  };

  // Menu actions
  const menuItems: ActionMenuItem[] = [
    {
      label: 'Renommer',
      icon: <PencilIcon />,
      onClick: () => setIsEditing(true),
    },
    {
      label: 'Supprimer',
      icon: <TrashIcon />,
      onClick: handleDelete,
      variant: 'destructive',
      dividerBefore: true,
    },
  ];

  if (isLoading && !currentFolder) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !currentFolder) {
    return (
      <EmptyState
        icon={<FolderIcon />}
        title="Dossier non trouvé"
        action={{
          label: "Retour à l'espace personnel",
          onClick: () => navigate('/personal'),
        }}
      />
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Breadcrumb (composant générique) */}
        <Breadcrumb
          root={{
            label: 'Personnel',
            icon: <LockIcon />,
            onClick: () => navigate('/personal'),
          }}
          items={breadcrumb}
          onItemClick={handleFolderClick}
          className="mb-4"
          rootClassName="text-purple-600 dark:text-purple-400"
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span style={{ color: currentFolder.folder.color ?? 'inherit' }}>
              <FolderIcon color={currentFolder.folder.color ?? undefined} />
            </span>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') {
                      setIsEditing(false);
                      setEditName(currentFolder.folder.name);
                    }
                  }}
                />
                <Button size="sm" onClick={handleRename} disabled={isSaving}>
                  OK
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(currentFolder.folder.name);
                  }}
                >
                  Annuler
                </Button>
              </div>
            ) : (
              <h1 className="text-2xl font-bold">{currentFolder.folder.name}</h1>
            )}
          </div>

          {/* Menu (composant générique) */}
          {!isEditing && <ActionMenu items={menuItems} />}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-6">
          <Button
            variant="outline"
            onClick={() => setIsCreatingFolder(true)}
            disabled={isSaving}
          >
            <PlusIcon />
            <span className="ml-2">Sous-dossier</span>
          </Button>
          <Button onClick={handleCreateNote} disabled={isSaving}>
            <PlusIcon />
            <span className="ml-2">Nouvelle note</span>
          </Button>
        </div>

        {/* Formulaire création sous-dossier (composant générique) */}
        {isCreatingFolder && (
          <CreateFolderForm
            onSubmit={handleCreateFolder}
            onCancel={() => setIsCreatingFolder(false)}
            isLoading={isSaving}
            title="Nouveau sous-dossier"
            className="mb-6"
          />
        )}

        {/* Erreur */}
        {error && (
          <div className="mb-6 p-4 border border-destructive/50 rounded-lg bg-destructive/10 text-destructive">
            {error}
          </div>
        )}

        {/* Sous-dossiers (composant générique) */}
        {folders.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Sous-dossiers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {folders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  id={folder.id}
                  name={folder.name}
                  color={folder.color}
                  onClick={handleFolderClick}
                />
              ))}
            </div>
          </section>
        )}

        {/* Notes (composant générique) */}
        {notes.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Notes</h2>
            <div className="space-y-2">
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  id={note.id}
                  title={note.title}
                  updatedAt={note.updatedAt}
                  onClick={handleNoteClick}
                />
              ))}
            </div>
          </section>
        )}

        {/* État vide (composant générique) */}
        {folders.length === 0 && notes.length === 0 && !isLoading && (
          <EmptyState
            icon={<FolderIcon />}
            title="Ce dossier est vide."
            action={{
              label: 'Créer une note',
              onClick: handleCreateNote,
            }}
          />
        )}
      </div>
    </div>
  );
}
