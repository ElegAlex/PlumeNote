// ===========================================
// Éditeur Collaboratif avec Yjs
// (EP-005 - Sprint 3-4)
// ===========================================

import { useCallback, useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { useCollaboration, CollaboratorInfo } from '../../hooks/useCollaboration';
import { EditorToolbar } from './EditorToolbar';
import { WikilinkExtension } from './extensions/Wikilink';
import { CollaboratorList } from './CollaboratorList';

interface CollaborativeEditorProps {
  noteId: string;
  editable?: boolean;
  onCollaboratorsChange?: (collaborators: CollaboratorInfo[]) => void;
}

export function CollaborativeEditor({
  noteId,
  editable = true,
  onCollaboratorsChange,
}: CollaborativeEditorProps) {
  const {
    ydoc,
    provider,
    isConnected,
    collaborators,
    isSynced,
  } = useCollaboration({
    documentId: noteId,
    onAwarenessChange: onCollaboratorsChange,
  });

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          history: false, // Disabled because Yjs handles undo/redo
          heading: {
            levels: [1, 2, 3, 4],
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
        // Collaborative editing
        Collaboration.configure({
          document: ydoc,
        }),
        // Collaborative cursors
        ...(provider
          ? [
              CollaborationCursor.configure({
                provider,
                user: provider.awareness.getLocalState()?.user || {
                  name: 'Anonymous',
                  color: '#888888',
                },
              }),
            ]
          : []),
      ],
      editable,
      editorProps: {
        attributes: {
          class:
            'tiptap prose prose-sm max-w-none focus:outline-none p-6 min-h-[calc(100vh-10rem)]',
        },
      },
    },
    [ydoc, provider]
  );

  // Update cursor user when provider changes
  useEffect(() => {
    if (editor && provider) {
      const user = provider.awareness.getLocalState()?.user;
      if (user) {
        editor.commands.updateUser(user);
      }
    }
  }, [editor, provider]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with collaborators and status */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-2">
          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {isConnected ? (isSynced ? 'Synchronisé' : 'Synchronisation...') : 'Déconnecté'}
            </span>
          </div>
        </div>

        {/* Collaborators */}
        <CollaboratorList collaborators={collaborators} />
      </div>

      {/* Toolbar */}
      {editable && <EditorToolbar editor={editor} />}

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
