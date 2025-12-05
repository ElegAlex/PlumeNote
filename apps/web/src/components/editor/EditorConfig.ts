// ===========================================
// Configuration centralisée de l'éditeur TipTap (US-022)
// Factory function pour créer les extensions avec feature flags
// ===========================================

import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import type { Extensions } from '@tiptap/core';

import { WikilinkExtension } from './extensions/Wikilink';
import { CalloutExtension } from './extensions/callout';
import { TagExtension } from './extensions/tag';
import { MathInlineExtension, MathBlockExtension } from './extensions/math';
import { MermaidExtension } from './extensions/mermaid';
import { ToggleExtension } from './extensions/toggle';
import { ImageExtension, type ImageExtensionOptions } from './extensions/image';

// ===========================================
// Types pour les feature flags
// ===========================================

export interface EditorFeatureFlags {
  /** Active les tâches avec cases à cocher */
  taskLists?: boolean;
  /** Active les liens cliquables */
  links?: boolean;
  /** Active le surlignage multicolore */
  highlight?: boolean;
  /** Active les améliorations typographiques */
  typography?: boolean;
  /** Active les wikilinks [[note]] */
  wikilinks?: boolean;
  /** Active les callouts > [!type] */
  callouts?: boolean;
  /** Active les tags inline #tag */
  tags?: boolean;
  /** Active les formules LaTeX $...$ et $$...$$ */
  math?: boolean;
  /** Active les diagrammes Mermaid */
  mermaid?: boolean;
  /** Active les sections pliables :::toggle */
  toggle?: boolean;
  /** Active l'upload d'images (drag, drop, paste) */
  images?: boolean;
}

export interface EditorConfigOptions {
  /** Feature flags pour activer/désactiver les extensions */
  features?: EditorFeatureFlags;
  /** Placeholder affiché dans l'éditeur vide */
  placeholder?: string;
  /** Niveaux de titres autorisés (1-6) */
  headingLevels?: (1 | 2 | 3 | 4 | 5 | 6)[];
  /** Callback pour le clic sur un tag */
  onTagClick?: (tag: string) => void;
  /** Callback pour le clic sur un wikilink */
  onWikilinkClick?: (target: string) => void;
  /** Configuration pour l'upload d'images */
  imageUpload?: {
    uploadFn?: (file: File) => Promise<{ url: string; id: string } | null>;
    onSuccess?: (result: { url: string; id: string }) => void;
    onError?: (error: Error) => void;
  };
}

// ===========================================
// Configuration par défaut
// ===========================================

export const DEFAULT_FEATURE_FLAGS: Required<EditorFeatureFlags> = {
  taskLists: true,
  links: true,
  highlight: true,
  typography: true,
  wikilinks: true,
  callouts: true,
  tags: true,
  math: true,
  mermaid: true,
  toggle: true,
  images: true,
};

export const DEFAULT_EDITOR_OPTIONS: Required<Omit<EditorConfigOptions, 'onTagClick' | 'onWikilinkClick'>> = {
  features: DEFAULT_FEATURE_FLAGS,
  placeholder: 'Commencez à écrire...',
  headingLevels: [1, 2, 3, 4],
};

// ===========================================
// Factory function pour créer les extensions
// ===========================================

/**
 * Crée la liste des extensions TipTap selon la configuration
 * @param options Configuration de l'éditeur
 * @returns Liste des extensions TipTap
 */
export function createEditorExtensions(options: EditorConfigOptions = {}): Extensions {
  const {
    features = {},
    placeholder = DEFAULT_EDITOR_OPTIONS.placeholder,
    headingLevels = DEFAULT_EDITOR_OPTIONS.headingLevels,
    onTagClick,
    imageUpload,
  } = options;

  // Fusionner avec les flags par défaut
  const flags: Required<EditorFeatureFlags> = {
    ...DEFAULT_FEATURE_FLAGS,
    ...features,
  };

  const extensions: Extensions = [];

  // StarterKit - toujours inclus (base de l'éditeur)
  extensions.push(
    StarterKit.configure({
      heading: {
        levels: headingLevels,
      },
      codeBlock: {
        HTMLAttributes: {
          class: 'hljs',
        },
      },
    })
  );

  // Placeholder - toujours inclus
  extensions.push(
    Placeholder.configure({
      placeholder,
    })
  );

  // Task lists
  if (flags.taskLists) {
    extensions.push(TaskList);
    extensions.push(
      TaskItem.configure({
        nested: true,
      })
    );
  }

  // Links
  if (flags.links) {
    extensions.push(
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      })
    );
  }

  // Highlight
  if (flags.highlight) {
    extensions.push(
      Highlight.configure({
        multicolor: true,
      })
    );
  }

  // Typography
  if (flags.typography) {
    extensions.push(Typography);
  }

  // Wikilinks
  if (flags.wikilinks) {
    extensions.push(WikilinkExtension);
  }

  // Callouts
  if (flags.callouts) {
    extensions.push(CalloutExtension);
  }

  // Tags
  if (flags.tags) {
    extensions.push(
      TagExtension.configure({
        onTagClick,
      })
    );
  }

  // Math (inline et block)
  if (flags.math) {
    extensions.push(MathInlineExtension);
    extensions.push(MathBlockExtension);
  }

  // Mermaid
  if (flags.mermaid) {
    extensions.push(MermaidExtension);
  }

  // Toggle sections
  if (flags.toggle) {
    extensions.push(ToggleExtension);
  }

  // Images avec upload (US-023/024/025/026)
  if (flags.images) {
    extensions.push(
      ImageExtension.configure({
        uploadFn: imageUpload?.uploadFn,
        onUploadSuccess: imageUpload?.onSuccess,
        onUploadError: imageUpload?.onError,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full',
        },
      })
    );
  }

  return extensions;
}

// ===========================================
// Presets de configuration
// ===========================================

/** Configuration minimale (texte simple) */
export const MINIMAL_PRESET: EditorConfigOptions = {
  features: {
    taskLists: false,
    links: true,
    highlight: false,
    typography: true,
    wikilinks: false,
    callouts: false,
    tags: false,
    math: false,
    mermaid: false,
    toggle: false,
  },
  headingLevels: [1, 2, 3],
};

/** Configuration standard (toutes les features) */
export const STANDARD_PRESET: EditorConfigOptions = {
  features: DEFAULT_FEATURE_FLAGS,
  headingLevels: [1, 2, 3, 4],
};

/** Configuration technique (avec math et mermaid) */
export const TECHNICAL_PRESET: EditorConfigOptions = {
  features: {
    ...DEFAULT_FEATURE_FLAGS,
    math: true,
    mermaid: true,
  },
  headingLevels: [1, 2, 3, 4, 5, 6],
};

/** Configuration documentation (focus sur structure) */
export const DOCUMENTATION_PRESET: EditorConfigOptions = {
  features: {
    ...DEFAULT_FEATURE_FLAGS,
    callouts: true,
    toggle: true,
    taskLists: true,
  },
  headingLevels: [1, 2, 3, 4],
};

// ===========================================
// Props de l'éditeur
// ===========================================

export interface EditorViewProps {
  /** Classes CSS pour le conteneur de l'éditeur */
  className?: string;
  /** Hauteur minimale de l'éditeur */
  minHeight?: string;
}

export const DEFAULT_EDITOR_PROPS: EditorViewProps = {
  className: 'tiptap prose prose-sm max-w-none focus:outline-none p-6',
  minHeight: 'calc(100vh-10rem)',
};

/**
 * Génère les props de l'éditeur pour TipTap
 */
export function createEditorProps(props: EditorViewProps = {}): Record<string, unknown> {
  const { className, minHeight } = { ...DEFAULT_EDITOR_PROPS, ...props };

  return {
    attributes: {
      class: `${className} min-h-[${minHeight}]`,
    },
  };
}
