// ===========================================
// Image Node View Component
// US-026: Affichage d'image avec lightbox
// US-027: Redimensionnement avec handles
// ===========================================

import { useCallback, useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { cn } from '../../../../lib/utils';

/** Taille minimale de l'image en pixels */
const MIN_WIDTH = 50;
/** Taille maximale (pourcentage du conteneur) */
const MAX_WIDTH_PERCENT = 100;

/**
 * Composant pour afficher une image dans l'éditeur
 * Supporte le redimensionnement et la lightbox
 */
export function ImageNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const { src, alt, title, width, loading } = node.attrs;

  // Refs
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLElement>(null);

  // États
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  // Calculer le ratio d'aspect quand l'image est chargée
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setAspectRatio(img.naturalWidth / img.naturalHeight);
    }
  }, []);

  // Ouvrir la lightbox
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Ne pas ouvrir la lightbox si on clique sur un handle
    if ((e.target as HTMLElement).classList.contains('resize-handle')) {
      return;
    }
    if (!loading && !imageError && !isResizing) {
      setIsLightboxOpen(true);
    }
  }, [loading, imageError, isResizing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!loading && !imageError) {
          setIsLightboxOpen(true);
        }
      }
    },
    [loading, imageError]
  );

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleLightboxKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      }
    },
    [closeLightbox]
  );

  // ===== REDIMENSIONNEMENT =====

  const startResize = useCallback(
    (e: React.MouseEvent, direction: 'e' | 'w' | 'se' | 'sw') => {
      e.preventDefault();
      e.stopPropagation();

      if (!imageRef.current) return;

      const startX = e.clientX;
      const startWidth = imageRef.current.offsetWidth;
      const isLeft = direction === 'w' || direction === 'sw';

      setIsResizing(true);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const multiplier = isLeft ? -1 : 1;
        let newWidth = startWidth + deltaX * multiplier;

        // Contraintes
        newWidth = Math.max(MIN_WIDTH, newWidth);

        // Limiter à la largeur du conteneur
        if (containerRef.current) {
          const containerWidth = containerRef.current.parentElement?.offsetWidth || 800;
          newWidth = Math.min(newWidth, containerWidth * (MAX_WIDTH_PERCENT / 100));
        }

        // Arrondir
        newWidth = Math.round(newWidth);

        updateAttributes({ width: newWidth });
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isLeft ? 'ew-resize' : 'ew-resize';
      document.body.style.userSelect = 'none';
    },
    [updateAttributes]
  );

  // Précharger le ratio d'aspect depuis l'image existante
  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      const img = imageRef.current;
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    }
  }, [src]);

  return (
    <NodeViewWrapper className="image-wrapper my-4" ref={containerRef}>
      <figure
        className={cn(
          'relative inline-block max-w-full',
          'rounded-lg overflow-visible',
          'transition-all duration-200',
          selected && 'ring-2 ring-primary ring-offset-2',
          loading && 'opacity-60',
          isResizing && 'select-none'
        )}
      >
        {/* Indicateur de chargement */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <svg
                className="animate-spin h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Upload en cours...</span>
            </div>
          </div>
        )}

        {/* Image cliquable */}
        <div
          className="relative cursor-pointer"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label={alt || 'Cliquer pour agrandir'}
        >
          {!imageError ? (
            <img
              ref={imageRef}
              src={src}
              alt={alt || ''}
              title={title || ''}
              style={{ width: width ? `${width}px` : 'auto' }}
              className={cn(
                'max-w-full h-auto',
                'rounded-lg',
                'transition-transform duration-200',
                !isResizing && 'hover:scale-[1.01]'
              )}
              onError={handleImageError}
              onLoad={handleImageLoad}
              draggable={false}
            />
          ) : (
            <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
              <div className="text-center text-muted-foreground">
                <svg
                  className="h-12 w-12 mx-auto mb-2 opacity-50"
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
                <p className="text-sm">Image non disponible</p>
              </div>
            </div>
          )}
        </div>

        {/* Handles de redimensionnement - visibles uniquement quand sélectionné */}
        {selected && !loading && !imageError && (
          <>
            {/* Handle Est (droite) */}
            <div
              className={cn(
                'resize-handle absolute top-1/2 -right-2 -translate-y-1/2',
                'w-4 h-12 cursor-ew-resize',
                'flex items-center justify-center',
                'opacity-0 hover:opacity-100 transition-opacity',
                isResizing && 'opacity-100'
              )}
              onMouseDown={(e) => startResize(e, 'e')}
              title="Redimensionner"
            >
              <div className="w-1 h-8 bg-primary rounded-full shadow-md" />
            </div>

            {/* Handle Ouest (gauche) */}
            <div
              className={cn(
                'resize-handle absolute top-1/2 -left-2 -translate-y-1/2',
                'w-4 h-12 cursor-ew-resize',
                'flex items-center justify-center',
                'opacity-0 hover:opacity-100 transition-opacity',
                isResizing && 'opacity-100'
              )}
              onMouseDown={(e) => startResize(e, 'w')}
              title="Redimensionner"
            >
              <div className="w-1 h-8 bg-primary rounded-full shadow-md" />
            </div>

            {/* Handle Sud-Est (coin bas-droite) */}
            <div
              className={cn(
                'resize-handle absolute -bottom-2 -right-2',
                'w-4 h-4 cursor-se-resize',
                'flex items-center justify-center',
                'opacity-0 hover:opacity-100 transition-opacity',
                isResizing && 'opacity-100'
              )}
              onMouseDown={(e) => startResize(e, 'se')}
              title="Redimensionner"
            >
              <div className="w-3 h-3 bg-primary rounded-sm shadow-md" />
            </div>

            {/* Handle Sud-Ouest (coin bas-gauche) */}
            <div
              className={cn(
                'resize-handle absolute -bottom-2 -left-2',
                'w-4 h-4 cursor-sw-resize',
                'flex items-center justify-center',
                'opacity-0 hover:opacity-100 transition-opacity',
                isResizing && 'opacity-100'
              )}
              onMouseDown={(e) => startResize(e, 'sw')}
              title="Redimensionner"
            >
              <div className="w-3 h-3 bg-primary rounded-sm shadow-md" />
            </div>

            {/* Indicateur de taille pendant le resize */}
            {isResizing && width && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-background text-xs rounded shadow-lg">
                {width}px
              </div>
            )}
          </>
        )}

        {/* Caption si présent */}
        {title && (
          <figcaption className="text-center text-sm text-muted-foreground mt-2 italic">
            {title}
          </figcaption>
        )}

        {/* Indicateur de largeur en mode édition */}
        {selected && width && !isResizing && (
          <div className="absolute -top-6 left-0 text-xs text-muted-foreground">
            {width}px
          </div>
        )}
      </figure>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
          onKeyDown={handleLightboxKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label="Image agrandie"
          tabIndex={-1}
        >
          {/* Bouton fermer */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors z-10"
            aria-label="Fermer"
          >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Image en plein écran */}
          <img
            src={src}
            alt={alt || ''}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Caption */}
          {(title || alt) && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-center">
              <p className="text-lg">{title || alt}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="absolute bottom-4 right-4 text-white/50 text-sm">
            Appuyez sur Echap ou cliquez pour fermer
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}
