// ===========================================
// Extension TipTap Image avec Upload
// US-023/024/025: Upload via toolbar, drag & drop, paste
// ===========================================

import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageNodeView } from './ImageNodeView';

/**
 * Options de configuration de l'extension
 */
export interface ImageExtensionOptions {
  /** Types MIME acceptés */
  allowedMimeTypes: string[];
  /** Taille max en bytes */
  maxFileSize: number;
  /** Fonction d'upload */
  uploadFn?: (file: File) => Promise<{ url: string; id: string } | null>;
  /** Callback lors d'un upload réussi */
  onUploadSuccess?: (result: { url: string; id: string }) => void;
  /** Callback lors d'une erreur d'upload */
  onUploadError?: (error: Error) => void;
  /** Classes CSS pour le conteneur */
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageUpload: {
      /**
       * Insère une image depuis une URL
       */
      setImage: (options: { src: string; alt?: string; title?: string }) => ReturnType;
      /**
       * Ouvre le sélecteur de fichier
       */
      openImagePicker: () => ReturnType;
    };
  }
}

/**
 * Plugin key pour identifier le plugin d'upload
 */
export const ImageUploadPluginKey = new PluginKey('imageUpload');

/**
 * Gère l'upload d'un fichier
 */
async function handleFileUpload(
  editor: any,
  file: File,
  options: ImageExtensionOptions,
  position?: number
): Promise<void> {
  // Validation de la taille
  if (file.size > options.maxFileSize) {
    const error = new Error(
      `File size ${(file.size / 1024 / 1024).toFixed(1)} Mo exceeds maximum ${
        options.maxFileSize / 1024 / 1024
      } Mo`
    );
    options.onUploadError?.(error);
    return;
  }

  // Validation du type MIME
  if (!options.allowedMimeTypes.includes(file.type)) {
    const error = new Error(`File type ${file.type} is not allowed`);
    options.onUploadError?.(error);
    return;
  }

  // Créer un placeholder avec indicateur de chargement
  const placeholderUrl = URL.createObjectURL(file);
  const pos = position ?? editor.state.selection.anchor;

  // Insérer l'image avec état loading
  editor
    .chain()
    .focus()
    .insertContentAt(pos, {
      type: 'image',
      attrs: {
        src: placeholderUrl,
        loading: true,
      },
    })
    .run();

  // Upload le fichier
  if (options.uploadFn) {
    try {
      const result = await options.uploadFn(file);

      if (result) {
        // Trouver le noeud placeholder et le mettre à jour
        let found = false;
        editor.state.doc.descendants((node: any, nodePos: number) => {
          if (!found && node.type.name === 'image' && node.attrs.src === placeholderUrl) {
            found = true;
            editor
              .chain()
              .setNodeSelection(nodePos)
              .updateAttributes('image', {
                src: result.url,
                'data-id': result.id,
                loading: false,
              })
              .run();
          }
          return !found;
        });

        options.onUploadSuccess?.(result);
      }
    } catch (error) {
      // Supprimer le placeholder en cas d'erreur
      let found = false;
      editor.state.doc.descendants((node: any, nodePos: number) => {
        if (!found && node.type.name === 'image' && node.attrs.src === placeholderUrl) {
          found = true;
          editor.chain().setNodeSelection(nodePos).deleteSelection().run();
        }
        return !found;
      });

      options.onUploadError?.(error as Error);
    } finally {
      URL.revokeObjectURL(placeholderUrl);
    }
  }
}

/**
 * Extension TipTap pour la gestion des images avec upload
 */
export const ImageExtension = Node.create<ImageExtensionOptions>({
  name: 'image',

  group: 'block',

  draggable: true,

  addOptions() {
    return {
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
      maxFileSize: 10 * 1024 * 1024, // 10 Mo
      uploadFn: undefined,
      onUploadSuccess: undefined,
      onUploadError: undefined,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      'data-id': {
        default: null,
      },
      loading: {
        default: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },

      openImagePicker:
        () =>
        ({ editor }) => {
          const extensionOptions = this.options;
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = extensionOptions.allowedMimeTypes.join(',');
          input.onchange = async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) return;

            await handleFileUpload(editor, file, extensionOptions);
          };
          input.click();
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extensionOptions = this.options;

    return [
      new Plugin({
        key: ImageUploadPluginKey,
        props: {
          /**
           * Gère le drop de fichiers
           */
          handleDrop(view, event, _slice, moved) {
            if (moved || !event.dataTransfer?.files.length) {
              return false;
            }

            const files = Array.from(event.dataTransfer.files);
            const imageFiles = files.filter((file) =>
              extensionOptions.allowedMimeTypes.includes(file.type)
            );

            if (imageFiles.length === 0) {
              return false;
            }

            event.preventDefault();

            // Obtenir la position du drop
            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });

            if (!coordinates) return false;

            // On a besoin de l'éditeur TipTap, pas juste la view
            // On récupère l'éditeur depuis le plugin state
            const { editor } = (view as any).dom.closest('.tiptap')?.editor || {};
            if (!editor) {
              // Fallback: on utilise une approche différente
              // On insère directement via la view
              console.warn('Could not get TipTap editor for image upload');
              return false;
            }

            // Upload chaque image
            imageFiles.forEach(async (file) => {
              await handleFileUpload(editor, file, extensionOptions, coordinates.pos);
            });

            return true;
          },

          /**
           * Gère le paste de fichiers
           */
          handlePaste(view, event) {
            const items = event.clipboardData?.items;
            if (!items) return false;

            const imageItems = Array.from(items).filter(
              (item) =>
                item.kind === 'file' &&
                extensionOptions.allowedMimeTypes.includes(item.type)
            );

            if (imageItems.length === 0) {
              return false;
            }

            event.preventDefault();

            // Récupérer l'éditeur
            const { editor } = (view as any).dom.closest('.tiptap')?.editor || {};
            if (!editor) {
              console.warn('Could not get TipTap editor for image paste');
              return false;
            }

            imageItems.forEach(async (item) => {
              const file = item.getAsFile();
              if (!file) return;

              await handleFileUpload(editor, file, extensionOptions);
            });

            return true;
          },
        },
      }),
    ];
  },
});
