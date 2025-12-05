// ===========================================
// Éditeur de Note TipTap (US-010 à US-017, US-030 à US-032)
// US-008/US-009: Sauvegarde automatique avec indicateur
// US-017: Tags inline avec autocomplétion
// US-022: Configuration centralisée de l'éditeur
// ===========================================

import { useCallback, useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { useNavigate } from 'react-router-dom';
import { EditorToolbar } from './EditorToolbar';
import { SaveIndicator } from './SaveIndicator';
import { TagSuggestionPopup, useTagSuggestion } from './extensions/tag';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useImageUpload, type UploadResult } from '../../hooks/useImageUpload';
import {
  createEditorExtensions,
  createEditorProps,
  type EditorConfigOptions,
  type EditorFeatureFlags,
} from './EditorConfig';

interface NoteEditorProps {
  content: string;
  onSave: (content: string) => Promise<void>;
  noteId: string;
  editable?: boolean;
  /** Feature flags pour activer/désactiver des extensions (US-022) */
  features?: EditorFeatureFlags;
  /** Configuration avancée de l'éditeur (US-022) */
  config?: Omit<EditorConfigOptions, 'features' | 'onTagClick'>;
}

/** @deprecated Utiliser onSave à la place */
interface LegacyNoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  noteId: string;
  editable?: boolean;
}

export function NoteEditor({
  content,
  onSave,
  noteId,
  editable = true,
  features,
  config,
}: NoteEditorProps) {
  const navigate = useNavigate();

  // Hook de sauvegarde automatique avec machine à états
  const {
    status,
    lastSaved,
    errorMessage,
    triggerSave,
    retry,
    reset,
  } = useAutoSave(onSave, {
    debounceMs: 1000,
    maxWaitMs: 30000,
    maxRetries: 3,
    retryDelayMs: 2000,
    savedDisplayMs: 3000,
  });

  // Callback pour clic sur un tag
  const handleTagClick = useCallback(
    (tag: string) => {
      navigate(`/search?tag=${encodeURIComponent(tag)}`);
    },
    [navigate]
  );

  // Hook d'upload d'images (US-023/024/025)
  const imageUpload = useImageUpload({
    noteId,
    onError: (error) => {
      console.error('Image upload failed:', error);
    },
  });

  // Fonction d'upload pour l'extension TipTap
  const handleImageUpload = useCallback(
    async (file: File): Promise<{ url: string; id: string } | null> => {
      const result = await imageUpload.upload(file);
      if (result) {
        return { url: result.url, id: result.id };
      }
      return null;
    },
    [imageUpload]
  );

  // Configuration centralisée des extensions (US-022)
  const extensions = useMemo(
    () =>
      createEditorExtensions({
        ...config,
        features,
        onTagClick: handleTagClick,
        imageUpload: {
          uploadFn: handleImageUpload,
        },
      }),
    [features, config, handleTagClick, handleImageUpload]
  );

  // Props de l'éditeur (US-022)
  const editorProps = useMemo(() => createEditorProps(), []);

  const editor = useEditor({
    extensions,
    content: content || '',
    editable,
    editorProps,
    onUpdate: ({ editor }) => {
      triggerSave(editor.getHTML());
    },
  });

  // Hook pour les suggestions de tags
  const searchTags = useCallback(async (query: string) => {
    try {
      const response = await fetch(
        `/api/v1/tags/search?q=${encodeURIComponent(query)}&limit=8`,
        { credentials: 'include' }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.tags || [];
    } catch {
      return [];
    }
  }, []);

  const tagSuggestion = useTagSuggestion({
    editor,
    onSearch: searchTags,
    onSelect: () => {
      // Tag inséré automatiquement par le hook
    },
  });

  // Reset state et mise à jour du contenu quand la note change
  useEffect(() => {
    reset();
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [noteId, reset]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {editable && (
        <div className="flex items-center justify-between border-b bg-card">
          <EditorToolbar editor={editor} />
          <div className="px-4 py-2">
            <SaveIndicator
              status={status}
              lastSaved={lastSaved}
              errorMessage={errorMessage}
              onRetry={retry}
            />
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto relative">
        <EditorContent editor={editor} />
        {/* Tag suggestion popup (US-017) */}
        <TagSuggestionPopup
          isOpen={tagSuggestion.isOpen}
          items={tagSuggestion.items}
          selectedIndex={tagSuggestion.selectedIndex}
          position={tagSuggestion.position}
          query={tagSuggestion.query}
          onSelect={tagSuggestion.selectTag}
        />
      </div>
    </div>
  );
}

/**
 * Version legacy pour compatibilité descendante
 * @deprecated Migrer vers onSave (async)
 */
export function NoteEditorLegacy({
  content,
  onChange,
  noteId,
  editable = true,
}: LegacyNoteEditorProps) {
  const handleSave = useCallback(async (html: string) => {
    onChange(html);
  }, [onChange]);

  return (
    <NoteEditor
      content={content}
      onSave={handleSave}
      noteId={noteId}
      editable={editable}
    />
  );
}
