// ===========================================
// Panneau de gestion des pièces jointes
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import { X, Trash2, Copy, ExternalLink, Image, File, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

const API_BASE = '/api/v1';

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
  uploadedBy: {
    id: string;
    username: string;
    displayName: string | null;
  };
}

interface AttachmentsPanelProps {
  noteId: string;
  isOpen: boolean;
  onClose: () => void;
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
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AttachmentsPanel({ noteId, isOpen, onClose }: AttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAttachments = useCallback(async () => {
    if (!noteId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/attachments/note/${noteId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAttachments(data.data);
        } else {
          setError(data.error?.message || 'Erreur lors du chargement');
        }
      } else {
        setError('Erreur lors du chargement des pièces jointes');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    if (isOpen && noteId) {
      fetchAttachments();
    }
  }, [isOpen, noteId, fetchAttachments]);

  const handleCopyUrl = useCallback(async (url: string) => {
    try {
      // Construire l'URL complète
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
        setAttachments((prev) => prev.filter((a) => a.id !== id));
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
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-background border-l shadow-lg z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Pièces jointes</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchAttachments} className="mt-2">
              Réessayer
            </Button>
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Aucune pièce jointe</p>
            <p className="text-sm mt-1">
              Glissez une image dans l'éditeur ou utilisez le bouton image
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <AttachmentCard
                key={attachment.id}
                attachment={attachment}
                onCopyUrl={handleCopyUrl}
                onCopyMarkdown={handleCopyMarkdown}
                onDelete={handleDelete}
                isDeleting={deletingId === attachment.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t text-xs text-muted-foreground">
        {attachments.length > 0 && (
          <p>
            {attachments.length} fichier{attachments.length > 1 ? 's' : ''} •{' '}
            {formatFileSize(attachments.reduce((acc, a) => acc + a.size, 0))}
          </p>
        )}
      </div>
    </div>
  );
}

interface AttachmentCardProps {
  attachment: Attachment;
  onCopyUrl: (url: string) => void;
  onCopyMarkdown: (attachment: Attachment) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function AttachmentCard({
  attachment,
  onCopyUrl,
  onCopyMarkdown,
  onDelete,
  isDeleting,
}: AttachmentCardProps) {
  const isImage = attachment.mimeType.startsWith('image/');

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Preview */}
      {isImage ? (
        <div className="aspect-video bg-muted relative group">
          <img
            src={attachment.url}
            alt={attachment.filename}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ExternalLink className="h-6 w-6 text-white" />
          </a>
        </div>
      ) : (
        <div className="aspect-video bg-muted flex items-center justify-center">
          <File className="h-12 w-12 text-muted-foreground" />
        </div>
      )}

      {/* Info */}
      <div className="p-3">
        <p className="font-medium text-sm truncate" title={attachment.filename}>
          {attachment.filename}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatFileSize(attachment.size)} • {formatDate(attachment.createdAt)}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-2">
          <button
            onClick={() => onCopyUrl(attachment.url)}
            className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
            title="Copier l'URL"
          >
            <Copy className="h-3 w-3 inline mr-1" />
            URL
          </button>
          <button
            onClick={() => onCopyMarkdown(attachment)}
            className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
            title="Copier le markdown"
          >
            <Copy className="h-3 w-3 inline mr-1" />
            MD
          </button>
          <button
            onClick={() => onDelete(attachment.id)}
            disabled={isDeleting}
            className={cn(
              'px-2 py-1 text-xs rounded transition-colors',
              'text-destructive hover:bg-destructive/10',
              isDeleting && 'opacity-50 cursor-not-allowed'
            )}
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
