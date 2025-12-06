// ===========================================
// Panneau Historique des versions
// US-015/016: Affichage et restauration des versions
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { formatRelativeTime } from '../../lib/utils';
import { Spinner } from '../ui/Spinner';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toaster';

interface NoteVersion {
  id: string;
  versionNumber: number;
  content: string;
  frontmatter: Record<string, unknown>;
  authorId: string;
  changeSummary: string | null;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
  };
}

interface VersionHistoryPanelProps {
  noteId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore?: () => void;
}

export function VersionHistoryPanel({
  noteId,
  isOpen,
  onClose,
  onRestore,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<NoteVersion | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const fetchVersions = useCallback(async () => {
    if (!noteId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<{ versions: NoteVersion[] }>(
        `/notes/${noteId}/versions`
      );
      setVersions(response.data.versions);
    } catch (err) {
      setError('Erreur lors du chargement des versions');
      console.error('Error fetching versions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
      setSelectedVersion(null);
    }
  }, [isOpen, fetchVersions]);

  const handleRestore = async (versionNumber: number) => {
    if (!noteId) return;

    setIsRestoring(true);
    try {
      await api.post(`/notes/${noteId}/restore/${versionNumber}`);
      toast.success(`Version ${versionNumber} restaurée`);
      onRestore?.();
      onClose();
    } catch (err) {
      toast.error('Erreur lors de la restauration');
      console.error('Error restoring version:', err);
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-96 bg-background border-l shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="font-semibold">Historique des versions</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Version list */}
          <div className="w-full overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-destructive">{error}</div>
            ) : versions.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Aucune version enregistrée
              </div>
            ) : (
              <div className="divide-y">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedVersion?.id === version.id
                        ? 'bg-accent'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedVersion(version)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            Version {version.versionNumber}
                          </span>
                          {index === 0 && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              Actuelle
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatRelativeTime(version.createdAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          par {version.author.displayName || version.author.username}
                        </p>
                        {version.changeSummary && (
                          <p className="text-xs mt-1 text-foreground/80">
                            {version.changeSummary}
                          </p>
                        )}
                      </div>
                      {index > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(version.versionNumber);
                          }}
                          disabled={isRestoring}
                        >
                          {isRestoring ? (
                            <Spinner size="sm" />
                          ) : (
                            'Restaurer'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preview of selected version */}
        {selectedVersion && (
          <div className="border-t max-h-64 overflow-y-auto">
            <div className="p-3 bg-muted/30">
              <h3 className="text-xs font-medium text-muted-foreground mb-2">
                Apercu de la version {selectedVersion.versionNumber}
              </h3>
              <div className="text-sm whitespace-pre-wrap font-mono bg-background p-2 rounded border max-h-40 overflow-y-auto">
                {selectedVersion.content.slice(0, 1000)}
                {selectedVersion.content.length > 1000 && '...'}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
