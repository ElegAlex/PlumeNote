// ===========================================
// Composant React pour rendu Mermaid (US-019)
// Diagrammes: flowchart, sequence, gantt, class
// ===========================================
// Security: Uses strict mode and DOMPurify sanitization
// ===========================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';

// Security: Configure Mermaid with strict security
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict', // CRITICAL: Blocks script execution
  fontFamily: 'inherit',
  // Security: Disable HTML labels to prevent XSS
  flowchart: {
    htmlLabels: false,
  },
  // Security: Limit diagram size
  maxTextSize: 50000,
});

// Security: DOMPurify configuration for SVG
const PURIFY_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
  // Allow foreignObject for text rendering
  ADD_TAGS: ['foreignObject'],
  // Remove dangerous attributes
  FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover'],
};

// Compteur unique pour les IDs Mermaid
let mermaidIdCounter = 0;

export function MermaidView({ node, updateAttributes, selected }: NodeViewProps) {
  const code = (node.attrs.code as string) || '';
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(code);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const idRef = useRef(`mermaid-${++mermaidIdCounter}`);

  // Rendre le diagramme Mermaid
  const renderDiagram = useCallback(async (diagramCode: string) => {
    if (!diagramCode.trim()) {
      setSvg('');
      setError(null);
      return;
    }

    // Security: Reject suspiciously large or malicious content
    if (diagramCode.length > 50000) {
      setError('Diagram code too large');
      setSvg('');
      return;
    }

    // Security: Block obvious XSS patterns
    if (/javascript:|onclick|onerror|<script/i.test(diagramCode)) {
      setError('Potentially malicious content detected');
      setSvg('');
      return;
    }

    try {
      // Valider la syntaxe
      await mermaid.parse(diagramCode);

      // Rendre le SVG
      const { svg: renderedSvg } = await mermaid.render(idRef.current, diagramCode);

      // Security: Sanitize SVG output with DOMPurify
      const sanitizedSvg = DOMPurify.sanitize(renderedSvg, PURIFY_CONFIG);
      setSvg(sanitizedSvg);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de syntaxe Mermaid';
      // Nettoyer le message d'erreur pour le rendre plus lisible
      const cleanError = errorMessage
        .replace(/Syntax error in.*?mermaid version.*?\n/g, '')
        .replace(/Parse error on line \d+:/g, 'Ligne ')
        .trim();
      setError(cleanError || 'Erreur de syntaxe');
      setSvg('');
    }
  }, []);

  // Rendre le diagramme quand le code change
  useEffect(() => {
    if (!isEditing) {
      renderDiagram(code);
    }
  }, [code, isEditing, renderDiagram]);

  // Focus sur le textarea en mode édition
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  // Synchroniser editValue quand le code change
  useEffect(() => {
    setEditValue(code);
  }, [code]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    if (editValue !== code) {
      updateAttributes({ code: editValue });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter pour sauvegarder
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
    // Escape pour annuler
    if (e.key === 'Escape') {
      setEditValue(code);
      setIsEditing(false);
    }
    // Tab pour indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = editValue.substring(0, start) + '  ' + editValue.substring(end);
        setEditValue(newValue);
        // Repositionner le curseur
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    }
  };

  if (isEditing) {
    return (
      <NodeViewWrapper className="mermaid-editor my-4">
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted border-b border-border">
            <span className="text-sm font-medium text-muted-foreground">
              Diagramme Mermaid
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditValue(code);
                  setIsEditing(false);
                }}
                className="text-xs px-2 py-1 rounded hover:bg-background transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
          {/* Editor */}
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[200px] p-4 font-mono text-sm bg-background resize-y focus:outline-none"
            placeholder={`flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[OK]
    B -->|No| D[Cancel]`}
            spellCheck={false}
          />
          <div className="px-3 py-2 bg-muted border-t border-border text-xs text-muted-foreground">
            Ctrl+Entrée pour sauvegarder, Échap pour annuler
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={`
        mermaid-render my-4 cursor-pointer
        ${selected ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''}
      `}
      onDoubleClick={handleDoubleClick}
      title="Double-clic pour éditer"
    >
      <div
        ref={containerRef}
        className="border border-border rounded-lg overflow-hidden bg-background"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted border-b border-border">
          <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className="text-sm font-medium text-muted-foreground">Mermaid</span>
        </div>

        {/* Content */}
        <div className="p-4">
          {error ? (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <div className="font-medium">Erreur de syntaxe</div>
                <pre className="mt-1 text-xs whitespace-pre-wrap">{error}</pre>
              </div>
            </div>
          ) : svg ? (
            <div
              className="mermaid-svg flex justify-center"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">Diagramme vide</p>
              <p className="text-xs mt-1">Double-clic pour ajouter du code Mermaid</p>
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}
