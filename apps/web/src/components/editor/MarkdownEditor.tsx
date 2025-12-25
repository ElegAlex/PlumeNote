// ===========================================
// Éditeur Markdown style Obsidian (CodeMirror 6)
// ===========================================

import React, { useEffect, useRef, useCallback, useState, useId } from 'react';
import { EditorState } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { EditorView, keymap, drawSelection, dropCursor, placeholder as placeholderExt } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput, HighlightStyle } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { tags } from '@lezer/highlight';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import mermaid from 'mermaid';
import { cn } from '../../lib/utils';
import { ImageUploadDialog } from './ImageUploadDialog';

// ===========================================
// Initialisation Mermaid
// ===========================================

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'inherit',
  themeVariables: {
    fontSize: '14px',
  },
});

// Helper: retire le frontmatter YAML pour le mode visualisation
function stripFrontmatter(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

// ===========================================
// Composant Mermaid
// ===========================================

function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const renderCount = useRef(0);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code.trim()) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      renderCount.current += 1;
      const currentRender = renderCount.current;

      try {
        // Générer un ID unique pour chaque rendu
        const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Nettoyer le code (enlever les espaces en trop au début)
        const cleanCode = code.trim();

        const { svg: renderedSvg } = await mermaid.render(uniqueId, cleanCode);

        // Vérifier qu'on est toujours sur le bon rendu
        if (currentRender === renderCount.current) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        if (currentRender === renderCount.current) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(errorMessage);
          setSvg('');
          console.error('Mermaid render error:', err);
        }
      } finally {
        if (currentRender === renderCount.current) {
          setIsLoading(false);
        }
      }
    };

    renderDiagram();
  }, [code]);

  if (isLoading) {
    return (
      <div className="my-4 p-4 flex items-center justify-center text-muted-foreground">
        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
        Chargement du diagramme...
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-4 p-4 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium mb-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          Erreur Mermaid
        </div>
        <pre className="text-xs text-red-600 dark:text-red-400 overflow-auto whitespace-pre-wrap">{error}</pre>
        <details className="mt-2">
          <summary className="text-xs text-muted-foreground cursor-pointer">Voir le code source</summary>
          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">{code}</pre>
        </details>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 p-4 rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
        <div className="text-yellow-600 dark:text-yellow-400 text-sm">
          Diagramme vide ou non reconnu
        </div>
        <details className="mt-2">
          <summary className="text-xs text-muted-foreground cursor-pointer">Voir le code source</summary>
          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">{code}</pre>
        </details>
      </div>
    );
  }

  return (
    <div
      className="my-4 flex justify-center overflow-auto bg-white dark:bg-gray-900 rounded-lg p-4 not-prose"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// ===========================================
// Rendu des Callouts Obsidian
// ===========================================

// Icônes SVG style Obsidian pour les callouts
const calloutIcons: Record<string, React.ReactNode> = {
  NOTE: (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  ),
  TIP: (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2H10a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" />
      <path d="M9 21h6M10 17v4M14 17v4" />
    </svg>
  ),
  WARNING: (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  IMPORTANT: (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
    </svg>
  ),
  CAUTION: (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
  SUCCESS: (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <path d="M22 4L12 14.01l-3-3" />
    </svg>
  ),
  QUESTION: (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
    </svg>
  ),
  QUOTE: (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z" />
    </svg>
  ),
  INFO: (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
  ABSTRACT: (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 7h10M7 12h10M7 17h6" />
    </svg>
  ),
  TODO: (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  EXAMPLE: (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M9 15l2 2 4-4" />
    </svg>
  ),
  BUG: (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="8" y="6" width="8" height="14" rx="4" />
      <path d="M19 8l-3 2M5 8l3 2M19 16l-3-2M5 16l3-2M12 6V2M8.5 2h7" />
    </svg>
  ),
  DANGER: (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
  FAIL: (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  ),
};

// Couleurs style Obsidian (avec variables CSS)
const CALLOUT_COLORS: Record<string, { bg: string; accent: string; text: string }> = {
  NOTE: { bg: 'rgba(8, 109, 221, 0.1)', accent: 'rgb(8, 109, 221)', text: 'rgb(8, 109, 221)' },
  INFO: { bg: 'rgba(8, 109, 221, 0.1)', accent: 'rgb(8, 109, 221)', text: 'rgb(8, 109, 221)' },
  TIP: { bg: 'rgba(0, 191, 165, 0.1)', accent: 'rgb(0, 191, 165)', text: 'rgb(0, 191, 165)' },
  HINT: { bg: 'rgba(0, 191, 165, 0.1)', accent: 'rgb(0, 191, 165)', text: 'rgb(0, 191, 165)' },
  WARNING: { bg: 'rgba(236, 117, 0, 0.1)', accent: 'rgb(236, 117, 0)', text: 'rgb(236, 117, 0)' },
  ATTENTION: { bg: 'rgba(236, 117, 0, 0.1)', accent: 'rgb(236, 117, 0)', text: 'rgb(236, 117, 0)' },
  IMPORTANT: { bg: 'rgba(0, 191, 165, 0.1)', accent: 'rgb(0, 191, 165)', text: 'rgb(0, 191, 165)' },
  CAUTION: { bg: 'rgba(233, 49, 71, 0.1)', accent: 'rgb(233, 49, 71)', text: 'rgb(233, 49, 71)' },
  DANGER: { bg: 'rgba(233, 49, 71, 0.1)', accent: 'rgb(233, 49, 71)', text: 'rgb(233, 49, 71)' },
  SUCCESS: { bg: 'rgba(8, 185, 78, 0.1)', accent: 'rgb(8, 185, 78)', text: 'rgb(8, 185, 78)' },
  CHECK: { bg: 'rgba(8, 185, 78, 0.1)', accent: 'rgb(8, 185, 78)', text: 'rgb(8, 185, 78)' },
  DONE: { bg: 'rgba(8, 185, 78, 0.1)', accent: 'rgb(8, 185, 78)', text: 'rgb(8, 185, 78)' },
  QUESTION: { bg: 'rgba(236, 117, 0, 0.1)', accent: 'rgb(236, 117, 0)', text: 'rgb(236, 117, 0)' },
  HELP: { bg: 'rgba(236, 117, 0, 0.1)', accent: 'rgb(236, 117, 0)', text: 'rgb(236, 117, 0)' },
  FAQ: { bg: 'rgba(236, 117, 0, 0.1)', accent: 'rgb(236, 117, 0)', text: 'rgb(236, 117, 0)' },
  QUOTE: { bg: 'rgba(158, 158, 158, 0.1)', accent: 'rgb(158, 158, 158)', text: 'rgb(158, 158, 158)' },
  CITE: { bg: 'rgba(158, 158, 158, 0.1)', accent: 'rgb(158, 158, 158)', text: 'rgb(158, 158, 158)' },
  ABSTRACT: { bg: 'rgba(0, 176, 255, 0.1)', accent: 'rgb(0, 176, 255)', text: 'rgb(0, 176, 255)' },
  SUMMARY: { bg: 'rgba(0, 176, 255, 0.1)', accent: 'rgb(0, 176, 255)', text: 'rgb(0, 176, 255)' },
  TLDR: { bg: 'rgba(0, 176, 255, 0.1)', accent: 'rgb(0, 176, 255)', text: 'rgb(0, 176, 255)' },
  TODO: { bg: 'rgba(8, 109, 221, 0.1)', accent: 'rgb(8, 109, 221)', text: 'rgb(8, 109, 221)' },
  EXAMPLE: { bg: 'rgba(120, 82, 238, 0.1)', accent: 'rgb(120, 82, 238)', text: 'rgb(120, 82, 238)' },
  BUG: { bg: 'rgba(233, 49, 71, 0.1)', accent: 'rgb(233, 49, 71)', text: 'rgb(233, 49, 71)' },
  FAIL: { bg: 'rgba(233, 49, 71, 0.1)', accent: 'rgb(233, 49, 71)', text: 'rgb(233, 49, 71)' },
  FAILURE: { bg: 'rgba(233, 49, 71, 0.1)', accent: 'rgb(233, 49, 71)', text: 'rgb(233, 49, 71)' },
  MISSING: { bg: 'rgba(233, 49, 71, 0.1)', accent: 'rgb(233, 49, 71)', text: 'rgb(233, 49, 71)' },
};

// Mapping des alias vers les icônes principales
const CALLOUT_ICON_MAP: Record<string, string> = {
  NOTE: 'NOTE', INFO: 'INFO',
  TIP: 'TIP', HINT: 'TIP',
  WARNING: 'WARNING', ATTENTION: 'WARNING',
  IMPORTANT: 'IMPORTANT',
  CAUTION: 'CAUTION', DANGER: 'DANGER',
  SUCCESS: 'SUCCESS', CHECK: 'SUCCESS', DONE: 'SUCCESS',
  QUESTION: 'QUESTION', HELP: 'QUESTION', FAQ: 'QUESTION',
  QUOTE: 'QUOTE', CITE: 'QUOTE',
  ABSTRACT: 'ABSTRACT', SUMMARY: 'ABSTRACT', TLDR: 'ABSTRACT',
  TODO: 'TODO',
  EXAMPLE: 'EXAMPLE',
  BUG: 'BUG',
  FAIL: 'FAIL', FAILURE: 'FAIL', MISSING: 'FAIL',
};

function parseCallout(text: string): { type: string; title: string; content: string } | null {
  // Nettoyer le texte des balises <p> générées par ReactMarkdown
  const cleanText = text.replace(/<\/?p>/g, '').trim();
  const match = cleanText.match(/^\[!(\w+)\](?:\s+(.+))?\n?([\s\S]*)/);
  if (!match) return null;
  return {
    type: match[1]!.toUpperCase(),
    title: match[2] || match[1]!.charAt(0).toUpperCase() + match[1]!.slice(1).toLowerCase(),
    content: match[3]?.trim() || '',
  };
}

function CalloutBlock({ children }: { children: React.ReactNode }) {
  // Extraire le texte brut des children
  const extractText = (node: React.ReactNode): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (React.isValidElement<{ children?: React.ReactNode }>(node) && node.props) {
      return extractText(node.props.children);
    }
    return '';
  };

  const text = extractText(children);
  const callout = parseCallout(text);

  if (!callout) {
    return (
      <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-4">
        {children}
      </blockquote>
    );
  }

  const colors = CALLOUT_COLORS[callout.type] ?? CALLOUT_COLORS.NOTE;
  const iconKey = CALLOUT_ICON_MAP[callout.type] || 'NOTE';
  const icon = calloutIcons[iconKey] || calloutIcons.NOTE;

  return (
    <div
      className="my-4 rounded-md overflow-hidden"
      style={{
        backgroundColor: colors?.bg,
        borderLeft: `4px solid ${colors?.accent}`,
      }}
    >
      {/* Header style Obsidian */}
      <div
        className="flex items-center gap-2 px-4 py-2 font-medium text-sm"
        style={{ color: colors?.text }}
      >
        <span className="flex-shrink-0">{icon}</span>
        <span className="flex-1 font-semibold">{callout.title}</span>
        {/* Chevron (indicateur de pliage, ici juste visuel) */}
        <svg
          className="h-4 w-4 opacity-60 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      {/* Contenu */}
      {callout.content && (
        <div className="px-4 pb-3 pt-0 text-sm leading-relaxed">
          {callout.content.split('\n').map((line, i) => (
            <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================
// Thème CodeMirror
// ===========================================

const createTheme = (fullWidth: boolean) => EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '16px',
    backgroundColor: 'transparent',
    color: 'var(--foreground)',
  },
  '.cm-content': {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: '2rem 1rem',
    caretColor: 'hsl(var(--primary))',
    maxWidth: fullWidth ? '100%' : '65ch',
    margin: '0 auto',
    lineHeight: '1.75',
  },
  '.cm-line': {
    padding: '0.125rem 0',
  },
  '.cm-cursor': {
    borderLeftColor: 'hsl(var(--primary))',
    borderLeftWidth: '2px',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '.cm-gutters': {
    display: 'none',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'hsl(var(--primary) / 0.15) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'hsl(var(--primary) / 0.25) !important',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'inherit',
  },
  '.cm-placeholder': {
    color: 'hsl(var(--muted-foreground))',
    fontStyle: 'italic',
  },
});

// Highlight style pour Markdown
const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '1.875em', fontWeight: '700', lineHeight: '1.3' },
  { tag: tags.heading2, fontSize: '1.5em', fontWeight: '600', lineHeight: '1.35' },
  { tag: tags.heading3, fontSize: '1.25em', fontWeight: '600', lineHeight: '1.4' },
  { tag: tags.heading4, fontSize: '1.125em', fontWeight: '600' },
  { tag: tags.heading5, fontSize: '1em', fontWeight: '600' },
  { tag: tags.heading6, fontSize: '0.875em', fontWeight: '600', color: 'hsl(var(--muted-foreground))' },
  { tag: tags.strong, fontWeight: '600' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through', opacity: '0.7' },
  { tag: tags.monospace, fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '0.9em', backgroundColor: 'hsl(var(--muted) / 0.5)', borderRadius: '4px', padding: '2px 6px' },
  { tag: tags.link, color: 'hsl(var(--primary))', textDecoration: 'underline', textUnderlineOffset: '2px' },
  { tag: tags.url, color: 'hsl(var(--primary) / 0.7)', fontSize: '0.9em' },
  { tag: tags.quote, fontStyle: 'italic', color: 'hsl(var(--muted-foreground))' },
  { tag: tags.processingInstruction, color: 'hsl(var(--muted-foreground) / 0.5)' },
  { tag: tags.meta, color: 'hsl(var(--muted-foreground) / 0.5)' },
]);

// ===========================================
// Types
// ===========================================

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: (content: string) => Promise<void>;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  autoFocus?: boolean;
  /** Callback when a wikilink is clicked in preview mode */
  onWikilinkClick?: (target: string, section?: string) => void;
  /** Whether the user can edit (for checkbox interaction in preview) */
  canWrite?: boolean;
  /** Note ID for image uploads (required for upload functionality) */
  noteId?: string;
}

// ===========================================
// Wikilink Parser & Renderer
// ===========================================

interface ParsedWikilink {
  target: string;
  alias?: string;
  section?: string;
  displayText: string;
}

function parseWikilink(content: string): ParsedWikilink {
  const pipeIndex = content.indexOf('|');
  let mainPart = content;
  let alias: string | undefined;

  if (pipeIndex !== -1) {
    mainPart = content.substring(0, pipeIndex);
    alias = content.substring(pipeIndex + 1).trim();
  }

  const hashIndex = mainPart.indexOf('#');
  let target = mainPart;
  let section: string | undefined;

  if (hashIndex !== -1) {
    target = mainPart.substring(0, hashIndex);
    section = mainPart.substring(hashIndex + 1).trim();
  }

  target = target.trim();

  let displayText: string;
  if (alias) {
    displayText = alias;
  } else if (section && !target) {
    displayText = section;
  } else if (section) {
    displayText = `${target} > ${section}`;
  } else {
    displayText = target;
  }

  return { target, alias, section, displayText };
}

/**
 * Renders text with wikilinks as clickable spans
 */
function renderTextWithWikilinks(
  text: string,
  onWikilinkClick?: (target: string, section?: string) => void
): React.ReactNode[] {
  if (!text) return [text];

  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = wikilinkRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const parsed = parseWikilink(match[1]!);

    // Add clickable wikilink
    parts.push(
      <span
        key={`wikilink-${match.index}`}
        className="wikilink text-primary cursor-pointer hover:underline"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onWikilinkClick?.(parsed.target, parsed.section);
        }}
        title={`${parsed.target}${parsed.section ? '#' + parsed.section : ''}`}
      >
        {parsed.displayText}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// ===========================================
// Icônes SVG
// ===========================================

const icons = {
  bold: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
      <path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
    </svg>
  ),
  italic: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  ),
  strikethrough: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M16 4H9a3 3 0 000 6h6" />
      <path d="M8 20h7a3 3 0 000-6H9" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  ),
  code: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  ),
  link: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  ),
  image: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  h1: <span className="text-xs font-bold">H1</span>,
  h2: <span className="text-xs font-bold">H2</span>,
  h3: <span className="text-xs font-bold">H3</span>,
  bulletList: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="5" cy="6" r="1.5" fill="currentColor" />
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="5" cy="18" r="1.5" fill="currentColor" />
    </svg>
  ),
  orderedList: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="10" y1="6" x2="20" y2="6" />
      <line x1="10" y1="12" x2="20" y2="12" />
      <line x1="10" y1="18" x2="20" y2="18" />
      <text x="4" y="8" fontSize="7" fontWeight="bold" fill="currentColor" stroke="none">1</text>
      <text x="4" y="14" fontSize="7" fontWeight="bold" fill="currentColor" stroke="none">2</text>
      <text x="4" y="20" fontSize="7" fontWeight="bold" fill="currentColor" stroke="none">3</text>
    </svg>
  ),
  taskList: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="5" width="6" height="6" rx="1" />
      <path d="M5 8l1.5 1.5L9 7" strokeWidth={1.5} />
      <line x1="12" y1="8" x2="21" y2="8" />
      <rect x="3" y="14" width="6" height="6" rx="1" />
      <line x1="12" y1="17" x2="21" y2="17" />
    </svg>
  ),
  quote: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z" />
    </svg>
  ),
  codeBlock: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  horizontalRule: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  ),
  callout: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  undo: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  ),
  redo: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
    </svg>
  ),
  edit: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  preview: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  expand: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  ),
  shrink: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 6h16M8 12h8M6 18h12" />
    </svg>
  ),
  properties: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 6h16M4 12h16M4 18h10" />
      <circle cx="19" cy="18" r="2" />
    </svg>
  ),
};

// ===========================================
// Bouton Toolbar
// ===========================================

interface ToolbarButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  active?: boolean;
  disabled?: boolean;
}

function ToolbarButton({ onClick, icon, title, active, disabled }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'h-8 w-8 flex items-center justify-center rounded transition-colors',
        'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        active && 'bg-muted text-primary',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {icon}
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="w-px h-6 bg-border mx-1" />;
}

// ===========================================
// Composant principal
// ===========================================

// Types de callouts Obsidian pour le menu
const CALLOUT_TYPES = [
  { type: 'NOTE', label: 'Note' },
  { type: 'TIP', label: 'Astuce' },
  { type: 'WARNING', label: 'Attention' },
  { type: 'IMPORTANT', label: 'Important' },
  { type: 'CAUTION', label: 'Prudence' },
  { type: 'DANGER', label: 'Danger' },
  { type: 'SUCCESS', label: 'Succès' },
  { type: 'QUESTION', label: 'Question' },
  { type: 'QUOTE', label: 'Citation' },
  { type: 'ABSTRACT', label: 'Résumé' },
  { type: 'TODO', label: 'À faire' },
  { type: 'EXAMPLE', label: 'Exemple' },
  { type: 'BUG', label: 'Bug' },
  { type: 'FAIL', label: 'Échec' },
] as const;

const API_BASE = '/api/v1';
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

export function MarkdownEditor({
  content,
  onChange,
  onSave,
  placeholder = 'Commencez à écrire...',
  readOnly = false,
  className,
  autoFocus = true,
  onWikilinkClick,
  canWrite = true,
  noteId,
}: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [fullWidth, setFullWidth] = useState(false);
  const [localContent, setLocalContent] = useState(content);
  const [showCalloutMenu, setShowCalloutMenu] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploadingDrop, setIsUploadingDrop] = useState(false);

  // Compteur pour identifier les checkboxes en mode preview
  // On utilise un compteur qui se reset à chaque changement de contenu
  const checkboxCounterRef = useRef({ value: 0, contentHash: '' });

  /**
   * Toggle une checkbox dans le contenu markdown
   * Trouve la N-ième checkbox (- [ ] ou - [x]) et inverse son état
   */
  const toggleCheckbox = useCallback((index: number) => {
    if (!canWrite || readOnly) return;

    const checkboxRegex = /- \[([ xX])\]/g;
    let currentIndex = 0;
    let match;

    // Trouver la position de la checkbox à l'index donné
    while ((match = checkboxRegex.exec(localContent)) !== null) {
      if (currentIndex === index) {
        const isChecked = match[1]!.toLowerCase() === 'x';
        const newCheckbox = isChecked ? '- [ ]' : '- [x]';
        const newContent =
          localContent.substring(0, match.index) +
          newCheckbox +
          localContent.substring(match.index + match[0].length);

        setLocalContent(newContent);
        onChange(newContent);
        break;
      }
      currentIndex++;
    }
  }, [localContent, onChange, canWrite, readOnly]);

  // Sync content from props
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Callback de sauvegarde
  const handleSave = useCallback(async () => {
    if (onSave && viewRef.current) {
      await onSave(viewRef.current.state.doc.toString());
    }
  }, [onSave]);

  // ===========================================
  // Fonctions d'insertion Markdown
  // ===========================================

  const wrapSelection = useCallback((before: string, after: string) => {
    const view = viewRef.current;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to);

    view.dispatch({
      changes: { from, to, insert: `${before}${selectedText}${after}` },
      selection: { anchor: from + before.length, head: to + before.length },
    });
    view.focus();
  }, []);

  const insertAtLineStart = useCallback((prefix: string) => {
    const view = viewRef.current;
    if (!view) return;

    const { from } = view.state.selection.main;
    const line = view.state.doc.lineAt(from);

    view.dispatch({
      changes: { from: line.from, to: line.from, insert: prefix },
    });
    view.focus();
  }, []);

  const insertText = useCallback((text: string) => {
    const view = viewRef.current;
    if (!view) return;

    const { from, to } = view.state.selection.main;

    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
    });
    view.focus();
  }, []);

  const insertLink = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to) || 'texte';
    const linkText = `[${selectedText}](url)`;

    view.dispatch({
      changes: { from, to, insert: linkText },
      selection: { anchor: from + selectedText.length + 3, head: from + selectedText.length + 6 },
    });
    view.focus();
  }, []);

  const insertImage = useCallback(() => {
    // Si noteId est fourni, ouvrir le dialog d'upload
    if (noteId) {
      setShowImageDialog(true);
      return;
    }

    // Sinon, insérer le markdown basique
    const view = viewRef.current;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to) || 'description';
    const imageText = `![${selectedText}](url)`;

    view.dispatch({
      changes: { from, to, insert: imageText },
      selection: { anchor: from + selectedText.length + 4, head: from + selectedText.length + 7 },
    });
    view.focus();
  }, [noteId]);

  // Callback quand une image est insérée via le dialog
  const handleImageInserted = useCallback((markdown: string) => {
    const view = viewRef.current;
    if (!view) return;

    const { from, to } = view.state.selection.main;

    view.dispatch({
      changes: { from, to, insert: markdown },
      selection: { anchor: from + markdown.length },
    });
    view.focus();
  }, []);

  // Upload d'image par drag & drop
  const uploadDroppedImage = useCallback(async (file: File): Promise<string | null> => {
    if (!noteId) return null;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      console.warn('Type de fichier non supporté:', file.type);
      return null;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      console.warn('Fichier trop volumineux');
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/attachments/upload?noteId=${noteId}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.url) {
          const alt = file.name.replace(/\.[^.]+$/, '');
          return `![${alt}](${data.data.url})`;
        }
      }
    } catch (err) {
      console.error('Erreur upload image:', err);
    }
    return null;
  }, [noteId]);

  // Handlers drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!noteId || readOnly) return;
    e.preventDefault();
    e.stopPropagation();

    // Vérifier si c'est un fichier image
    const hasImageFile = Array.from(e.dataTransfer.items).some(
      item => item.kind === 'file' && ACCEPTED_IMAGE_TYPES.includes(item.type)
    );
    if (hasImageFile) {
      setIsDraggingOver(true);
    }
  }, [noteId, readOnly]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (!noteId || readOnly || isUploadingDrop) return;

    const files = Array.from(e.dataTransfer.files).filter(
      file => ACCEPTED_IMAGE_TYPES.includes(file.type)
    );

    if (files.length === 0) return;

    setIsUploadingDrop(true);

    try {
      const markdownParts: string[] = [];

      for (const file of files) {
        const markdown = await uploadDroppedImage(file);
        if (markdown) {
          markdownParts.push(markdown);
        }
      }

      if (markdownParts.length > 0) {
        const view = viewRef.current;
        if (view) {
          const { from, to } = view.state.selection.main;
          const insertText = markdownParts.join('\n\n');
          view.dispatch({
            changes: { from, to, insert: insertText },
            selection: { anchor: from + insertText.length },
          });
          view.focus();
        }
      }
    } finally {
      setIsUploadingDrop(false);
    }
  }, [noteId, readOnly, isUploadingDrop, uploadDroppedImage]);

  const insertCallout = useCallback((type: string) => {
    const view = viewRef.current;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to) || 'Contenu du callout';
    const calloutText = `\n> [!${type}]\n> ${selectedText}\n`;

    view.dispatch({
      changes: { from, to, insert: calloutText },
    });
    view.focus();
    setShowCalloutMenu(false);
  }, []);

  const handleUndo = useCallback(() => {
    const view = viewRef.current;
    if (view) {
      undo(view);
      view.focus();
    }
  }, []);

  const handleRedo = useCallback(() => {
    const view = viewRef.current;
    if (view) {
      redo(view);
      view.focus();
    }
  }, []);

  const insertFrontmatter = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const content = view.state.doc.toString();
    if (content.startsWith('---')) {
      view.dispatch({ selection: { anchor: 4 } }); // Positionne après ---\n
    } else {
      view.dispatch({ changes: { from: 0, insert: '---\n\n---\n' }, selection: { anchor: 4 } });
    }
    view.focus();
  }, []);

  // Extensions CodeMirror
  const getExtensions = useCallback((): Extension[] => {
    return [
      history(),
      drawSelection(),
      dropCursor(),
      EditorView.lineWrapping,
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      syntaxHighlighting(markdownHighlightStyle),
      bracketMatching(),
      closeBrackets(),
      indentOnInput(),
      highlightSelectionMatches(),
      createTheme(fullWidth),
      placeholderExt(placeholder),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        ...closeBracketsKeymap,
        indentWithTab,
        // Actions
        { key: 'Mod-s', run: () => { handleSave(); return true; } },
        // Formatage texte
        { key: 'Mod-b', run: () => { wrapSelection('**', '**'); return true; } },
        { key: 'Mod-i', run: () => { wrapSelection('*', '*'); return true; } },
        { key: 'Mod-u', run: () => { wrapSelection('<u>', '</u>'); return true; } },
        { key: 'Mod-Shift-s', run: () => { wrapSelection('~~', '~~'); return true; } },
        { key: 'Mod-e', run: () => { wrapSelection('`', '`'); return true; } },
        { key: 'Mod-l', run: () => { insertLink(); return true; } },
        { key: 'Mod-Shift-h', run: () => { wrapSelection('==', '=='); return true; } },
        // Titres (Cmd+Alt+1/2/3/4/0)
        { key: 'Mod-Alt-1', run: () => { insertAtLineStart('# '); return true; } },
        { key: 'Mod-Alt-2', run: () => { insertAtLineStart('## '); return true; } },
        { key: 'Mod-Alt-3', run: () => { insertAtLineStart('### '); return true; } },
        { key: 'Mod-Alt-4', run: () => { insertAtLineStart('#### '); return true; } },
        { key: 'Mod-Alt-0', run: () => {
          // Retirer le préfixe de titre si présent
          const view = viewRef.current;
          if (!view) return true;
          const { from } = view.state.selection.main;
          const line = view.state.doc.lineAt(from);
          const lineText = line.text;
          const match = lineText.match(/^#{1,6}\s+/);
          if (match) {
            view.dispatch({ changes: { from: line.from, to: line.from + match[0].length, insert: '' } });
          }
          return true;
        }},
        // Listes (Cmd+Shift+7/8/9)
        { key: 'Mod-Shift-7', run: () => { insertAtLineStart('1. '); return true; } },
        { key: 'Mod-Shift-8', run: () => { insertAtLineStart('- '); return true; } },
        { key: 'Mod-Shift-9', run: () => { insertAtLineStart('- [ ] '); return true; } },
        // Blocs
        { key: 'Mod-Shift-b', run: () => { insertAtLineStart('> '); return true; } },
        { key: 'Mod-Shift-c', run: () => { insertText('```\n\n```'); return true; } },
        { key: 'Mod-Shift-i', run: () => { insertImage(); return true; } },
        { key: 'Mod-Shift-t', run: () => { insertText('| Col 1 | Col 2 | Col 3 |\n|-------|-------|-------|\n| A | B | C |\n'); return true; } },
        { key: 'Mod-Shift--', run: () => { insertText('\n---\n'); return true; } },
        { key: 'Mod-Shift-m', run: () => { wrapSelection('$', '$'); return true; } },
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newContent = update.state.doc.toString();
          setLocalContent(newContent);
          onChange(newContent);
        }
      }),
      EditorState.readOnly.of(readOnly),
    ];
  }, [onChange, handleSave, placeholder, readOnly, fullWidth, wrapSelection, insertLink, insertAtLineStart, insertText, insertImage]);

  // Initialisation de l'éditeur
  useEffect(() => {
    if (!editorRef.current || mode !== 'edit') return;

    const state = EditorState.create({
      doc: localContent,
      extensions: getExtensions(),
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    if (autoFocus) {
      view.focus();
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [mode, fullWidth]);

  // Mise à jour du contenu externe
  useEffect(() => {
    if (viewRef.current && mode === 'edit') {
      const currentContent = viewRef.current.state.doc.toString();
      if (content !== currentContent) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentContent.length, insert: content },
        });
      }
    }
  }, [content, mode]);

  const isEditMode = mode === 'edit';

  return (
    <div
      className={cn('relative h-full w-full flex flex-col', className)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg pointer-events-none">
          <div className="text-center">
            <svg className="h-12 w-12 mx-auto mb-2 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <p className="text-sm font-medium text-primary">Déposez l'image ici</p>
          </div>
        </div>
      )}

      {/* Upload indicator */}
      {isUploadingDrop && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80">
          <div className="text-center">
            <svg className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            <p className="text-sm text-muted-foreground">Upload en cours...</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30 flex-wrap">
        {/* Undo/Redo */}
        <ToolbarButton onClick={handleUndo} icon={icons.undo} title="Annuler (Ctrl+Z)" disabled={!isEditMode} />
        <ToolbarButton onClick={handleRedo} icon={icons.redo} title="Refaire (Ctrl+Y)" disabled={!isEditMode} />

        <ToolbarSeparator />

        {/* Text Formatting */}
        <ToolbarButton onClick={() => wrapSelection('**', '**')} icon={icons.bold} title="Gras (Ctrl+B)" disabled={!isEditMode} />
        <ToolbarButton onClick={() => wrapSelection('*', '*')} icon={icons.italic} title="Italique (Ctrl+I)" disabled={!isEditMode} />
        <ToolbarButton onClick={() => wrapSelection('~~', '~~')} icon={icons.strikethrough} title="Barré" disabled={!isEditMode} />
        <ToolbarButton onClick={() => wrapSelection('`', '`')} icon={icons.code} title="Code inline" disabled={!isEditMode} />

        <ToolbarSeparator />

        {/* Headers */}
        <ToolbarButton onClick={() => insertAtLineStart('# ')} icon={icons.h1} title="Titre 1" disabled={!isEditMode} />
        <ToolbarButton onClick={() => insertAtLineStart('## ')} icon={icons.h2} title="Titre 2" disabled={!isEditMode} />
        <ToolbarButton onClick={() => insertAtLineStart('### ')} icon={icons.h3} title="Titre 3" disabled={!isEditMode} />

        <ToolbarSeparator />

        {/* Lists */}
        <ToolbarButton onClick={() => insertAtLineStart('- ')} icon={icons.bulletList} title="Liste à puces" disabled={!isEditMode} />
        <ToolbarButton onClick={() => insertAtLineStart('1. ')} icon={icons.orderedList} title="Liste numérotée" disabled={!isEditMode} />
        <ToolbarButton onClick={() => insertAtLineStart('- [ ] ')} icon={icons.taskList} title="Liste de tâches" disabled={!isEditMode} />

        <ToolbarSeparator />

        {/* Blocks */}
        <ToolbarButton onClick={() => insertAtLineStart('> ')} icon={icons.quote} title="Citation" disabled={!isEditMode} />
        <ToolbarButton onClick={() => insertText('\n```\n\n```\n')} icon={icons.codeBlock} title="Bloc de code" disabled={!isEditMode} />
        <ToolbarButton onClick={() => insertText('\n---\n')} icon={icons.horizontalRule} title="Ligne horizontale" disabled={!isEditMode} />

        {/* Callout dropdown */}
        <div className="relative">
          <ToolbarButton
            onClick={() => setShowCalloutMenu(!showCalloutMenu)}
            icon={icons.callout}
            title="Callout (Obsidian)"
            disabled={!isEditMode}
            active={showCalloutMenu}
          />
          {showCalloutMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowCalloutMenu(false)}
              />
              <div className="absolute left-0 top-full mt-1 w-44 rounded-md border bg-popover shadow-lg z-20">
                <div className="py-1 max-h-64 overflow-y-auto">
                  {CALLOUT_TYPES.map(({ type, label }) => {
                    const iconKey = CALLOUT_ICON_MAP[type] || 'NOTE';
                    const icon = calloutIcons[iconKey];
                    const colors = CALLOUT_COLORS[type] ?? CALLOUT_COLORS.NOTE;
                    return (
                      <button
                        key={type}
                        type="button"
                        className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted flex items-center gap-2"
                        onClick={() => insertCallout(type)}
                      >
                        <span style={{ color: colors?.accent }}>{icon}</span>
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <ToolbarSeparator />

        {/* Links & Media */}
        <ToolbarButton onClick={insertLink} icon={icons.link} title="Lien (Ctrl+K)" disabled={!isEditMode} />
        <ToolbarButton onClick={insertImage} icon={icons.image} title="Image" disabled={!isEditMode} />
        <ToolbarButton onClick={insertFrontmatter} icon={icons.properties} title="Propriétés (Frontmatter)" disabled={!isEditMode} />

        {/* Spacer */}
        <div className="flex-1" />

        {/* View Controls */}
        <div className="flex items-center rounded-md border bg-background p-0.5">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-sm rounded transition-colors',
              mode === 'edit' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
            title="Mode édition"
          >
            {icons.edit}
            <span className="hidden md:inline">Édition</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-sm rounded transition-colors',
              mode === 'preview' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
            title="Mode visualisation"
          >
            {icons.preview}
            <span className="hidden md:inline">Visualisation</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setFullWidth(!fullWidth)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 text-sm rounded border transition-colors ml-1',
            fullWidth ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'
          )}
          title={fullWidth ? 'Largeur centrée' : 'Pleine largeur'}
        >
          {fullWidth ? icons.shrink : icons.expand}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {mode === 'edit' ? (
          <div ref={editorRef} className="h-full w-full" />
        ) : (
          <div
            className={cn(
              'prose prose-slate dark:prose-invert max-w-none p-8',
              'prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl',
              'prose-code:before:content-none prose-code:after:content-none',
              'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
              'prose-pre:bg-muted prose-pre:border',
              'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
              'prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-1',
              'prose-img:rounded-lg prose-img:shadow-md',
              !fullWidth && 'mx-auto',
              fullWidth ? 'w-full' : 'max-w-[65ch]'
            )}
          >
            {/* Reset checkbox counter before each render using content hash */}
            {(() => {
              const contentHash = localContent.length + ':' + localContent.substring(0, 50);
              if (checkboxCounterRef.current.contentHash !== contentHash) {
                checkboxCounterRef.current = { value: 0, contentHash };
              } else {
                checkboxCounterRef.current.value = 0;
              }
              return null;
            })()}
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                // Interactive checkboxes in preview mode
                input: (componentProps) => {
                  // Extract and IGNORE the default disabled from remarkGfm
                  const { type, checked, disabled: _ignored, node, ref: _ref, ...restProps } = componentProps;
                  if (type === 'checkbox') {
                    // Use modulo to handle React StrictMode double rendering
                    const totalCheckboxes = (localContent.match(/- \[[ xX]\]/g) || []).length;
                    const rawIndex = checkboxCounterRef.current.value++;
                    const currentIndex = rawIndex % totalCheckboxes;
                    const isInteractive = canWrite && !readOnly;
                    return (
                      <input
                        type="checkbox"
                        checked={checked || false}
                        onChange={() => toggleCheckbox(currentIndex)}
                        disabled={!isInteractive}
                        className={cn(
                          'h-4 w-4 rounded border-primary text-primary focus:ring-primary mr-2',
                          isInteractive && 'cursor-pointer hover:scale-110 transition-transform'
                        )}
                      />
                    );
                  }
                  return <input type={type} checked={checked} {...restProps} />;
                },
                blockquote: ({ children }) => <CalloutBlock>{children}</CalloutBlock>,
                // Render paragraphs with wikilinks support
                p: ({ children }) => {
                  const processChildren = (child: React.ReactNode): React.ReactNode => {
                    if (typeof child === 'string') {
                      return renderTextWithWikilinks(child, onWikilinkClick);
                    }
                    return child;
                  };

                  const processed = Array.isArray(children)
                    ? children.map((child, i) => (
                        <React.Fragment key={i}>{processChildren(child)}</React.Fragment>
                      ))
                    : processChildren(children);

                  return <p>{processed}</p>;
                },
                // Also handle text in list items, headings, etc.
                li: ({ children }) => {
                  const processChildren = (child: React.ReactNode): React.ReactNode => {
                    if (typeof child === 'string') {
                      return renderTextWithWikilinks(child, onWikilinkClick);
                    }
                    return child;
                  };

                  const processed = Array.isArray(children)
                    ? children.map((child, i) => (
                        <React.Fragment key={i}>{processChildren(child)}</React.Fragment>
                      ))
                    : processChildren(children);

                  return <li>{processed}</li>;
                },
                code: ({ className, children, ...props }) => {
                  const { ref, ...codeProps } = props as { ref?: unknown; [key: string]: unknown };
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  const codeString = String(children).replace(/\n$/, '');

                  // Rendu Mermaid
                  if (language === 'mermaid') {
                    return <MermaidBlock code={codeString} />;
                  }

                  // Code block avec syntaxe
                  if (language) {
                    return (
                      <div className="relative group">
                        <div className="absolute top-2 right-2 text-xs text-muted-foreground opacity-60">
                          {language}
                        </div>
                        <pre className="!mt-0">
                          <code className={className} {...codeProps}>
                            {children}
                          </code>
                        </pre>
                      </div>
                    );
                  }

                  // Inline code
                  return (
                    <code className={className} {...codeProps}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {stripFrontmatter(localContent) || '*Aucun contenu à afficher*'}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Dialog d'upload d'images */}
      {noteId && (
        <ImageUploadDialog
          open={showImageDialog}
          onOpenChange={setShowImageDialog}
          noteId={noteId}
          onImageInserted={handleImageInserted}
        />
      )}
    </div>
  );
}

export default MarkdownEditor;
