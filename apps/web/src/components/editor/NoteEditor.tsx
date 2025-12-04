// ===========================================
// Éditeur de Note TipTap (US-010 à US-016, US-030 à US-032)
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
import { debounce } from '../../lib/utils';
import { EditorToolbar } from './EditorToolbar';
import { WikilinkExtension } from './extensions/Wikilink';

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  noteId: string;
  editable?: boolean;
}

export function NoteEditor({
  content,
  onChange,
  noteId,
  editable = true,
}: NoteEditorProps) {
  // Debounced save
  const debouncedOnChange = useCallback(
    debounce((html: string) => {
      onChange(html);
    }, 1000),
    [onChange]
  );

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
      debouncedOnChange(editor.getHTML());
    },
  });

  // Update content when noteId changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [noteId]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {editable && <EditorToolbar editor={editor} />}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
