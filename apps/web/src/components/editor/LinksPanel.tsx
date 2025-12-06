// ===========================================
// Panneau Liens de la note (Wikilinks/Backlinks)
// Affiche les liens sortants et entrants
// ===========================================

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRightPanelStore } from '../../stores/rightPanelStore';
import { api } from '../../lib/api';
import { Spinner } from '../ui/Spinner';
import { cn } from '../../lib/utils';

interface NoteLink {
  noteId: string;
  title: string;
  slug: string;
  folderPath: string;
  context?: string | null;
  exists: boolean;
}

interface NoteLinks {
  outgoing: NoteLink[];
  incoming: NoteLink[];
}

interface LinksPanelProps {
  noteId: string;
}

export function LinksPanel({ noteId }: LinksPanelProps) {
  const navigate = useNavigate();
  const { isOpen, view, closePanel } = useRightPanelStore();
  const [links, setLinks] = useState<NoteLinks>({ outgoing: [], incoming: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    if (!noteId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Récupérer les backlinks via l'API graph existante
      const [backlinkRes, noteRes] = await Promise.all([
        api.get<{ backlinks: Array<{
          noteId: string;
          noteTitle: string;
          folderPath: string;
          context: string | null;
        }> }>(`/graph/backlinks/${noteId}`),
        api.get<{ linksFrom?: Array<{
          targetNoteId: string | null;
          targetSlug: string;
          isBroken: boolean;
          targetNote?: { id: string; title: string; slug: string; folder: { path: string } } | null;
        }> }>(`/notes/${noteId}`),
      ]);

      // Transformer les backlinks (liens entrants)
      const incoming: NoteLink[] = backlinkRes.data.backlinks?.map((bl) => ({
        noteId: bl.noteId,
        title: bl.noteTitle,
        slug: '',
        folderPath: bl.folderPath,
        context: bl.context,
        exists: true,
      })) || [];

      // Transformer les liens sortants (wikilinks dans la note)
      const outgoing: NoteLink[] = noteRes.data.linksFrom?.map((link) => ({
        noteId: link.targetNoteId || '',
        title: link.targetNote?.title || link.targetSlug,
        slug: link.targetNote?.slug || link.targetSlug,
        folderPath: link.targetNote?.folder?.path || '',
        exists: !link.isBroken && !!link.targetNote,
      })) || [];

      setLinks({ outgoing, incoming });
    } catch (err) {
      console.error('Error fetching links:', err);
      setError('Erreur lors du chargement des liens');
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    if (isOpen && view === 'links') {
      fetchLinks();
    }
  }, [isOpen, view, fetchLinks]);

  const handleNavigate = (link: NoteLink) => {
    if (link.exists && link.noteId) {
      navigate(`/notes/${link.noteId}`);
    }
  };

  if (!isOpen || view !== 'links') return null;

  return (
    <aside className="w-72 border-l bg-background flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <h3 className="font-medium text-sm">Liens</h3>
        </div>
        <button
          onClick={closePanel}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-destructive">{error}</div>
        ) : (
          <>
            {/* Liens sortants */}
            <section className="p-3 border-b">
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-1">
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
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
                Liens sortants ({links.outgoing.length})
              </h4>
              {links.outgoing.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun lien</p>
              ) : (
                <ul className="space-y-1">
                  {links.outgoing.map((link, index) => (
                    <li key={`out-${index}`}>
                      <button
                        onClick={() => handleNavigate(link)}
                        disabled={!link.exists}
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded text-sm',
                          'hover:bg-muted truncate flex items-center gap-2',
                          'transition-colors',
                          !link.exists && 'text-muted-foreground italic cursor-not-allowed'
                        )}
                      >
                        {!link.exists && (
                          <svg
                            className="h-3 w-3 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                        <span className="truncate">{link.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Liens entrants (Backlinks) */}
            <section className="p-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-1">
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
                    d="M7 16l-4-4m0 0l4-4m-4 4h18"
                  />
                </svg>
                Liens entrants ({links.incoming.length})
              </h4>
              {links.incoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun backlink</p>
              ) : (
                <ul className="space-y-1">
                  {links.incoming.map((link, index) => (
                    <li key={`in-${index}`}>
                      <button
                        onClick={() => handleNavigate(link)}
                        className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors"
                      >
                        <span className="block truncate font-medium">{link.title}</span>
                        {link.context && (
                          <span className="block text-xs text-muted-foreground truncate mt-0.5">
                            {link.context}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
