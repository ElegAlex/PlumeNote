// ===========================================
// FEAT-02: Extension vidéo native pour TipTap
// Support des fichiers MP4, WebM, MOV
// ===========================================

import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface VideoOptions {
  HTMLAttributes: Record<string, unknown>;
  allowedMimeTypes: string[];
  maxFileSize: number;
  uploadFn?: (file: File) => Promise<{ url: string; id: string } | null>;
  onUploadSuccess?: (result: { url: string; id: string }) => void;
  onUploadError?: (error: Error) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: { src: string; title?: string }) => ReturnType;
    };
  }
}

/**
 * Helper pour détecter le type MIME à partir de l'extension de fichier
 */
function getMimeType(src: string | null | undefined): string {
  if (!src) return 'video/mp4';
  const ext = src.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    case 'ogg':
      return 'video/ogg';
    default:
      return 'video/mp4';
  }
}

export const VideoExtension = Node.create<VideoOptions>({
  name: 'video',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'],
      maxFileSize: 500 * 1024 * 1024, // 500 Mo (FEAT-01)
      uploadFn: undefined,
      onUploadSuccess: undefined,
      onUploadError: undefined,
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      title: {
        default: null,
      },
      controls: {
        default: true,
      },
      width: {
        default: '100%',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'video[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      { class: 'video-wrapper my-4' },
      [
        'video',
        mergeAttributes(
          this.options.HTMLAttributes,
          HTMLAttributes,
          {
            class: 'rounded-lg max-w-full',
            controls: true,
            preload: 'metadata',
          }
        ),
        [
          'source',
          {
            src: HTMLAttributes.src,
            type: getMimeType(HTMLAttributes.src as string),
          },
        ],
        'Votre navigateur ne supporte pas la lecture de vidéos.',
      ],
    ];
  },

  addCommands() {
    return {
      setVideo:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addProseMirrorPlugins() {
    const { uploadFn, onUploadSuccess, onUploadError, allowedMimeTypes, maxFileSize } = this.options;

    if (!uploadFn) {
      return [];
    }

    return [
      new Plugin({
        key: new PluginKey('videoUpload'),
        props: {
          handleDOMEvents: {
            drop: (view, event) => {
              const hasFiles = event.dataTransfer?.files?.length;
              if (!hasFiles) return false;

              const videoFiles = Array.from(event.dataTransfer.files).filter(
                (file) => allowedMimeTypes.includes(file.type)
              );

              if (videoFiles.length === 0) return false;

              event.preventDefault();

              const coordinates = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });

              videoFiles.forEach((file) => {
                if (file.size > maxFileSize) {
                  onUploadError?.(new Error(`Fichier trop volumineux (max ${maxFileSize / 1024 / 1024} Mo)`));
                  return;
                }

                uploadFn(file).then((result) => {
                  if (result) {
                    const videoNodeType = view.state.schema.nodes.video;
                    if (!videoNodeType) return;

                    const node = videoNodeType.create({
                      src: result.url,
                      title: file.name,
                    });

                    const transaction = view.state.tr.insert(
                      coordinates?.pos ?? view.state.selection.anchor,
                      node
                    );

                    view.dispatch(transaction);
                    onUploadSuccess?.(result);
                  }
                }).catch((error) => {
                  onUploadError?.(error);
                });
              });

              return true;
            },
            paste: (view, event) => {
              const hasFiles = event.clipboardData?.files?.length;
              if (!hasFiles) return false;

              const videoFiles = Array.from(event.clipboardData.files).filter(
                (file) => allowedMimeTypes.includes(file.type)
              );

              if (videoFiles.length === 0) return false;

              event.preventDefault();

              videoFiles.forEach((file) => {
                if (file.size > maxFileSize) {
                  onUploadError?.(new Error(`Fichier trop volumineux (max ${maxFileSize / 1024 / 1024} Mo)`));
                  return;
                }

                uploadFn(file).then((result) => {
                  if (result) {
                    const videoNodeType = view.state.schema.nodes.video;
                    if (!videoNodeType) return;

                    const node = videoNodeType.create({
                      src: result.url,
                      title: file.name,
                    });

                    const transaction = view.state.tr.replaceSelectionWith(node);
                    view.dispatch(transaction);
                    onUploadSuccess?.(result);
                  }
                }).catch((error) => {
                  onUploadError?.(error);
                });
              });

              return true;
            },
          },
        },
      }),
    ];
  },
});
