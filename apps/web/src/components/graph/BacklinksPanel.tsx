// ===========================================
// Panneau des Backlinks (US-031)
// ===========================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Spinner } from '../ui/Spinner';
import { formatRelativeTime } from '../../lib/utils';

interface Backlink {
  noteId: string;
  title: string;
  slug: string;
  folderPath: string;
  context: string | null;
  updatedAt: string;
}

interface BacklinksPanelProps {
  noteId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function BacklinksPanel({ noteId, isOpen, onToggle }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && noteId) {
      loadBacklinks();
    }
  }, [isOpen, noteId]);

  const loadBacklinks = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<{ backlinks: Backlink[] }>(
        `/graph/backlinks/${noteId}`
      );
      setBacklinks(response.data.backlinks);
    } catch {
      setBacklinks([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-t">
      {/* Toggle Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm font-medium">
          Backlinks ({backlinks.length})
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : backlinks.length === 0 ? (
            <div className="px-4 py-6 text-center text-muted-foreground text-sm">
              <svg
                className="h-8 w-8 mx-auto mb-2 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              <p>Aucune note ne pointe vers celle-ci</p>
              <p className="text-xs mt-1 opacity-70">
                Utilisez [[{noteId.slice(0, 8)}...]] pour créer un lien
              </p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y">
              {backlinks.map((backlink) => (
                <Link
                  key={backlink.noteId}
                  to={`/notes/${backlink.noteId}`}
                  className="block px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <svg
                      className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">
                        {backlink.title}
                      </div>
                      {backlink.context && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {backlink.context}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="truncate">{backlink.folderPath}</span>
                        <span>·</span>
                        <span className="whitespace-nowrap">
                          {formatRelativeTime(backlink.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
