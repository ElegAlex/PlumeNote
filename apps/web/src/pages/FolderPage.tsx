// ===========================================
// Page Dossier Général
// Vue du contenu d'un dossier avec breadcrumb
// Utilise les mêmes composants que PersonalFolderPage
// ===========================================

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFoldersStore } from '../stores/folders';
import { useNotesStore } from '../stores/notes';
import { useSidebarStore } from '../stores/sidebarStore';
import { useAuthStore } from '../stores/auth';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Input } from '../components/ui/Input';
import { toast } from '../components/ui/Toaster';
import { api } from '../lib/api';
import {
  FolderCard,
  NoteCard,
  CreateFolderForm,
  EmptyState,
  Breadcrumb,
  ActionMenu,
} from '../components/common';
import { FolderAccessModal } from '../components/folders/FolderAccessModal';
import { FolderExportDialog } from '../components/export';
import type { ActionMenuItem, BreadcrumbItem } from '../components/common';
import type { FolderContent } from '@plumenote/types';

// Icons
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

const HomeIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

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

const ShieldIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

// ===========================================
// Composant Principal
// ===========================================

export function FolderPage() {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const { createFolder, updateFolder, deleteFolder } = useFoldersStore();
  const { createNote } = useNotesStore();
  const { refreshFolder, removeFolderFromTree } = useSidebarStore();
  const { user } = useAuthStore();

  // Vérifier si l'utilisateur est admin
  const isAdmin = user?.role?.name === 'admin';

  // État local
  const [folderContent, setFolderContent] = useState<FolderContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Charger le contenu du dossier
  const fetchContent = useCallback(async () => {
    if (!folderId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<FolderContent>(`/folders/${folderId}/content`);
      setFolderContent(response.data);
      setEditName(response.data.folder?.name ?? '');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Créer un sous-dossier
  const handleCreateFolder = async (name: string) => {
    if (!folderId) return;
    setIsSaving(true);
    try {
      await createFolder(name, folderId);
      toast.success('Sous-dossier créé');
      setIsCreatingFolder(false);
      await fetchContent();
      await refreshFolder(folderId);
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setIsSaving(false);
    }
  };

  // Créer une note
  const handleCreateNote = async () => {
    if (!folderId) return;
    setIsSaving(true);
    try {
      const note = await createNote({ title: 'Sans titre', folderId });
      navigate(`/notes/${note.id}`);
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setIsSaving(false);
    }
  };

  // Renommer le dossier
  const handleRename = async () => {
    if (!folderId || !editName.trim()) return;
    setIsSaving(true);
    try {
      await updateFolder(folderId, { name: editName.trim() });
      toast.success('Dossier renommé');
      setIsEditing(false);
      await fetchContent();
    } catch {
      toast.error('Erreur lors du renommage');
    } finally {
      setIsSaving(false);
    }
  };

  // Supprimer le dossier
  const handleDelete = async () => {
    if (!folderId) return;
    if (window.confirm('Voulez-vous vraiment supprimer ce dossier et tout son contenu ?')) {
      setIsSaving(true);
      try {
        await deleteFolder(folderId);
        // Mise à jour optimiste immédiate de l'UI
        removeFolderFromTree(folderId);
        toast.success('Dossier supprimé');
        navigate('/');
      } catch {
        toast.error('Erreur lors de la suppression');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Navigation
  const handleFolderClick = (id: string) => {
    navigate(`/folders/${id}`);
  };

  const handleNoteClick = (id: string) => {
    navigate(`/notes/${id}`);
  };

  // Convertir le breadcrumb API vers le format du composant
  const breadcrumbItems: BreadcrumbItem[] = (folderContent?.breadcrumb ?? []).slice(0, -1).map((item) => ({
    id: item.id,
    name: item.name,
  }));

  // Menu actions (composant générique)
  const menuItems: ActionMenuItem[] = [
    {
      label: 'Renommer',
      icon: <PencilIcon />,
      onClick: () => setIsEditing(true),
    },
    {
      label: 'Exporter...',
      icon: <DownloadIcon />,
      onClick: () => setIsExportDialogOpen(true),
    },
    // "Gérer les accès" uniquement pour les admins
    ...(isAdmin ? [{
      label: 'Gérer les accès',
      icon: <ShieldIcon />,
      onClick: () => setIsAccessModalOpen(true),
      dividerBefore: true,
    }] : []),
    {
      label: 'Supprimer',
      icon: <TrashIcon />,
      onClick: handleDelete,
      variant: 'destructive' as const,
      dividerBefore: !isAdmin,
    },
  ];

  // Loading
  if (isLoading && !folderContent) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  // Erreur ou dossier non trouvé
  if (error || !folderContent || !folderContent.folder) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          icon={<FolderIcon />}
          title="Dossier non trouvé"
          description={error || undefined}
          action={{
            label: "Retour à l'accueil",
            onClick: () => navigate('/'),
          }}
        />
      </div>
    );
  }

  // À ce stade, folder est garanti d'exister
  const { folder } = folderContent;

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Breadcrumb (composant générique) */}
        <Breadcrumb
          root={{
            label: 'Dossiers',
            icon: <HomeIcon />,
            onClick: () => navigate('/'),
          }}
          items={breadcrumbItems}
          onItemClick={handleFolderClick}
          className="mb-4"
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span style={{ color: folder.color ?? 'inherit' }}>
              <FolderIcon color={folder.color ?? undefined} />
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
                      setEditName(folder.name);
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
                    setEditName(folder.name);
                  }}
                >
                  Annuler
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{folder.name}</h1>
                {/* Indicateur d'accès restreint */}
                {(folderContent.folder as any)?.accessType === 'RESTRICTED' && (
                  <span
                    className="text-amber-600"
                    title="Accès restreint"
                  >
                    <LockIcon />
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Menu (composant générique) */}
          {!isEditing && <ActionMenu items={menuItems} />}
        </div>

        {/* Actions de création */}
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

        {/* Sous-dossiers (composant générique) */}
        {folderContent.children.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Sous-dossiers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {folderContent.children.map((childFolder) => (
                <FolderCard
                  key={childFolder.id}
                  id={childFolder.id}
                  name={childFolder.name}
                  color={childFolder.color}
                  notesCount={childFolder.notesCount}
                  accessType={(childFolder as any).accessType}
                  onClick={handleFolderClick}
                />
              ))}
            </div>
          </section>
        )}

        {/* Notes (composant générique) */}
        {folderContent.notes.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Notes</h2>
            <div className="space-y-2">
              {folderContent.notes.map((note) => (
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
        {folderContent.children.length === 0 && folderContent.notes.length === 0 && !isLoading && (
          <EmptyState
            icon={<FolderIcon />}
            title="Ce dossier est vide"
            description="Créez un sous-dossier ou une note pour commencer."
            action={{
              label: 'Créer une note',
              onClick: handleCreateNote,
            }}
          />
        )}
      </div>

      {/* Modal de gestion des accès - uniquement montée pour les admins quand ouverte */}
      {folderId && isAdmin && isAccessModalOpen && (
        <FolderAccessModal
          isOpen={isAccessModalOpen}
          onClose={() => {
            setIsAccessModalOpen(false);
            // Rafraîchir le contenu pour mettre à jour l'icône cadenas
            fetchContent();
          }}
          folderId={folderId}
          folderName={folder.name}
        />
      )}

      {/* Dialog d'export du dossier */}
      {folder && (
        <FolderExportDialog
          open={isExportDialogOpen}
          onOpenChange={setIsExportDialogOpen}
          folder={{
            id: folder.id,
            name: folder.name,
            slug: folder.slug,
          }}
        />
      )}
    </div>
  );
}
