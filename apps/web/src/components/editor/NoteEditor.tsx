// ===========================================
// Éditeur de Note TipTap (US-010 à US-016, US-030 à US-032)
// US-008/US-009: Sauvegarde automatique avec indicateur
// ===========================================

import { useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import { EditorToolbar } from './EditorToolbar';
import { SaveIndicator } from './SaveIndicator';
import { WikilinkExtension } from './extensions/Wikilink';
import { useAutoSave } from '../../hooks/useAutoSave';

interface NoteEditorProps {
  content: string;
  onSave: (content: string) => Promise<void>;
  noteId: string;
  editable?: boolean;
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
}: NoteEditorProps) {
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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'hljs',
          },
        },
      }),
      Placeholder.configure({
        placeholder: 'Commencez à écrire...',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Typography,
      WikilinkExtension,
    ],
    content: content || '',
    editable,
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-sm max-w-none focus:outline-none p-6 min-h-[calc(100vh-10rem)]',
      },
    },
    onUpdate: ({ editor }) => {
      triggerSave(editor.getHTML());
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
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
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
