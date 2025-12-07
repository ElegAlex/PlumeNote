// ===========================================
// Page Note Personnelle - Éditeur isolé
// Pas de collaboration temps réel
// ===========================================

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePersonalStore } from '../stores/personalStore';
import { useAuthStore } from '../stores/auth';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { toast } from '../components/ui/Toaster';
import { MarkdownEditor } from '../components/editor/MarkdownEditor';
import { PropertiesPanel } from '../components/editor/metadata/PropertiesPanel';
import { TagsPanel } from '../components/editor/metadata/TagsPanel';
import {
  NoteActionMenu,
  MoveToFolderDialog,
  EmptyState,
} from '../components/common';
import type { FolderTreeNode } from '../components/common';
import { debounce } from '../lib/utils';
import { useNoteEvents } from '../hooks/useNoteEvents';
import { EventBadge } from '../components/calendar/EventBadge';

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

const ChevronLeftIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const FileTextIcon = () => (
  <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

// ===========================================
// Composant Principal
// ===========================================

export function PersonalNotePage() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentNote,
    tree,
    isLoading,
    isSaving,
    error,
    fetchNote,
    fetchTree,
    updateNote,
    deleteNote,
    clearCurrentNote,
  } = usePersonalStore();

  const [title, setTitle] = useState('');
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);

  // Récupérer les événements liés à cette note
  const { events: linkedEvents } = useNoteEvents(currentNote?.id);

  // Rediriger les readers
  useEffect(() => {
    if (user?.role?.name === 'reader') {
      navigate('/');
    }
  }, [user, navigate]);

  // Charger la note
  useEffect(() => {
    if (noteId) {
      fetchNote(noteId).catch(() => {
        navigate('/personal');
      });
    }
    return () => clearCurrentNote();
  }, [noteId, fetchNote, navigate, clearCurrentNote]);

  // Charger l'arborescence pour le dialog déplacement
  useEffect(() => {
    if (tree.length === 0) {
      fetchTree();
    }
  }, [tree.length, fetchTree]);

  // Mettre à jour le titre local
  useEffect(() => {
    if (currentNote) {
      setTitle(currentNote.title);
    }
  }, [currentNote]);

  // Sauvegarder le titre avec debounce
  const debouncedSaveTitle = useCallback(
    debounce(async (newTitle: string) => {
      if (noteId && newTitle !== currentNote?.title) {
        await updateNote(noteId, { title: newTitle });
        setLastSaved(new Date());
      }
    }, 500),
    [noteId, currentNote?.title, updateNote]
  );

  // Sauvegarder le contenu avec debounce
  const debouncedSaveContent = useCallback(
    debounce(async (content: string) => {
      if (noteId) {
        await updateNote(noteId, { content });
        setLastSaved(new Date());
      }
    }, 500),
    [noteId, updateNote]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    debouncedSaveTitle(newTitle);
  };

  const handleDelete = async () => {
    if (!noteId) return;
    if (window.confirm('Voulez-vous vraiment supprimer cette note personnelle ?')) {
      try {
        await deleteNote(noteId);
        toast.success('Note supprimée');
        navigate('/personal');
      } catch {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const handleMove = async (folderId: string | null) => {
    if (!noteId) return;
    await updateNote(noteId, { folderId });
    toast.success('Note déplacée');
  };

  const handleBack = () => {
    if (currentNote?.folderId) {
      navigate(`/personal/folder/${currentNote.folderId}`);
    } else {
      navigate('/personal');
    }
  };

  // Convertir l'arborescence pour le dialog
  const convertTreeForDialog = (nodes: typeof tree): FolderTreeNode[] => {
    return nodes.map((node) => ({
      id: node.id,
      name: node.name,
      children: node.children ? convertTreeForDialog(node.children) : [],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !currentNote) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          icon={<FileTextIcon />}
          title="Note non trouvée"
          action={{
            label: "Retour à l'espace personnel",
            onClick: () => navigate('/personal'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Bouton retour */}
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ChevronLeftIcon />
          </Button>

          {/* Badge personnel */}
          <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
            <LockIcon />
            Personnel
          </span>

          {/* Titre éditable */}
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="text-lg font-semibold bg-transparent border-none outline-none flex-1 min-w-0"
            placeholder="Sans titre"
          />

          {/* Badge des événements liés */}
          {linkedEvents.length > 0 && (
            <EventBadge events={linkedEvents} />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Properties Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}
            title={showPropertiesPanel ? 'Masquer les propriétés' : 'Afficher les propriétés'}
            className={showPropertiesPanel ? 'bg-muted' : ''}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </Button>

          {/* Status sauvegarde */}
          <span className="text-sm text-muted-foreground">
            {isSaving ? (
              <span className="flex items-center gap-1">
                <Spinner size="sm" />
                Enregistrement...
              </span>
            ) : lastSaved ? (
              `Sauvegardé à ${lastSaved.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
            ) : null}
          </span>

          {/* Menu */}
          <NoteActionMenu
            noteId={noteId!}
            isPersonal={true}
            onShowToc={() => {}}
            onShowLinks={() => {}}
            onShowHistory={() => {}}
            onMoveClick={() => setShowMoveDialog(true)}
            onSplitView={() => navigate(`/split/${noteId}`)}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Properties Panel */}
      {showPropertiesPanel && noteId && (
        <PropertiesPanel
          noteId={noteId}
          className="bg-muted/30"
        />
      )}

      {/* Tags Panel */}
      {showPropertiesPanel && noteId && (
        <TagsPanel
          noteId={noteId}
          className="bg-muted/30"
        />
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MarkdownEditor
          content={currentNote.content || ''}
          onChange={debouncedSaveContent}
          onSave={async (content) => {
            await updateNote(noteId!, { content });
            setLastSaved(new Date());
          }}
          autoFocus
        />
      </div>

      {/* Dialog déplacement (composant générique) */}
      {showMoveDialog && (
        <MoveToFolderDialog
          folders={convertTreeForDialog(tree)}
          currentFolderId={currentNote.folderId}
          onMove={handleMove}
          onClose={() => setShowMoveDialog(false)}
        />
      )}
    </div>
  );
}
