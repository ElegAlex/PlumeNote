// ===========================================
// Pane Container - Récursif pour Split View
// Gère la structure des panneaux divisés
// ===========================================

import { useCallback, useRef, useState, useEffect } from 'react';
import type { PaneNode } from '../../stores/panesStore';
import { usePanesStore } from '../../stores/panesStore';
import { EditorPane } from './EditorPane';
import { PaneResizer } from './PaneResizer';
import { cn } from '../../lib/utils';

interface PaneContainerProps {
  node: PaneNode;
}

export function PaneContainer({ node }: PaneContainerProps) {
  const updateRatio = usePanesStore((s) => s.updateRatio);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Track container size for ratio calculations
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Handle resize
  const handleResize = useCallback(
    (delta: number) => {
      if (node.type !== 'split') return;

      const isHorizontal = node.direction === 'horizontal';
      const size = isHorizontal ? containerSize.width : containerSize.height;

      if (size === 0) return;

      const deltaRatio = delta / size;
      const newRatio = node.ratio + deltaRatio;

      updateRatio(node.id, newRatio);
    },
    [node, containerSize, updateRatio]
  );

  // Leaf node - render editor pane
  if (node.type === 'leaf') {
    return <EditorPane pane={node} />;
  }

  // Split node - render children with resizer
  const isHorizontal = node.direction === 'horizontal';
  const [first, second] = node.children;

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex h-full w-full',
        isHorizontal ? 'flex-row' : 'flex-col'
      )}
    >
      {/* First pane */}
      <div
        style={{
          [isHorizontal ? 'width' : 'height']: `${node.ratio * 100}%`,
        }}
        className="overflow-hidden flex-shrink-0"
      >
        <PaneContainer node={first} />
      </div>

      {/* Resizer */}
      <PaneResizer direction={node.direction} onResize={handleResize} />

      {/* Second pane */}
      <div
        style={{
          [isHorizontal ? 'width' : 'height']: `${(1 - node.ratio) * 100}%`,
        }}
        className="overflow-hidden flex-shrink-0"
      >
        <PaneContainer node={second} />
      </div>
    </div>
  );
}
