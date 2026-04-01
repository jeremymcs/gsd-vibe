// VCCA - Knowledge Graph Table View Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { buildKnowledgeGraph, KnowledgeGraphNode, KnowledgeGraphEdge } from '@/lib/tauri';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Search, X, FileText, Network } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KnowledgeGraphTableProps {
  projectPath: string;
  onSelectFile: (filePath: string) => void;
}

type TableView = 'nodes' | 'edges';

export function KnowledgeGraphTable({ projectPath, onSelectFile }: KnowledgeGraphTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<TableView>('nodes');

  const {
    data: graphData,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.knowledgeGraph(projectPath),
    queryFn: () => buildKnowledgeGraph(projectPath),
    enabled: !!projectPath,
    staleTime: 60000,
  });

  // Filter nodes based on search query
  const filteredNodes = useMemo(() => {
    if (!graphData?.nodes) return [];
    if (!searchQuery.trim()) return graphData.nodes;

    const query = searchQuery.toLowerCase();
    return graphData.nodes.filter(
      (node) =>
        node.label.toLowerCase().includes(query) ||
        node.file_path.toLowerCase().includes(query) ||
        node.node_type.toLowerCase().includes(query)
    );
  }, [graphData?.nodes, searchQuery]);

  // Filter edges based on search query
  const filteredEdges = useMemo(() => {
    if (!graphData?.edges) return [];
    if (!searchQuery.trim()) return graphData.edges;

    const query = searchQuery.toLowerCase();
    return graphData.edges.filter(
      (edge) =>
        edge.source.toLowerCase().includes(query) ||
        edge.target.toLowerCase().includes(query) ||
        (edge.label && edge.label.toLowerCase().includes(query))
    );
  }, [graphData?.edges, searchQuery]);

  // Get node label by ID for edge display
  const getNodeLabel = (nodeId: string): string => {
    const node = graphData?.nodes.find((n) => n.id === nodeId);
    return node?.label || nodeId;
  };

  // Get file path from node ID for edge navigation
  const getNodeFilePath = (nodeId: string): string => {
    const node = graphData?.nodes.find((n) => n.id === nodeId);
    return node?.file_path || '';
  };

  const handleFilePathClick = (filePath: string) => {
    if (filePath) {
      onSelectFile(filePath);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm">Failed to load knowledge graph data</p>
      </div>
    );
  }

  if (!graphData || (graphData.nodes.length === 0 && graphData.edges.length === 0)) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <p className="text-sm">No knowledge graph data available</p>
        <p className="text-xs mt-1">
          Add cross-references between knowledge files to see connections
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 border-b border-border/50 bg-card/50 flex-shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${view}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={clearSearch}
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant={view === 'nodes' ? 'default' : 'outline'}
            size="sm"
            className="gap-1"
            onClick={() => setView('nodes')}
          >
            <FileText className="h-4 w-4" />
            Nodes ({filteredNodes.length})
          </Button>
          <Button
            variant={view === 'edges' ? 'default' : 'outline'}
            size="sm"
            className="gap-1"
            onClick={() => setView('edges')}
          >
            <Network className="h-4 w-4" />
            Edges ({filteredEdges.length})
          </Button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        {view === 'nodes' ? (
          <table className="w-full">
            <thead className="sticky top-0 bg-background z-10 border-b">
              <tr>
                <th className="text-left font-medium px-4 py-3 text-sm text-muted-foreground">Label</th>
                <th className="text-left font-medium px-4 py-3 text-sm text-muted-foreground">File Path</th>
                <th className="text-left font-medium px-4 py-3 text-sm text-muted-foreground">Type</th>
              </tr>
            </thead>
            <tbody>
              {filteredNodes.map((node: KnowledgeGraphNode) => (
                <tr key={node.id} className="border-b hover:bg-muted/25 group">
                  <td className="px-4 py-3 font-medium">{node.label}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleFilePathClick(node.file_path)}
                      className={cn(
                        "text-left text-primary hover:underline hover:text-primary/80",
                        "truncate block max-w-64"
                      )}
                      title={node.file_path}
                    >
                      {node.file_path}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs">
                      {node.node_type}
                    </Badge>
                  </td>
                </tr>
              ))}
              {filteredNodes.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-muted-foreground py-8 px-4">
                    {searchQuery ? 'No nodes match your search' : 'No nodes available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-background z-10 border-b">
              <tr>
                <th className="text-left font-medium px-4 py-3 text-sm text-muted-foreground">Source</th>
                <th className="text-left font-medium px-4 py-3 text-sm text-muted-foreground">Target</th>
                <th className="text-left font-medium px-4 py-3 text-sm text-muted-foreground">Relationship</th>
              </tr>
            </thead>
            <tbody>
              {filteredEdges.map((edge: KnowledgeGraphEdge, index: number) => (
                <tr key={`${edge.source}-${edge.target}-${index}`} className="border-b hover:bg-muted/25 group">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleFilePathClick(getNodeFilePath(edge.source))}
                      className={cn(
                        "text-left text-primary hover:underline hover:text-primary/80",
                        "truncate block max-w-48"
                      )}
                      title={getNodeLabel(edge.source)}
                    >
                      {getNodeLabel(edge.source)}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleFilePathClick(getNodeFilePath(edge.target))}
                      className={cn(
                        "text-left text-primary hover:underline hover:text-primary/80",
                        "truncate block max-w-48"
                      )}
                      title={getNodeLabel(edge.target)}
                    >
                      {getNodeLabel(edge.target)}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {edge.label ? (
                      <Badge variant="outline" className="text-xs">
                        {edge.label}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredEdges.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-muted-foreground py-8 px-4">
                    {searchQuery ? 'No edges match your search' : 'No edges available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}