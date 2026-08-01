'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as d3Force from 'd3-force';
import * as d3Zoom from 'd3-zoom';
import * as d3Selection from 'd3-selection';
import * as d3Drag from 'd3-drag';
import type {
  ImpactNetworkData,
  NetworkNode,
  MergedPR,
  Org,
  CoContributor,
} from '@/types';
import { buildImpactNetwork } from '@/lib/impact-network';

interface ImpactNetworkProps {
  user: {
    login: string;
    name?: string | null;
    avatar_url?: string;
    html_url?: string;
    public_repos?: number;
    followers?: number;
    bio?: string | null;
  };
  repos?: Array<{
    name: string;
    stargazers_count?: number;
    forks_count?: number;
    language?: string | null;
    html_url?: string;
    description?: string | null;
  }>;
  orgs?: Org[];
  mergedPRs?: MergedPR[];
  coContributors?: CoContributor[];
}

export function ImpactNetwork({
  user,
  repos = [],
  orgs = [],
  mergedPRs = [],
  coContributors = [],
}: ImpactNetworkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  const [filterType, setFilterType] = useState<
    'all' | 'repo' | 'org' | 'collaborator'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);

  // Generate force graph data structure
  const rawData: ImpactNetworkData = useMemo(() => {
    return buildImpactNetwork({
      user,
      repos,
      orgs,
      mergedPRs,
      coContributors,
    });
  }, [user, repos, orgs, mergedPRs, coContributors]);

  // Filter nodes & edges based on user selections
  const filteredData = useMemo(() => {
    let nodes = rawData.nodes;
    if (filterType !== 'all') {
      nodes = nodes.filter(
        (n) => n.type === 'contributor' || n.type === filterType,
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      nodes = nodes.filter(
        (n) =>
          n.type === 'contributor' ||
          n.label.toLowerCase().includes(q) ||
          (n.details && n.details.toLowerCase().includes(q)),
      );
    }

    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = rawData.edges.filter((e) => {
      const sourceId = typeof e.source === 'object' ? e.source.id : e.source;
      const targetId = typeof e.target === 'object' ? e.target.id : e.target;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return { nodes, edges };
  }, [rawData, filterType, searchQuery]);

  // Handle D3 force layout rendering
  useEffect(() => {
    if (!svgRef.current || !gRef.current || filteredData.nodes.length === 0)
      return;

    const width = containerRef.current?.clientWidth || 800;
    const height = 520;

    // Deep clone nodes and links so D3 simulation doesn't mutate React state directly
    const nodes: (NetworkNode & d3Force.SimulationNodeDatum)[] =
      filteredData.nodes.map((n) => ({
        ...n,
      }));
    const links: (d3Force.SimulationLinkDatum<
      NetworkNode & d3Force.SimulationNodeDatum
    > & { weight: number })[] = filteredData.edges.map((e) => ({
      source: typeof e.source === 'object' ? e.source.id : e.source,
      target: typeof e.target === 'object' ? e.target.id : e.target,
      weight: e.weight,
    }));

    const svg = d3Selection.select(svgRef.current);
    const g = d3Selection.select(gRef.current);

    // Clear previous SVG content inside g
    g.selectAll('*').remove();

    // Zoom setup
    const zoomBehavior = d3Zoom
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);

    // Create D3 Force Simulation
    const simulation = d3Force
      .forceSimulation<NetworkNode & d3Force.SimulationNodeDatum>(nodes)
      .force(
        'link',
        d3Force
          .forceLink<NetworkNode & d3Force.SimulationNodeDatum, any>(links)
          .id((d) => d.id)
          .distance((d: any) => 90 - (d.weight || 1) * 4),
      )
      .force('charge', d3Force.forceManyBody().strength(-300))
      .force('center', d3Force.forceCenter(width / 2, height / 2))
      .force(
        'collide',
        d3Force.forceCollide<NetworkNode & d3Force.SimulationNodeDatum>(
          (d) => d.val + 14,
        ),
      );

    // Render Edges (Lines)
    const linkGroup = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', 'var(--color-hairline-strong, #3b82f640)')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: any) => Math.max(1, Math.min(6, d.weight)))
      .attr('stroke-dasharray', (d: any) =>
        d.target.type === 'collaborator' ? '4,4' : 'none',
      );

    // Render Nodes (Groups)
    const nodeGroup = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, NetworkNode & d3Force.SimulationNodeDatum>('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', (d) => `${d.label} (${d.type})`)
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => setHoveredNode(d))
      .on('mouseleave', () => setHoveredNode(null))
      .on('click', (_event, d) => {
        setSelectedNode(d);
        if (d.url) window.open(d.url, '_blank', 'noopener,noreferrer');
      })
      .on('keydown', (event, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (d.url) window.open(d.url, '_blank', 'noopener,noreferrer');
        }
      });

    // Add Drag functionality to nodes
    const dragBehavior = d3Drag
      .drag<SVGGElement, NetworkNode & d3Force.SimulationNodeDatum>()
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
      });

    nodeGroup.call(dragBehavior as any);

    // Node Outer Glow / Circle
    nodeGroup
      .append('circle')
      .attr('r', (d) => d.val)
      .attr('fill', (d) => d.color)
      .attr('stroke', 'var(--color-canvas, #121212)')
      .attr('stroke-width', 2.5)
      .attr('box-shadow', '0 4px 12px rgba(0,0,0,0.2)');

    // Node Labels
    nodeGroup
      .append('text')
      .text((d) => (d.label.length > 14 ? `${d.label.slice(0, 12)}…` : d.label))
      .attr('dy', (d) => d.val + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--color-ink, #ffffff)')
      .attr('font-size', (d) => (d.type === 'contributor' ? '13px' : '11px'))
      .attr('font-weight', (d) => (d.type === 'contributor' ? '600' : '500'))
      .attr('pointer-events', 'none');

    // Simulation tick callback
    simulation.on('tick', () => {
      linkGroup
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeGroup.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [filteredData]);

  // Zoom control handlers
  const handleZoom = useCallback((factor: number) => {
    if (!svgRef.current) return;
    const svg = d3Selection.select(svgRef.current);
    svg.call(d3Zoom.zoom<SVGSVGElement, unknown>().scaleBy as any, factor);
  }, []);

  const handleResetZoom = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3Selection.select(svgRef.current);
    svg.call(
      d3Zoom.zoom<SVGSVGElement, unknown>().transform as any,
      d3Zoom.zoomIdentity,
    );
  }, []);

  const activeTooltipNode = hoveredNode || selectedNode;

  return (
    <div
      ref={containerRef}
      style={{
        marginTop: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Filter and Control Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: 'var(--color-canvas-soft)',
          border: '1px solid var(--color-hairline)',
          borderRadius: '10px',
        }}
      >
        {/* Node Type Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'All Connections' },
            { key: 'repo', label: 'Repositories', color: '#60a5fa' },
            { key: 'org', label: 'Organizations', color: '#c084fc' },
            { key: 'collaborator', label: 'Collaborators', color: '#fbbf24' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterType(tab.key as any)}
              style={{
                fontSize: '12px',
                fontWeight: filterType === tab.key ? 600 : 400,
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor:
                  filterType === tab.key
                    ? 'var(--color-hairline-strong)'
                    : 'transparent',
                backgroundColor:
                  filterType === tab.key
                    ? 'var(--color-canvas)'
                    : 'transparent',
                color:
                  filterType === tab.key
                    ? 'var(--color-ink)'
                    : 'var(--color-ink-mute)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.color && (
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: tab.color,
                  }}
                />
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input and Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              borderRadius: '6px',
              border: '1px solid var(--color-hairline-strong)',
              backgroundColor: 'var(--color-canvas)',
              color: 'var(--color-ink)',
              outline: 'none',
              width: '140px',
            }}
            aria-label="Search network nodes"
          />

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={() => handleZoom(1.2)}
              title="Zoom In"
              style={{
                padding: '4px 8px',
                fontSize: '13px',
                borderRadius: '4px',
                border: '1px solid var(--color-hairline)',
                backgroundColor: 'var(--color-canvas)',
                color: 'var(--color-ink)',
                cursor: 'pointer',
              }}
            >
              +
            </button>
            <button
              type="button"
              onClick={() => handleZoom(0.8)}
              title="Zoom Out"
              style={{
                padding: '4px 8px',
                fontSize: '13px',
                borderRadius: '4px',
                border: '1px solid var(--color-hairline)',
                backgroundColor: 'var(--color-canvas)',
                color: 'var(--color-ink)',
                cursor: 'pointer',
              }}
            >
              -
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset View"
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                borderRadius: '4px',
                border: '1px solid var(--color-hairline)',
                backgroundColor: 'var(--color-canvas)',
                color: 'var(--color-ink)',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '520px',
          borderRadius: '12px',
          border: '1px solid var(--color-hairline)',
          backgroundColor: 'var(--color-canvas-soft)',
          overflow: 'hidden',
        }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          role="graphics-document"
          aria-label="Contribution Impact Network Graph"
          style={{ width: '100%', height: '100%', cursor: 'grab' }}
        >
          <g ref={gRef} />
        </svg>

        {/* Legend Overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(18, 18, 18, 0.85)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '11px',
            color: '#e2e8f0',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#94a3b8',
            }}
          >
            Network Nodes
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#3ecf8e',
              }}
            />
            <span>Contributor</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#60a5fa',
              }}
            />
            <span>Repository</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#c084fc',
              }}
            />
            <span>Organization</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#fbbf24',
              }}
            />
            <span>Co-contributor</span>
          </div>
        </div>

        {/* Floating Tooltip Card */}
        {activeTooltipNode && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '240px',
              padding: '12px',
              borderRadius: '10px',
              backgroundColor: 'rgba(24, 24, 27, 0.95)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${activeTooltipNode.color}`,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              zIndex: 20,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: `${activeTooltipNode.color}25`,
                  color: activeTooltipNode.color,
                  border: `1px solid ${activeTooltipNode.color}`,
                }}
              >
                {activeTooltipNode.type}
              </span>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                Click to visit
              </span>
            </div>

            <div
              style={{
                fontWeight: 600,
                fontSize: '14px',
                color: '#ffffff',
                marginTop: '2px',
              }}
            >
              {activeTooltipNode.label}
            </div>

            {activeTooltipNode.details && (
              <p
                style={{
                  fontSize: '12px',
                  color: '#d1d5db',
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {activeTooltipNode.details}
              </p>
            )}

            {activeTooltipNode.statsText && (
              <div
                style={{
                  fontSize: '11px',
                  color: '#9ca3af',
                  marginTop: '4px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingTop: '6px',
                }}
              >
                {activeTooltipNode.statsText}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
