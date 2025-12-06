// ===========================================
// Editor Pane pour Split View
// Affiche un éditeur de note dans un panneau
// ===========================================

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PaneLeaf } from '../../stores/panesStore';
import { usePanesStore } from '../../stores/panesStore';
import { useNotesStore } from '../../stores/notes';
import { MarkdownEditor } from '../editor/MarkdownEditor';
import { Spinner } from '../ui/Spinner';
import { cn, debounce } from '../../lib/utils';
import { api } from '../../lib/api';
import type { Note, NoteSummary } from '@collabnotes/types';

interface EditorPaneProps {
  pane: PaneLeaf;
}

export function EditorPane({ pane }: EditorPaneProps) {
  const navigate = useNavigate();
  const { activePaneId, setActivePane, closePane, canClosePane, splitPane } =
    usePanesStore();
  const isActive = activePaneId === pane.id;
  const canClose = canClosePane();

  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch note when pane.noteId changes
  useEffect(() => {
    if (!pane.noteId) {
      setNote(null);
      return;
    }

    const fetchNote = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<Note>(`/notes/${pane.noteId}`);
        setNote(response.data);
      } catch (err) {
        console.error('Error fetching note:', err);
        setError('Erreur lors du chargement');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNote();
  }, [pane.noteId]);

  // Save note content
  const handleSave = useCallback(
    async (content: string) => {
      if (!pane.noteId || !note) return;
      try {
        await api.patch(`/notes/${pane.noteId}`, { content });
      } catch (err) {
        console.error('Error saving note:', err);
      }
    },
    [pane.noteId, note]
  );

  const debouncedSave = useCallback(debounce(handleSave, 500), [handleSave]);

  // Handle wikilink click
  const handleWikilinkClick = useCallback(
    async (target: string, section?: string) => {
      try {
        const response = await fetch(
          `/api/v1/notes/search?q=${encodeURIComponent(target)}&limit=1`,
          { credentials: 'include' }
        );

        if (response.ok) {
          const data = await response.json();
          const matchingNote = data.notes?.find(
            (n: { title: string }) =>
              n.title.toLowerCase() === target.toLowerCase()
          );

          if (matchingNote) {
            // Open in this pane
            usePanesStore.getState().openNoteInPane(pane.id, matchingNote.id);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to handle wikilink click:', error);
      }
    },
    [pane.id]
  );

  return (
    <div
      onClick={() => setActivePane(pane.id)}
      className={cn(
        'h-full w-full flex flex-col bg-background',
        isActive ? 'ring-2 ring-primary ring-inset' : 'ring-1 ring-border ring-inset'
      )}
    >
      {/* Pane Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30 flex-shrink-0">
        <span className="text-sm font-medium truncate flex-1">
          {note?.title || (pane.noteId ? 'Chargement...' : 'Sélectionner une note')}
        </span>
        <div className="flex items-center gap-1">
          {/* Split buttons */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              splitPane(pane.id, 'horizontal');
            }}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            title="Diviser horizontalement"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              splitPane(pane.id, 'vertical');
            }}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            title="Diviser verticalement"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </button>
          {canClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                closePane(pane.id);
              }}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
              title="Fermer le panneau"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Pane Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-destructive text-sm">
            {error}
          </div>
        ) : note ? (
          <MarkdownEditor
            content={note.content || ''}
            onChange={debouncedSave}
            onWikilinkClick={handleWikilinkClick}
          />
        ) : (
          <EmptyPaneState paneId={pane.id} />
        )}
      </div>
    </div>
  );
}

// Empty state when no note is selected
function EmptyPaneState({ paneId }: { paneId: string }) {
  const [recentNotes, setRecentNotes] = useState<NoteSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { openNoteInPane } = usePanesStore();

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const response = await api.get<{ notes: NoteSummary[] }>('/notes/recent?limit=5');
        setRecentNotes(response.data.notes || []);
      } catch (err) {
        console.error('Error fetching recent notes:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecent();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <svg
        className="h-12 w-12 text-muted-foreground/50 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p className="text-sm text-muted-foreground mb-4">
        Sélectionnez une note pour l'afficher ici
      </p>

      {!isLoading && recentNotes.length > 0 && (
        <div className="w-full max-w-xs">
          <p className="text-xs text-muted-foreground mb-2">Notes récentes</p>
          <div className="space-y-1">
            {recentNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => openNoteInPane(paneId, note.id)}
                className="w-full px-3 py-2 text-left text-sm rounded hover:bg-muted transition-colors truncate"
              >
                {note.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
