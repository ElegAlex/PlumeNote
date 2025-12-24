// ===========================================
// Composant React pour rendu Math LaTeX (US-018)
// Utilise KaTeX pour le rendu des équations
// ===========================================
// Security: Uses strict mode with URL validation and limits
// ===========================================

import { useState, useEffect, useRef } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Security: Maximum LaTeX expression length
const MAX_LATEX_LENGTH = 10000;

// Security: Allowed URL protocols for \href and \url
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

interface MathViewComponentProps extends NodeViewProps {
  isBlock?: boolean;
}

function MathViewBase({ node, updateAttributes, selected, isBlock = false }: MathViewComponentProps) {
  const latex = (node.attrs.latex as string) || '';
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(latex);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const renderRef = useRef<HTMLSpanElement>(null);

  // Rendre l'équation avec KaTeX
  useEffect(() => {
    if (!isEditing && renderRef.current) {
      // Security: Reject overly long expressions (DoS prevention)
      if (latex.length > MAX_LATEX_LENGTH) {
        setError('Expression too long');
        return;
      }

      try {
        katex.render(latex, renderRef.current, {
          displayMode: isBlock,
          throwOnError: false,
          errorColor: '#ef4444',
          // Security: Limit macro expansion to prevent DoS
          maxSize: 10,
          maxExpand: 1000,
          // Security: Trust function to validate URLs in \href and \url
          trust: (context) => {
            // Allow only safe protocols for URLs
            if (context.command === '\\href' || context.command === '\\url') {
              try {
                const url = new URL(context.url);
                return ALLOWED_PROTOCOLS.includes(url.protocol.toLowerCase());
              } catch {
                return false;
              }
            }
            // Block \includegraphics and other risky commands
            if (context.command === '\\includegraphics') {
              return false;
            }
            return false;
          },
          strict: 'warn', // Warn on unrecognized commands
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur LaTeX');
      }
    }
  }, [latex, isEditing, isBlock]);

  // Focus sur l'input en mode édition
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Synchroniser editValue quand le latex change
  useEffect(() => {
    setEditValue(latex);
  }, [latex]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== latex) {
      updateAttributes({ latex: editValue });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setEditValue(latex);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <NodeViewWrapper
        as={isBlock ? 'div' : 'span'}
        className={`math-editor ${isBlock ? 'block my-4' : 'inline'}`}
      >
        <div className={`${isBlock ? 'flex flex-col items-center' : 'inline-block'}`}>
          <textarea
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`
              font-mono text-sm bg-muted border border-border rounded px-2 py-1
              focus:outline-none focus:ring-2 focus:ring-primary
              ${isBlock ? 'w-full max-w-lg min-h-[60px]' : 'min-w-[100px]'}
            `}
            placeholder="Entrez du LaTeX..."
            rows={isBlock ? 3 : 1}
          />
          <div className="text-xs text-muted-foreground mt-1">
            Entrée pour valider, Échap pour annuler
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as={isBlock ? 'div' : 'span'}
      className={`
        math-render cursor-pointer
        ${isBlock ? 'block my-4 text-center' : 'inline'}
        ${selected ? 'ring-2 ring-primary ring-offset-2 rounded' : ''}
        ${error ? 'text-destructive' : ''}
      `}
      onDoubleClick={handleDoubleClick}
      title="Double-clic pour éditer"
    >
      {error ? (
        <span className="inline-flex items-center gap-1 text-sm text-destructive bg-destructive/10 px-2 py-1 rounded">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </span>
      ) : (
        <span ref={renderRef} className={isBlock ? 'text-lg' : ''} />
      )}
    </NodeViewWrapper>
  );
}

// Export pour usage général
export const MathView = MathViewBase;

// Version inline (pour ReactNodeViewRenderer)
export function MathInlineView(props: NodeViewProps) {
  return <MathViewBase {...props} isBlock={false} />;
}

// Version block (pour ReactNodeViewRenderer)
export function MathBlockView(props: NodeViewProps) {
  return <MathViewBase {...props} isBlock={true} />;
}
