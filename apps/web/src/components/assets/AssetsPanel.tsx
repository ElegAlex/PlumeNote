// ===========================================
// Panneau de gestion des Assets
// Affiche la grille d'images avec upload et suppression
// ===========================================

import { useEffect, useCallback, useRef, useState } from 'react';
import { useAssetsStore, type Asset } from '../../stores/assetsStore';
import { toast } from 'sonner';

interface AssetsPanelProps {
  onInsert?: (asset: Asset) => void;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssetsPanel({ onInsert, className = '' }: AssetsPanelProps) {
  const {
    assets,
    isLoading,
    isUploading,
    error,
    fetchAssets,
    uploadAsset,
    deleteAsset,
    selectAsset,
    selectedAssetId,
    clearError,
  } = useAssetsStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    fetchAssets({ type: 'image' });
  }, [fetchAssets]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        const asset = await uploadAsset(file);
        if (asset) {
          toast.success(`${file.name} uploadé`);
        }
      }
    },
    [uploadAsset]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleUpload(e.target.files);
        e.target.value = '';
      }
    },
    [handleUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleUpload(e.dataTransfer.files);
      }
    },
    [handleUpload]
  );

  const handleDelete = useCallback(
    async (asset: Asset, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm(`Supprimer "${asset.filename}" ?`)) {
        const success = await deleteAsset(asset.id);
        if (success) {
          toast.success('Asset supprimé');
        }
      }
    },
    [deleteAsset]
  );

  const handleInsert = useCallback(
    (asset: Asset) => {
      if (onInsert) {
        onInsert(asset);
      } else {
        // Copier l'URL dans le presse-papier
        navigator.clipboard.writeText(asset.url);
        toast.success('URL copiée dans le presse-papier');
      }
    },
    [onInsert]
  );

  return (
    <div
      className={`flex flex-col h-full ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header avec bouton upload */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium text-sm">Assets</h3>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {isUploading ? 'Upload...' : 'Ajouter'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Zone de drop et grille */}
      <div
        className={`flex-1 overflow-auto p-3 ${
          isDragOver ? 'bg-primary/10 border-2 border-dashed border-primary' : ''
        }`}
      >
        {isLoading && assets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Chargement...
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
            <svg
              className="h-12 w-12 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p>Aucun asset</p>
            <p className="text-xs">Glissez-déposez des images ici</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => selectAsset(asset.id)}
                onDoubleClick={() => handleInsert(asset)}
                className={`group relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                  selectedAssetId === asset.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-transparent hover:border-muted-foreground/30'
                }`}
              >
                {/* Miniature ou icône */}
                {asset.thumbnailUrl ? (
                  <img
                    src={asset.thumbnailUrl}
                    alt={asset.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <svg
                      className="h-8 w-8 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}

                {/* Overlay au hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                  <p className="text-white text-xs truncate">{asset.filename}</p>
                  <p className="text-white/70 text-xs">{formatFileSize(asset.size)}</p>
                </div>

                {/* Bouton supprimer */}
                <button
                  type="button"
                  onClick={(e) => handleDelete(asset, e)}
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer avec info sélection */}
      {selectedAssetId && (
        <div className="p-2 border-t text-xs text-muted-foreground">
          Double-clic pour insérer
        </div>
      )}
    </div>
  );
}
