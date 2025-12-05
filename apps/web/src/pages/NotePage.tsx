// ===========================================
// Page Note - Éditeur Markdown style Obsidian
// ===========================================

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotesStore } from '../stores/notes';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { toast } from '../components/ui/Toaster';
import { formatRelativeTime, debounce } from '../lib/utils';
import { MarkdownEditor } from '../components/editor/MarkdownEditor';

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
    duplicateNote,
  } = useNotesStore();

  const [title, setTitle] = useState('');
  const [showMenu, setShowMenu] = useState(false);

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

  const handleDuplicate = async () => {
    if (!noteId) return;

    try {
      const newNote = await duplicateNote(noteId);
      toast.success('Note dupliquée');
      navigate(`/notes/${newNote.id}`);
    } catch {
      toast.error('Erreur lors de la duplication');
    }
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
    <div className="flex flex-col h-full">
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
        </div>

        <div className="flex items-center gap-2">
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
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMenu(!showMenu)}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </Button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 rounded-md border bg-popover shadow-lg z-20">
                  <div className="py-1">
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        handleDuplicate();
                        setShowMenu(false);
                      }}
                    >
                      Dupliquer
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        // TODO: Implement version history
                        setShowMenu(false);
                      }}
                    >
                      Historique des versions
                    </button>
                    <hr className="my-1" />
                    <button
                      className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-muted"
                      onClick={() => {
                        handleDelete();
                        setShowMenu(false);
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MarkdownEditor
          content={currentNote.content || ''}
          onChange={debouncedSaveContent}
          onSave={async (content) => {
            await updateNote(noteId!, { content });
          }}
          autoFocus
        />
      </div>
    </div>
  );
}
