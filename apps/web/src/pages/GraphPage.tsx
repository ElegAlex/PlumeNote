// ===========================================
// Page Graph de Connaissances (US-032)
// ===========================================

import { useState, useEffect, useRef } from 'react';
import { GraphView } from '../components/graph/GraphView';

export function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight - 60, // Account for header
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div ref={containerRef} className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-xl font-bold">Graph de Connaissances</h1>
          <p className="text-sm text-muted-foreground">
            Visualisez les connexions entre vos notes
          </p>
        </div>
      </div>

      <div className="flex-1 p-4">
        <GraphView width={dimensions.width - 32} height={dimensions.height} />
      </div>
    </div>
  );
}
