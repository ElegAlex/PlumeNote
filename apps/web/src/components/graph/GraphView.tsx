// ===========================================
// Vue du Graph de Connaissances (US-032)
// ===========================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

interface GraphNode {
  id: string;
  title: string;
  color?: string | null;
  connections?: number;
  isCenter?: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface GraphViewProps {
  noteId?: string; // Si fourni, affiche le graph local
  width?: number;
  height?: number;
}

export function GraphView({ noteId, width = 800, height = 600 }: GraphViewProps) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const nodesRef = useRef<GraphNode[]>([]);

  useEffect(() => {
    loadGraph();
  }, [noteId]);

  const loadGraph = async () => {
    setIsLoading(true);
    try {
      const endpoint = noteId
        ? `/graph/local/${noteId}?depth=2`
        : '/graph/global?limit=200';
      const response = await api.get<GraphData>(endpoint);

      // Initialize node positions
      const nodes = response.data.nodes.map((node, i) => ({
        ...node,
        x: width / 2 + Math.cos((i / response.data.nodes.length) * 2 * Math.PI) * 200,
        y: height / 2 + Math.sin((i / response.data.nodes.length) * 2 * Math.PI) * 200,
        vx: 0,
        vy: 0,
      }));

      nodesRef.current = nodes;
      setGraphData({ nodes, edges: response.data.edges });
    } catch {
      setGraphData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Force-directed layout simulation
  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0) return;

    let animationId: number;
    const nodes = nodesRef.current;
    const edges = graphData.edges;

    const simulate = () => {
      // Apply forces
      for (const node of nodes) {
        node.vx = node.vx || 0;
        node.vy = node.vy || 0;

        // Center gravity
        const centerForce = 0.01;
        node.vx += (width / 2 - node.x!) * centerForce;
        node.vy += (height / 2 - node.y!) * centerForce;

        // Repulsion from other nodes
        for (const other of nodes) {
          if (node.id === other.id) continue;
          const dx = node.x! - other.x!;
          const dy = node.y! - other.y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const repulsion = 500 / (dist * dist);
          node.vx += (dx / dist) * repulsion;
          node.vy += (dy / dist) * repulsion;
        }
      }

      // Attraction from edges
      for (const edge of edges) {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) continue;

        const dx = target.x! - source.x!;
        const dy = target.y! - source.y!;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const attraction = dist * 0.01;

        source.vx! += (dx / dist) * attraction;
        source.vy! += (dy / dist) * attraction;
        target.vx! -= (dx / dist) * attraction;
        target.vy! -= (dy / dist) * attraction;
      }

      // Update positions with damping
      for (const node of nodes) {
        node.vx! *= 0.8;
        node.vy! *= 0.8;
        node.x! += node.vx!;
        node.y! += node.vy!;

        // Bounds
        node.x = Math.max(50, Math.min(width - 50, node.x!));
        node.y = Math.max(50, Math.min(height - 50, node.y!));
      }

      render();
      animationId = requestAnimationFrame(simulate);
    };

    simulate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [graphData, width, height]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !graphData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodes = nodesRef.current;
    const edges = graphData.edges;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Apply zoom and offset
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Draw edges
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.lineWidth = 1;
    for (const edge of edges) {
      const source = nodes.find((n) => n.id === edge.source);
      const target = nodes.find((n) => n.id === edge.target);
      if (!source || !target) continue;

      ctx.beginPath();
      ctx.moveTo(source.x!, source.y!);
      ctx.lineTo(target.x!, target.y!);
      ctx.stroke();
    }

    // Draw nodes
    for (const node of nodes) {
      const size = node.isCenter ? 12 : Math.min(8 + (node.connections || 0), 16);
      const isHovered = hoveredNode?.id === node.id;

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, size, 0, Math.PI * 2);
      ctx.fillStyle = node.isCenter
        ? '#3B82F6'
        : node.color || (isHovered ? '#6366F1' : '#64748B');
      ctx.fill();

      if (isHovered || node.isCenter) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Node label
      if (isHovered || node.isCenter || nodes.length < 50) {
        ctx.fillStyle = '#1f2937';
        ctx.font = `${isHovered || node.isCenter ? '12px' : '10px'} sans-serif`;
        ctx.textAlign = 'center';
        const label = node.title.length > 20 ? node.title.slice(0, 20) + '...' : node.title;
        ctx.fillText(label, node.x!, node.y! + size + 12);
      }
    }

    ctx.restore();
  }, [graphData, hoveredNode, zoom, offset, width, height]);

  // Mouse handlers
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !graphData) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - offset.x) / zoom;
      const y = (e.clientY - rect.top - offset.y) / zoom;

      if (isDragging.current) {
        setOffset({
          x: offset.x + (e.clientX - dragStart.current.x),
          y: offset.y + (e.clientY - dragStart.current.y),
        });
        dragStart.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Find hovered node
      const nodes = nodesRef.current;
      let found: GraphNode | null = null;
      for (const node of nodes) {
        const dx = node.x! - x;
        const dy = node.y! - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 15) {
          found = node;
          break;
        }
      }
      setHoveredNode(found);
      canvas.style.cursor = found ? 'pointer' : 'grab';
    },
    [graphData, zoom, offset]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleClick = useCallback(() => {
    if (hoveredNode && !isDragging.current) {
      navigate(`/notes/${hoveredNode.id}`);
    }
  }, [hoveredNode, navigate]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.2, Math.min(3, z * delta)));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <svg
          className="h-16 w-16 mb-4 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
        <p>Aucune connexion trouvée</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Controls */}
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZoom((z) => Math.min(3, z * 1.2))}
        >
          +
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZoom((z) => Math.max(0.2, z / 1.2))}
        >
          -
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
        >
          Reset
        </Button>
      </div>

      {/* Tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-2 left-2 bg-popover border rounded-md px-3 py-2 shadow-lg z-10">
          <div className="font-medium text-sm">{hoveredNode.title}</div>
          {hoveredNode.connections !== undefined && (
            <div className="text-xs text-muted-foreground">
              {hoveredNode.connections} connexion{hoveredNode.connections > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="bg-background border rounded-lg"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />

      {/* Stats */}
      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
        {graphData.nodes.length} notes · {graphData.edges.length} liens
      </div>
    </div>
  );
}
