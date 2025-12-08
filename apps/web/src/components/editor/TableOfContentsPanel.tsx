// ===========================================
// Panneau Plan de la note (Table of Contents)
// Affiche les headings Markdown avec navigation
// ===========================================

import { useMemo, useState, useEffect } from 'react';
import { useRightPanelStore } from '../../stores/rightPanelStore';
import { cn } from '../../lib/utils';

interface TocItem {
  id: string;
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  line: number;
}

interface TableOfContentsPanelProps {
  content: string;
  onHeadingClick?: (line: number, headingText: string) => void;
}

/**
 * Parse le contenu Markdown pour extraire les headings
 */
function parseHeadings(content: string): TocItem[] {
  if (!content) return [];

  const lines = content.split('\n');
  const headings: TocItem[] = [];

  lines.forEach((line, index) => {
    // Match les headings Markdown (# à ######)
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1]!.length as 1 | 2 | 3 | 4 | 5 | 6;
      const text = match[2]!.trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      headings.push({
        id: `heading-${index}-${id}`,
        text,
        level,
        line: index + 1,
      });
    }
  });

  return headings;
}

export function TableOfContentsPanel({
  content,
  onHeadingClick,
}: TableOfContentsPanelProps) {
  const { isOpen, view, closePanel } = useRightPanelStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Parse les headings du contenu
  const toc = useMemo(() => parseHeadings(content), [content]);

  // Reset l'état actif quand le contenu change
  useEffect(() => {
    if (toc.length > 0 && toc[0]) {
      setActiveId(toc[0].id);
    } else {
      setActiveId(null);
    }
  }, [content]);

  if (!isOpen || view !== 'toc') return null;

  const handleClick = (item: TocItem) => {
    setActiveId(item.id);
    onHeadingClick?.(item.line, item.text);
  };

  return (
    <aside className="w-72 border-l bg-background flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h7"
            />
          </svg>
          <h3 className="font-medium text-sm">Plan</h3>
        </div>
        <button
          onClick={closePanel}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <nav className="flex-1 overflow-y-auto p-2">
        {toc.length === 0 ? (
          <p className="text-sm text-muted-foreground p-2 text-center">
            Aucun titre dans cette note
          </p>
        ) : (
          <ul className="space-y-0.5">
            {toc.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleClick(item)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded text-sm',
                    'hover:bg-muted transition-colors truncate',
                    activeId === item.id && 'bg-primary/10 text-primary font-medium'
                  )}
                  style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
                  title={item.text}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground opacity-60 w-5 flex-shrink-0">
                      H{item.level}
                    </span>
                    <span className="truncate">{item.text || 'Sans titre'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      {/* Stats */}
      {toc.length > 0 && (
        <div className="px-4 py-2 border-t text-xs text-muted-foreground">
          {toc.length} titre{toc.length > 1 ? 's' : ''}
        </div>
      )}
    </aside>
  );
}
