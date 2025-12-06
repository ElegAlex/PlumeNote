// ===========================================
// Upload Dropzone Component
// EP-008: Zone de dépôt de fichiers ZIP
// ===========================================

import { useCallback, useState, useRef } from 'react';
import { Upload, FileArchive, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  maxSizeMb?: number;
}

export function UploadDropzone({
  onFileSelect,
  isLoading,
  maxSizeMb = 100,
}: UploadDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      return 'Seuls les fichiers ZIP sont acceptés';
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      return `Le fichier ne doit pas dépasser ${maxSizeMb}MB`;
    }
    return null;
  };

  const handleFile = useCallback((file: File) => {
    setDragError(null);
    const error = validateFile(file);
    if (error) {
      setDragError(error);
      return;
    }
    onFileSelect(file);
  }, [onFileSelect, maxSizeMb]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input pour permettre de sélectionner le même fichier
    e.target.value = '';
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
        isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        isLoading && 'opacity-50 cursor-not-allowed pointer-events-none'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        onChange={handleInputChange}
        className="hidden"
        disabled={isLoading}
      />

      <div className="flex flex-col items-center gap-4">
        {isLoading ? (
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        ) : isDragActive ? (
          <Upload className="w-12 h-12 text-primary" />
        ) : (
          <FileArchive className="w-12 h-12 text-muted-foreground" />
        )}

        <div>
          {isLoading ? (
            <p className="text-muted-foreground">Analyse du fichier...</p>
          ) : isDragActive ? (
            <p className="text-primary font-medium">Déposez le fichier ici</p>
          ) : (
            <>
              <p className="text-muted-foreground mb-1">
                Glissez un fichier ZIP ou{' '}
                <span className="text-primary font-medium">parcourez</span>
              </p>
              <p className="text-sm text-muted-foreground/75">
                Fichier .zip contenant des notes Markdown (max {maxSizeMb}MB)
              </p>
            </>
          )}
        </div>

        {dragError && (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm">{dragError}</p>
          </div>
        )}
      </div>
    </div>
  );
}
