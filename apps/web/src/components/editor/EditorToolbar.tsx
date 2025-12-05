// ===========================================
// Barre d'outils de l'éditeur TipTap
// Réactif aux changements de sélection/contenu
// ===========================================

import { useCallback } from 'react';
import { Editor, useEditorState } from '@tiptap/react';
import { cn } from '../../lib/utils';

interface EditorToolbarProps {
  editor: Editor;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

function ToolbarButton({ onClick, isActive, disabled, children, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'h-8 w-8 flex items-center justify-center rounded transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        isActive && 'bg-accent text-accent-foreground',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
      )}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-6 bg-border mx-1" />;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  // Hook réactif : se met à jour à chaque changement de l'éditeur
  const editorState = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      isBold: e.isActive('bold'),
      isItalic: e.isActive('italic'),
      isStrike: e.isActive('strike'),
      isCode: e.isActive('code'),
      isH1: e.isActive('heading', { level: 1 }),
      isH2: e.isActive('heading', { level: 2 }),
      isH3: e.isActive('heading', { level: 3 }),
      isBulletList: e.isActive('bulletList'),
      isOrderedList: e.isActive('orderedList'),
      isTaskList: e.isActive('taskList'),
      isBlockquote: e.isActive('blockquote'),
      isCodeBlock: e.isActive('codeBlock'),
      isCallout: e.isActive('callout'),
      isHighlight: e.isActive('highlight'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  // Callbacks mémorisés pour éviter les re-renders inutiles
  const toggleBold = useCallback(() => editor.chain().focus().toggleBold().run(), [editor]);
  const toggleItalic = useCallback(() => editor.chain().focus().toggleItalic().run(), [editor]);
  const toggleStrike = useCallback(() => editor.chain().focus().toggleStrike().run(), [editor]);
  const toggleCode = useCallback(() => editor.chain().focus().toggleCode().run(), [editor]);
  const toggleH1 = useCallback(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), [editor]);
  const toggleH2 = useCallback(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), [editor]);
  const toggleH3 = useCallback(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), [editor]);
  const toggleBulletList = useCallback(() => editor.chain().focus().toggleBulletList().run(), [editor]);
  const toggleOrderedList = useCallback(() => editor.chain().focus().toggleOrderedList().run(), [editor]);
  const toggleTaskList = useCallback(() => editor.chain().focus().toggleTaskList().run(), [editor]);
  const toggleBlockquote = useCallback(() => editor.chain().focus().toggleBlockquote().run(), [editor]);
  const toggleCodeBlock = useCallback(() => editor.chain().focus().toggleCodeBlock().run(), [editor]);
  const setHorizontalRule = useCallback(() => editor.chain().focus().setHorizontalRule().run(), [editor]);
  const toggleHighlight = useCallback(() => editor.chain().focus().toggleHighlight().run(), [editor]);
  const setCallout = useCallback(() => editor.chain().focus().setCallout({ type: 'info' }).run(), [editor]);
  const undo = useCallback(() => editor.chain().focus().undo().run(), [editor]);
  const redo = useCallback(() => editor.chain().focus().redo().run(), [editor]);

  return (
    <div className="flex items-center gap-0.5 px-4 py-2 flex-wrap">
      {/* Text Formatting */}
      <ToolbarButton onClick={toggleBold} isActive={editorState.isBold} title="Gras (Ctrl+B)">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton onClick={toggleItalic} isActive={editorState.isItalic} title="Italique (Ctrl+I)">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="19" y1="4" x2="10" y2="4" strokeWidth={2} strokeLinecap="round" />
          <line x1="14" y1="20" x2="5" y2="20" strokeWidth={2} strokeLinecap="round" />
          <line x1="15" y1="4" x2="9" y2="20" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </ToolbarButton>

      <ToolbarButton onClick={toggleStrike} isActive={editorState.isStrike} title="Barré (Ctrl+Shift+S)">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4H9a3 3 0 000 6h6" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 20h7a3 3 0 000-6H9" />
          <line x1="4" y1="12" x2="20" y2="12" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </ToolbarButton>

      <ToolbarButton onClick={toggleCode} isActive={editorState.isCode} title="Code inline (Ctrl+E)">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </ToolbarButton>

      <ToolbarButton onClick={toggleHighlight} isActive={editorState.isHighlight} title="Surligner (Ctrl+Shift+H)">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          <rect x="3" y="19" width="7" height="3" rx="1" fill="currentColor" opacity="0.3" />
        </svg>
      </ToolbarButton>

      <Separator />

      {/* Headings */}
      <ToolbarButton onClick={toggleH1} isActive={editorState.isH1} title="Titre 1 (Ctrl+Alt+1)">
        <span className="text-sm font-bold">H1</span>
      </ToolbarButton>

      <ToolbarButton onClick={toggleH2} isActive={editorState.isH2} title="Titre 2 (Ctrl+Alt+2)">
        <span className="text-sm font-bold">H2</span>
      </ToolbarButton>

      <ToolbarButton onClick={toggleH3} isActive={editorState.isH3} title="Titre 3 (Ctrl+Alt+3)">
        <span className="text-sm font-bold">H3</span>
      </ToolbarButton>

      <Separator />

      {/* Lists */}
      <ToolbarButton onClick={toggleBulletList} isActive={editorState.isBulletList} title="Liste à puces (Ctrl+Shift+8)">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="9" y1="6" x2="20" y2="6" strokeWidth={2} strokeLinecap="round" />
          <line x1="9" y1="12" x2="20" y2="12" strokeWidth={2} strokeLinecap="round" />
          <line x1="9" y1="18" x2="20" y2="18" strokeWidth={2} strokeLinecap="round" />
          <circle cx="5" cy="6" r="1.5" fill="currentColor" />
          <circle cx="5" cy="12" r="1.5" fill="currentColor" />
          <circle cx="5" cy="18" r="1.5" fill="currentColor" />
        </svg>
      </ToolbarButton>

      <ToolbarButton onClick={toggleOrderedList} isActive={editorState.isOrderedList} title="Liste numérotée (Ctrl+Shift+7)">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="10" y1="6" x2="20" y2="6" strokeWidth={2} strokeLinecap="round" />
          <line x1="10" y1="12" x2="20" y2="12" strokeWidth={2} strokeLinecap="round" />
          <line x1="10" y1="18" x2="20" y2="18" strokeWidth={2} strokeLinecap="round" />
          <text x="4" y="8" fontSize="8" fontWeight="bold" fill="currentColor">1</text>
          <text x="4" y="14" fontSize="8" fontWeight="bold" fill="currentColor">2</text>
          <text x="4" y="20" fontSize="8" fontWeight="bold" fill="currentColor">3</text>
        </svg>
      </ToolbarButton>

      <ToolbarButton onClick={toggleTaskList} isActive={editorState.isTaskList} title="Liste de tâches (Ctrl+Shift+9)">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="6" height="6" rx="1" strokeWidth={2} />
          <path d="M5 6l1.5 1.5L9 5" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="12" y1="6" x2="21" y2="6" strokeWidth={2} strokeLinecap="round" />
          <rect x="3" y="13" width="6" height="6" rx="1" strokeWidth={2} />
          <line x1="12" y1="16" x2="21" y2="16" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </ToolbarButton>

      <Separator />

      {/* Block Elements */}
      <ToolbarButton onClick={toggleBlockquote} isActive={editorState.isBlockquote} title="Citation (Ctrl+Shift+B)">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton onClick={toggleCodeBlock} isActive={editorState.isCodeBlock} title="Bloc de code (Ctrl+Alt+C)">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton onClick={setHorizontalRule} title="Ligne horizontale">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
        </svg>
      </ToolbarButton>

      <ToolbarButton onClick={setCallout} isActive={editorState.isCallout} title="Callout (Ctrl+Shift+C)">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </ToolbarButton>

      <Separator />

      {/* Undo/Redo */}
      <ToolbarButton onClick={undo} disabled={!editorState.canUndo} title="Annuler (Ctrl+Z)">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </ToolbarButton>

      <ToolbarButton onClick={redo} disabled={!editorState.canRedo} title="Refaire (Ctrl+Shift+Z)">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
        </svg>
      </ToolbarButton>
    </div>
  );
}
