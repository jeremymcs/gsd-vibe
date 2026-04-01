// VCCA - Knowledge Graph Table Component Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KnowledgeGraphTable } from '../knowledge-graph-table';
import * as tauri from '@/lib/tauri';

// Mock the tauri module
vi.mock('@/lib/tauri');
const mockTauri = vi.mocked(tauri);

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

const mockGraphData = {
  nodes: [
    {
      id: 'node1',
      label: 'Test Node 1',
      file_path: '/test/path1.md',
      node_type: 'document',
    },
    {
      id: 'node2',
      label: 'Test Node 2',
      file_path: '/test/path2.md',
      node_type: 'heading',
    },
  ],
  edges: [
    {
      source: 'node1',
      target: 'node2',
      label: 'references',
    },
  ],
};

describe('KnowledgeGraphTable', () => {
  const mockOnSelectFile = vi.fn();
  const projectPath = '/test/project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    mockTauri.buildKnowledgeGraph.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { container } = renderWithQueryClient(
      <KnowledgeGraphTable projectPath={projectPath} onSelectFile={mockOnSelectFile} />
    );

    // Check for loading spinner by looking for the loader icon
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders empty state when no data is available', async () => {
    mockTauri.buildKnowledgeGraph.mockResolvedValue({ nodes: [], edges: [] });

    renderWithQueryClient(
      <KnowledgeGraphTable projectPath={projectPath} onSelectFile={mockOnSelectFile} />
    );

    await waitFor(() => {
      expect(screen.getByText(/No knowledge graph data available/i)).toBeDefined();
    });
  });

  it('renders nodes table by default', async () => {
    mockTauri.buildKnowledgeGraph.mockResolvedValue(mockGraphData);

    renderWithQueryClient(
      <KnowledgeGraphTable projectPath={projectPath} onSelectFile={mockOnSelectFile} />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Node 1')).toBeDefined();
      expect(screen.getByText('Test Node 2')).toBeDefined();
      expect(screen.getByText('/test/path1.md')).toBeDefined();
      expect(screen.getByText('/test/path2.md')).toBeDefined();
    });
  });

  it('switches to edges table when edges button is clicked', async () => {
    mockTauri.buildKnowledgeGraph.mockResolvedValue(mockGraphData);

    renderWithQueryClient(
      <KnowledgeGraphTable projectPath={projectPath} onSelectFile={mockOnSelectFile} />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Node 1')).toBeDefined();
    });

    // Click the edges button
    const edgesButton = screen.getByRole('button', { name: /Edges/ });
    fireEvent.click(edgesButton);

    await waitFor(() => {
      expect(screen.getByText('Source')).toBeDefined();
      expect(screen.getByText('Target')).toBeDefined();
      expect(screen.getByText('Relationship')).toBeDefined();
      expect(screen.getByText('references')).toBeDefined();
    });
  });

  it('calls onSelectFile when file path is clicked', async () => {
    mockTauri.buildKnowledgeGraph.mockResolvedValue(mockGraphData);

    renderWithQueryClient(
      <KnowledgeGraphTable projectPath={projectPath} onSelectFile={mockOnSelectFile} />
    );

    await waitFor(() => {
      expect(screen.getByText('/test/path1.md')).toBeDefined();
    });

    // Click the file path
    const filePathButton = screen.getByRole('button', { name: '/test/path1.md' });
    fireEvent.click(filePathButton);

    expect(mockOnSelectFile).toHaveBeenCalledWith('/test/path1.md');
  });
});