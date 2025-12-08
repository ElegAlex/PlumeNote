// ===========================================
// Page Note - Éditeur Markdown style Obsidian
// ===========================================

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotesStore } from '../stores/notes';
import { useFoldersStore } from '../stores/folders';
import { useRightPanelStore } from '../stores/rightPanelStore';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { toast } from '../components/ui/Toaster';
import { formatRelativeTime, debounce } from '../lib/utils';
import { MarkdownEditor } from '../components/editor/MarkdownEditor';
import { PinButton } from '../components/editor/PinButton';
import { VersionHistoryPanel } from '../components/editor/VersionHistoryPanel';
import { TableOfContentsPanel } from '../components/editor/TableOfContentsPanel';
import { LinksPanel } from '../components/editor/LinksPanel';
import { PropertiesPanel } from '../components/editor/metadata/PropertiesPanel';
import { TagsPanel } from '../components/editor/metadata/TagsPanel';
import { NoteActionMenu, MoveToFolderDialog } from '../components/common';
import type { FolderTreeNode } from '../components/common';
import { useNoteView } from '../hooks';
import { useNoteEvents } from '../hooks/useNoteEvents';
import { EventBadge } from '../components/calendar/EventBadge';
import { ExportDialog } from '../components/export';

export function NotePage() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const {
    currentNote,
    isLoading,
    isSaving,
    error,
    lastSaved,
    fetchNote,
    updateNote,
    deleteNote,
  } = useNotesStore();

  const { tree: folders } = useFoldersStore();
  const [title, setTitle] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  const { isOpen: isRightPanelOpen, togglePanel, closePanel } = useRightPanelStore();

  // P1: Enregistrer la vue de la note
  useNoteView(currentNote?.id);

  // Récupérer les événements liés à cette note
  const { events: linkedEvents } = useNoteEvents(currentNote?.id);

  useEffect(() => {
    if (noteId) {
      fetchNote(noteId).catch(() => {
        navigate('/');
      });
    }
  }, [noteId, fetchNote, navigate]);

  useEffect(() => {
    if (currentNote) {
      setTitle(currentNote.title);
    }
  }, [currentNote]);

  // Debounced title save
  const debouncedSaveTitle = useCallback(
    debounce((newTitle: string) => {
      if (noteId && newTitle !== currentNote?.title) {
        updateNote(noteId, { title: newTitle });
      }
    }, 500),
    [noteId, currentNote?.title, updateNote]
  );

  // Debounced content save
  const debouncedSaveContent = useCallback(
    debounce((content: string) => {
      if (noteId) {
        updateNote(noteId, { content });
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

    if (window.confirm('Voulez-vous vraiment supprimer cette note ?')) {
      try {
        await deleteNote(noteId);
        toast.success('Note supprimée');
        navigate('/');
      } catch {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const handleMove = async (folderId: string | null) => {
    if (!noteId) return;
    try {
      await updateNote(noteId, { folderId: folderId ?? undefined });
      toast.success('Note déplacée');
      setShowMoveDialog(false);
    } catch {
      toast.error('Erreur lors du déplacement');
    }
  };

  // Convertir les dossiers pour le dialog
  const convertFoldersForDialog = (folderList: typeof folders): FolderTreeNode[] => {
    return (folderList ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      children: [],
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
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <svg
          className="h-16 w-16 mb-4 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-lg">Note non trouvée</p>
        <Button variant="link" onClick={() => navigate('/')}>
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="text-xl font-semibold bg-transparent border-none outline-none flex-1 min-w-0"
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

          {/* P1: Pin Button */}
          {currentNote && <PinButton noteId={currentNote.id} />}

          {/* Save Status */}
          <span className="text-sm text-muted-foreground">
            {isSaving ? (
              <span className="flex items-center gap-1">
                <Spinner size="sm" />
                Enregistrement...
              </span>
            ) : lastSaved ? (
              `Sauvegardé ${formatRelativeTime(lastSaved)}`
            ) : null}
          </span>

          {/* Menu */}
          <NoteActionMenu
            noteId={noteId!}
            isPersonal={false}
            onShowToc={() => togglePanel('toc')}
            onShowLinks={() => togglePanel('links')}
            onShowHistory={() => setShowVersionHistory(true)}
            onExport={() => setShowExportDialog(true)}
            onMoveClick={() => setShowMoveDialog(true)}
            onSplitView={() => navigate(`/split/${noteId}`)}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Properties Panel */}
      {showPropertiesPanel && currentNote && (
        <PropertiesPanel
          noteId={currentNote.id}
          className="bg-muted/30"
        />
      )}

      {/* Tags Panel */}
      {showPropertiesPanel && currentNote && (
        <TagsPanel
          noteId={currentNote.id}
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
          }}
          autoFocus
          onWikilinkClick={async (target, section) => {
            try {
              // Chercher la note par titre
              const response = await fetch(
                `/api/v1/notes/search?q=${encodeURIComponent(target)}&limit=1`,
                { credentials: 'include' }
              );

              if (response.ok) {
                const data = await response.json();
                const matchingNote = data.notes?.find(
                  (n: { title: string; slug: string }) =>
                    n.title.toLowerCase() === target.toLowerCase()
                );

                if (matchingNote) {
                  const url = section
                    ? `/notes/${matchingNote.id}#${section}`
                    : `/notes/${matchingNote.id}`;
                  navigate(url);
                  return;
                }
              }

              // Note non trouvée, proposer de la créer
              if (window.confirm(`La note "${target}" n'existe pas. Voulez-vous la créer ?`)) {
                const createResponse = await fetch('/api/v1/notes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ title: target, content: '' }),
                });

                if (createResponse.ok) {
                  const newNote = await createResponse.json();
                  navigate(`/notes/${newNote.id}`);
                }
              }
            } catch (error) {
              console.error('Failed to handle wikilink click:', error);
            }
          }}
        />
      </div>

        {/* Version History Panel */}
        <VersionHistoryPanel
          noteId={noteId!}
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          onRestore={() => {
            // Recharger la note après restauration
            if (noteId) {
              fetchNote(noteId);
            }
          }}
        />
      </div>

      {/* Right Panels */}
      <TableOfContentsPanel
        content={currentNote.content || ''}
        onHeadingClick={(line) => {
          // Scroll vers la ligne dans l'éditeur si possible
          console.log('Navigate to line:', line);
        }}
      />
      <LinksPanel noteId={noteId!} />

      {/* Move Dialog */}
      {showMoveDialog && (
        <MoveToFolderDialog
          folders={convertFoldersForDialog(folders)}
          currentFolderId={currentNote.folderId}
          onMove={handleMove}
          onClose={() => setShowMoveDialog(false)}
        />
      )}

      {/* Export Dialog */}
      {currentNote && (
        <ExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          note={{
            id: currentNote.id,
            title: currentNote.title,
            slug: currentNote.slug,
            content: currentNote.content || '',
            author: currentNote.author,
            createdAt: currentNote.createdAt,
            updatedAt: currentNote.updatedAt,
            tags: currentNote.tags?.map((t) => ({ tag: { name: t.name } })),
          }}
        />
      )}
    </div>
  );
}
