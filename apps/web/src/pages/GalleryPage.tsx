// ===========================================
// Galerie - Liste de toutes les pièces jointes
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Copy, ExternalLink, Image, File, Loader2, RefreshCw, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const API_BASE = '/api/v1';

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
  noteId: string;
  noteTitle: string;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function GalleryPage() {
  const navigate = useNavigate();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'images' | 'files'>('all');

  const fetchAttachments = useCallback(async (offset = 0, append = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/attachments/user/all?limit=50&offset=${offset}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAttachments(prev => append ? [...prev, ...data.data] : data.data);
          setPagination(data.pagination);
        } else {
          setError(data.error?.message || 'Erreur lors du chargement');
        }
      } else {
        setError('Erreur lors du chargement');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleLoadMore = () => {
    if (pagination?.hasMore) {
      fetchAttachments(pagination.offset + pagination.limit, true);
    }
  };

  const handleCopyUrl = useCallback(async (url: string) => {
    try {
      const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success('URL copiée');
    } catch {
      toast.error('Impossible de copier');
    }
  }, []);

  const handleCopyMarkdown = useCallback(async (attachment: Attachment) => {
    try {
      const markdown = attachment.mimeType.startsWith('image/')
        ? `![${attachment.filename}](${attachment.url})`
        : `[${attachment.filename}](${attachment.url})`;
      await navigator.clipboard.writeText(markdown);
      toast.success('Markdown copié');
    } catch {
      toast.error('Impossible de copier');
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Supprimer cette pièce jointe ?')) return;

    setDeletingId(id);

    try {
      const response = await fetch(`${API_BASE}/attachments/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setAttachments(prev => prev.filter(a => a.id !== id));
        if (pagination) {
          setPagination({ ...pagination, total: pagination.total - 1 });
        }
        toast.success('Pièce jointe supprimée');
      } else {
        const data = await response.json();
        toast.error(data.error?.message || 'Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setDeletingId(null);
    }
  }, [pagination]);

  // Filtrer les attachments
  const filteredAttachments = attachments.filter(att => {
    if (filter === 'images') return att.mimeType.startsWith('image/');
    if (filter === 'files') return !att.mimeType.startsWith('image/');
    return true;
  });

  const totalSize = attachments.reduce((acc, a) => acc + a.size, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Galerie</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {pagination?.total || 0} fichier{(pagination?.total || 0) > 1 ? 's' : ''} • {formatFileSize(totalSize)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAttachments()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Actualiser
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            )}
          >
            Tous
          </button>
          <button
            onClick={() => setFilter('images')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1',
              filter === 'images' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            )}
          >
            <Image className="h-4 w-4" />
            Images
          </button>
          <button
            onClick={() => setFilter('files')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1',
              filter === 'files' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            )}
          >
            <File className="h-4 w-4" />
            Fichiers
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading && attachments.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => fetchAttachments()}>Réessayer</Button>
          </div>
        ) : filteredAttachments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Image className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Aucune pièce jointe</p>
            <p className="text-sm mt-2">
              Uploadez des images dans vos notes pour les voir ici
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredAttachments.map(attachment => (
                <GalleryCard
                  key={attachment.id}
                  attachment={attachment}
                  onCopyUrl={handleCopyUrl}
                  onCopyMarkdown={handleCopyMarkdown}
                  onDelete={handleDelete}
                  onNavigateToNote={() => navigate(`/notes/${attachment.noteId}`)}
                  isDeleting={deletingId === attachment.id}
                />
              ))}
            </div>

            {/* Load more */}
            {pagination?.hasMore && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    'Charger plus'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface GalleryCardProps {
  attachment: Attachment;
  onCopyUrl: (url: string) => void;
  onCopyMarkdown: (attachment: Attachment) => void;
  onDelete: (id: string) => void;
  onNavigateToNote: () => void;
  isDeleting: boolean;
}

function GalleryCard({
  attachment,
  onCopyUrl,
  onCopyMarkdown,
  onDelete,
  onNavigateToNote,
  isDeleting,
}: GalleryCardProps) {
  const isImage = attachment.mimeType.startsWith('image/');

  return (
    <div className="border rounded-lg overflow-hidden bg-card group">
      {/* Preview */}
      {isImage ? (
        <div className="aspect-square bg-muted relative">
          <img
            src={attachment.url}
            alt={attachment.filename}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Ouvrir"
            >
              <ExternalLink className="h-4 w-4 text-white" />
            </a>
            <button
              onClick={() => onCopyUrl(attachment.url)}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Copier l'URL"
            >
              <Copy className="h-4 w-4 text-white" />
            </button>
            <button
              onClick={onNavigateToNote}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Aller à la note"
            >
              <FileText className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      ) : (
        <div className="aspect-square bg-muted flex items-center justify-center">
          <File className="h-12 w-12 text-muted-foreground" />
        </div>
      )}

      {/* Info */}
      <div className="p-2">
        <p className="text-xs font-medium truncate" title={attachment.filename}>
          {attachment.filename}
        </p>
        <p className="text-xs text-muted-foreground truncate" title={attachment.noteTitle}>
          {attachment.noteTitle}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">
            {formatFileSize(attachment.size)}
          </span>
          <button
            onClick={() => onDelete(attachment.id)}
            disabled={isDeleting}
            className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
            title="Supprimer"
          >
            {isDeleting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
