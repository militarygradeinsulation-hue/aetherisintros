// @ts-nocheck
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Filter,
  Users,
  Sparkles,
  Info,
  Maximize2,
  ChevronRight,
  User,
  Calculator,
} from 'lucide-react';
import { GraphNode, GraphLink, Person } from '../types';
import { INITIAL_GRAPH_NODES, INITIAL_GRAPH_LINKS } from '../dataStore';

interface NetworkGraphViewProps {
  initialNodes?: GraphNode[];
  initialLinks?: GraphLink[];
  onSelectPerson?: (person: Person) => void;
  people?: Person[];
  onOpenPredictiveInsights?: () => void;
}

const CLUSTERS = [
  { id: 'all', label: 'All Clusters', color: '#F2EEE6' },
  { id: 'capital', label: 'Capital & Syndicates', color: '#F5B027' },
  { id: 'aerospace', label: 'Deep Tech & Aerospace', color: '#C78522' },
  { id: 'sovereign', label: 'Sovereign Allocators', color: '#F5B027' },
  { id: 'ai_deeptech', label: 'AI & Photonics', color: '#FFC85C' },
  { id: 'enterprise', label: 'Enterprise Strategy', color: '#D7C29A' },
];

export const NetworkGraphView: React.FC<NetworkGraphViewProps> = ({
  initialNodes = INITIAL_GRAPH_NODES,
  initialLinks = INITIAL_GRAPH_LINKS,
  onSelectPerson,
  people = [],
  onOpenPredictiveInsights,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [activeNode, setActiveNode] = useState<GraphNode | null>(null);

  // Deep clone data to avoid mutation collisions with D3 simulation
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = initialNodes.map((n) => ({ ...n }));
    const links: GraphLink[] = initialLinks.map((l) => ({ ...l }));
    return { nodes, links };
  }, [initialNodes, initialLinks]);

  // Main D3 simulation effect
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 980;
    const height = Math.max(560, window.innerHeight - 260);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Define defs for patterns & filters
    const defs = svg.append('defs');

    // Glow filter
    const filter = defs.append('filter').attr('id', 'node-glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Container group for zoom & pan
    const g = svg.append('g').attr('class', 'graph-container');

    // Zoom setup
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 2.8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Initial center transform
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85));

    // Simulation setup
    const simulation = d3
      .forceSimulation<GraphNode>(graphData.nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(graphData.links)
          .id((d) => d.id)
          .distance((d) => (d.strength ? 120 - d.strength * 40 : 100))
      )
      .force('charge', d3.forceManyBody().strength(-380))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide().radius((d: any) => (d.val || 20) + 18));

    // Links group
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphData.links)
      .enter()
      .append('line')
      .attr('stroke', 'rgba(255, 255, 255, 0.12)')
      .attr('stroke-width', (d) => Math.max(1, d.strength * 2.5))
      .attr('stroke-dasharray', (d) => (d.relationshipType === 'advisory' ? '4,4' : 'none'));

    // Nodes group
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('.node')
      .data(graphData.nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Helper color mapping
    const getClusterColor = (cluster: string) => {
      const found = CLUSTERS.find((c) => c.id === cluster);
      return found ? found.color : '#F5B027';
    };

    // Node Outer Ring
    node
      .append('circle')
      .attr('r', (d) => (d.val || 20) + 4)
      .attr('fill', 'none')
      .attr('stroke', (d) => getClusterColor(d.cluster))
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.65)
      .attr('filter', 'url(#node-glow)');

    // Node Base Circle
    node
      .append('circle')
      .attr('r', (d) => d.val || 20)
      .attr('fill', '#12100C')
      .attr('stroke', (d) => getClusterColor(d.cluster))
      .attr('stroke-width', 2);

    // Inner Initials or Text
    node
      .append('text')
      .text((d) => {
        const parts = d.name.split(' ');
        return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : d.name.slice(0, 2);
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', '#F2EEE6')
      .attr('font-size', (d) => Math.max(9, (d.val || 20) * 0.45))
      .attr('font-family', 'Cormorant Garamond, serif')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none');

    // Status dot on node
    node
      .append('circle')
      .attr('r', 3)
      .attr('cx', (d) => (d.val || 20) * 0.7)
      .attr('cy', (d) => -(d.val || 20) * 0.7)
      .attr('fill', (d) => {
        if (d.engagement === 'active') return '#C78522';
        if (d.engagement === 'followup') return '#F5B027';
        return '#C78522';
      })
      .attr('stroke', '#12100C')
      .attr('stroke-width', 1);

    // Label under node
    node
      .append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('y', (d) => (d.val || 20) + 14)
      .attr('fill', '#F2EEE6')
      .attr('font-size', '10px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-weight', '500')
      .attr('pointer-events', 'none')
      .style('text-shadow', '0 2px 4px rgba(0,0,0,0.9)');

    // Company subtext under name
    node
      .append('text')
      .text((d) => d.company)
      .attr('text-anchor', 'middle')
      .attr('y', (d) => (d.val || 20) + 24)
      .attr('fill', 'rgba(242, 238, 230, 0.5)')
      .attr('font-size', '8px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('pointer-events', 'none');

    // Hover interactions
    node
      .on('mouseenter', (event, d) => {
        setHoveredNode(d);

        // Highlight connected links and nodes
        link
          .attr('stroke', (l: any) =>
            l.source.id === d.id || l.target.id === d.id ? '#F5B027' : 'rgba(255, 255, 255, 0.05)'
          )
          .attr('stroke-width', (l: any) =>
            l.source.id === d.id || l.target.id === d.id ? 2.5 : 1
          );

        node.attr('opacity', (n) => {
          if (n.id === d.id) return 1;
          const isNeighbor = graphData.links.some(
            (l: any) =>
              (l.source.id === d.id && l.target.id === n.id) ||
              (l.target.id === d.id && l.source.id === n.id)
          );
          return isNeighbor ? 0.9 : 0.25;
        });
      })
      .on('mouseleave', () => {
        setHoveredNode(null);
        link
          .attr('stroke', 'rgba(255, 255, 255, 0.12)')
          .attr('stroke-width', (l: any) => Math.max(1, l.strength * 2.5));
        node.attr('opacity', 1);
      })
      .on('click', (event, d) => {
        setActiveNode(d);
        // Find corresponding person object and select
        const matched = people.find(
          (p) => p.name.toLowerCase() === d.name.toLowerCase() || p.id === d.id
        );
        if (matched && onSelectPerson) {
          onSelectPerson(matched);
        } else if (onSelectPerson) {
          // Construct person for click target
          onSelectPerson({
            id: d.id,
            name: d.name,
            title: d.title,
            company: d.company,
            avatar: d.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
            connectionScore: d.connectionScore,
            scoreBreakdown: { recency: 90, frequency: 85, reciprocity: 88, mutuals: 90 },
            mutualsCount: 18,
            mutualAvatars: [],
            radarBucket: 'hot',
            engagement: d.engagement,
            email: `${d.name.toLowerCase().replace(' ', '.')}@${d.company.toLowerCase().replace(/[^a-z]/g, '')}.com`,
            lastTouchpoint: '3 days ago · Relationship Graph Touchpoint',
            touchpointType: 'Meeting',
          });
        }
      });

    // Tick updates
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData, people, onSelectPerson]);

  // Handle zoom buttons
  const handleZoom = (direction: 'in' | 'out' | 'reset') => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>();

    if (direction === 'in') {
      svg.transition().duration(250).call(zoom.scaleBy as any, 1.3);
    } else if (direction === 'out') {
      svg.transition().duration(250).call(zoom.scaleBy as any, 0.7);
    } else {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth || 980;
      const height = 560;
      svg
        .transition()
        .duration(350)
        .call(zoom.transform as any, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85));
    }
  };

  return (
    <div className="w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Top Header & Cluster Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-[#12100C] border border-white/10">
        <div>
          <div className="text-[10px] font-mono tracking-[0.25em] text-[#F5B027] uppercase font-bold">
            Interactive Topology
          </div>
          <h2 className="font-serif-editorial text-2xl sm:text-3xl text-[#F2EEE6] mt-0.5">
            Network Relationship Graph
          </h2>
          <p className="text-xs text-[#F2EEE6]/70 mt-1 font-sans">
            Force-directed clustering across venture syndicates, aerospace innovators, and sovereign mandates. Hover any node for algorithmic calculation breakdown.
          </p>
        </div>

        {/* Action Controls & Cluster Filter Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          {onOpenPredictiveInsights && (
            <button
              onClick={onOpenPredictiveInsights}
              className="px-3 py-1.5 rounded-lg bg-[#F5B027]/20 hover:bg-[#F5B027]/30 border border-[#F5B027]/50 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-sm"
              title="Run Predictive LLM Network Analysis"
            >
              <Sparkles size={13} className="text-[#F5B027]" />
              <span>Predictive LLM Insights</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            {CLUSTERS.map((c) => {
              const isSelected = selectedCluster === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCluster(c.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-white/15 text-white border border-white/30 font-semibold shadow-sm'
                      : 'bg-white/5 text-[#F2EEE6]/60 hover:text-white border border-transparent'
                  }`}
                >
                  {c.id !== 'all' && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                  )}
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Canvas Viewport with Controls Overlay */}
      <div
        ref={containerRef}
        className="relative w-full h-[620px] rounded-xl bg-[#12100C] border border-white/10 overflow-hidden shadow-2xl"
      >
        {/* Subtle grid background lines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* SVG Canvas */}
        <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Floating Controls (Top Left: Cluster Legend Stats) */}
        <div className="absolute top-4 left-4 p-3 rounded-lg bg-[#12100C]/85 backdrop-blur-md border border-white/10 text-xs font-mono text-[#F2EEE6]/80 space-y-1 pointer-events-none">
          <div className="text-[9px] uppercase tracking-wider text-[#F5B027] font-bold">
            Network Clusters
          </div>
          <div className="text-[11px] font-sans flex items-center gap-3">
            <span>{graphData.nodes.length} Nodes</span>
            <span>·</span>
            <span>{graphData.links.length} Bridges</span>
            <span>·</span>
            <span>5 Sectors</span>
          </div>
        </div>

        {/* Floating Controls (Top Right: Zoom Controls) */}
        <div className="absolute top-4 right-4 flex items-center gap-1 bg-[#12100C]/85 backdrop-blur-md p-1 rounded-lg border border-white/10 shadow-lg">
          <button
            onClick={() => handleZoom('in')}
            className="p-1.5 rounded hover:bg-white/10 text-[#F2EEE6] transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => handleZoom('out')}
            className="p-1.5 rounded hover:bg-white/10 text-[#F2EEE6] transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => handleZoom('reset')}
            className="p-1.5 rounded hover:bg-white/10 text-[#F2EEE6] transition-colors"
            title="Reset View"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Subtle, High-Editorial Tooltip on Hover explaining specific metric calculation */}
        {hoveredNode && (
          <div className="absolute bottom-4 left-4 max-w-sm p-4 rounded-xl bg-[#12100C]/95 backdrop-blur-xl border border-[#F5B027]/40 shadow-2xl text-xs space-y-2 pointer-events-none animate-in fade-in duration-150 z-30">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
              <span className="text-[9px] font-mono uppercase text-[#F5B027] font-semibold">
                {hoveredNode.clusterLabel}
              </span>
              <span className="text-[11px] font-mono text-[#C78522] font-bold tabular-nums">
                Index: {hoveredNode.connectionScore}/100
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-[#F2EEE6]">{hoveredNode.name}</div>
              <div className="text-[11px] text-[#F2EEE6]/70 font-serif-editorial">
                {hoveredNode.title} · {hoveredNode.company}
              </div>
            </div>

            {/* High-Editorial Calculation Explanation */}
            <div className="p-2 rounded bg-black/40 border border-white/5 space-y-1">
              <div className="text-[8.5px] font-mono text-[#F5B027] uppercase font-bold tracking-wider flex items-center gap-1">
                <Calculator size={10} />
                <span>Formula: 0.35R + 0.30F + 0.20ρ + 0.15M</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[8.5px] font-mono pt-1 text-[#F2EEE6]/80">
                <div className="flex justify-between">
                  <span className="text-white/50">Recency (R: 35%):</span>
                  <span className="text-[#C78522] font-semibold">
                    {Math.min(100, Math.round(hoveredNode.connectionScore * 1.03))}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Frequency (F: 30%):</span>
                  <span className="text-[#F5B027] font-semibold">
                    {Math.min(100, Math.round(hoveredNode.connectionScore * 0.97))}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Reciprocity (ρ: 20%):</span>
                  <span className="text-[#F2EEE6] font-semibold">
                    {Math.min(100, Math.round(hoveredNode.connectionScore * 0.99))}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Mutuals (M: 15%):</span>
                  <span className="text-[#F5B027] font-semibold">
                    {Math.min(100, Math.round(hoveredNode.connectionScore * 1.02))}%
                  </span>
                </div>
              </div>
              <p className="text-[8px] text-[#F2EEE6]/50 italic pt-0.5">
                Exponential half-life decay (λ=0.045) combined with syndicate degree centrality.
              </p>
            </div>

            <div className="pt-0.5 flex items-center justify-between text-[9px] font-mono text-[#F2EEE6]/50">
              <span className="capitalize">Engagement: {hoveredNode.engagement}</span>
              <span className="text-[#F5B027] font-medium">Click to inspect executive dossier →</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
