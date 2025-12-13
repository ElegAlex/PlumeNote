// ===========================================
// Dialog d'upload d'images pour l'éditeur
// ===========================================

import { useState, useCallback, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Upload, Link, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

const API_BASE = '/api/v1';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  onImageInserted: (markdown: string) => void;
}

interface UploadResult {
  id: string;
  url: string;
  filename: string;
}

export function ImageUploadDialog({
  open,
  onOpenChange,
  noteId,
  onImageInserted,
}: ImageUploadDialogProps) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [urlInput, setUrlInput] = useState('');
  const [altText, setAltText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setError(null);
    setProgress(0);
    setUrlInput('');
    setAltText('');
    setIsUploading(false);
    setDragOver(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [onOpenChange, resetState]);

  const uploadFile = useCallback(async (file: File): Promise<UploadResult | null> => {
    // Validation
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(`Type non supporté: ${file.type}. Utilisez PNG, JPG, GIF, WebP ou SVG.`);
      return null;
    }
    if (file.size > MAX_SIZE) {
      setError(`Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum: 10 Mo.`);
      return null;
    }

    setIsUploading(true);
    setError(null);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        setIsUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.data) {
              resolve(response.data);
            } else {
              setError(response.error?.message || 'Erreur lors de l\'upload');
              resolve(null);
            }
          } catch {
            setError('Réponse serveur invalide');
            resolve(null);
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            setError(errorResponse.error?.message || `Erreur HTTP ${xhr.status}`);
          } catch {
            setError(`Erreur HTTP ${xhr.status}`);
          }
          resolve(null);
        }
      });

      xhr.addEventListener('error', () => {
        setIsUploading(false);
        setError('Erreur réseau');
        resolve(null);
      });

      xhr.open('POST', `${API_BASE}/attachments/upload?noteId=${noteId}`);
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  }, [noteId]);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file) return;

    const result = await uploadFile(file);

    if (result) {
      const alt = altText.trim() || file.name.replace(/\.[^.]+$/, '');
      const markdown = `![${alt}](${result.url})`;
      onImageInserted(markdown);
      handleClose();
    }
  }, [uploadFile, altText, onImageInserted, handleClose]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleUrlSubmit = useCallback(() => {
    const url = urlInput.trim();
    if (!url) {
      setError('Veuillez entrer une URL');
      return;
    }

    try {
      new URL(url);
    } catch {
      setError('URL invalide');
      return;
    }

    const alt = altText.trim() || 'image';
    const markdown = `![${alt}](${url})`;
    onImageInserted(markdown);
    handleClose();
  }, [urlInput, altText, onImageInserted, handleClose]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-lg shadow-xl animate-in zoom-in-95">
          <div className="flex items-center justify-between p-4 border-b">
            <Dialog.Title className="text-lg font-semibold">
              Insérer une image
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Uploadez une image ou collez une URL
            </Dialog.Description>
            <Dialog.Close asChild>
              <button className="p-1 hover:bg-muted rounded" onClick={handleClose}>
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-4">
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                className={cn(
                  'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
                  mode === 'upload'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                )}
                onClick={() => { setMode('upload'); setError(null); }}
              >
                <Upload className="h-4 w-4 inline mr-2" />
                Upload
              </button>
              <button
                className={cn(
                  'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
                  mode === 'url'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                )}
                onClick={() => { setMode('url'); setError(null); }}
              >
                <Link className="h-4 w-4 inline mr-2" />
                URL
              </button>
            </div>

            {/* Alt text input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Texte alternatif (optionnel)
              </label>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Description de l'image"
                className="w-full px-3 py-2 border rounded-md bg-background"
              />
            </div>

            {mode === 'upload' ? (
              <>
                {/* Drop zone */}
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                    dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
                    isUploading && 'pointer-events-none opacity-50'
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <div className="space-y-2">
                      <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Upload en cours... {progress}%</p>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Glissez une image ici ou cliquez pour sélectionner
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, GIF, WebP, SVG (max 10 Mo)
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(',')}
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </>
            ) : (
              <>
                {/* URL input */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      URL de l'image
                    </label>
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://exemple.com/image.png"
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                    />
                  </div>
                  <Button onClick={handleUrlSubmit} className="w-full">
                    Insérer l'image
                  </Button>
                </div>
              </>
            )}

            {/* Error message */}
            {error && (
              <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
