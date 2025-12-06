// ===========================================
// Resizer pour Split View
// Permet de redimensionner les panneaux
// ===========================================

import { useState, useCallback } from 'react';
import type { SplitDirection } from '../../stores/panesStore';
import { cn } from '../../lib/utils';

interface PaneResizerProps {
  direction: SplitDirection;
  onResize: (delta: number) => void;
}

export function PaneResizer({ direction, onResize }: PaneResizerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const isHorizontal = direction === 'horizontal';

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const startPos = isHorizontal ? e.clientX : e.clientY;
      let lastDelta = 0;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const currentPos = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
        const delta = currentPos - startPos;
        // Only update if delta changed significantly
        if (Math.abs(delta - lastDelta) > 2) {
          lastDelta = delta;
          onResize(delta);
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [isHorizontal, onResize]
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        'flex-shrink-0 bg-border hover:bg-primary/50 transition-colors z-10',
        isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize',
        isDragging && 'bg-primary'
      )}
    />
  );
}
