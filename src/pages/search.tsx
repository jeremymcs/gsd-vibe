// VCCA - Global Search Page
// Full workspace search across projects, phases, decisions, and knowledge
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FolderOpen,
  Layers,
  GitBranch,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/page-header';
import { useGlobalSearch } from '@/lib/queries';

function ResultRow({
  icon,
  title,
  detail,
  meta,
  onOpen,
}: {
  icon: React.ReactNode;
  title: string;
  detail?: string | null;
  meta?: React.ReactNode;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/30"
    >
      <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {meta}
        </div>
        {detail && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{detail}</p>}
      </div>
      <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </button>
  );
}

export function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { data: results, isLoading } = useGlobalSearch(query.trim());

  const hasQuery = query.trim().length >= 2;
  const totalResults =
    (results?.projects.length ?? 0) +
    (results?.phases.length ?? 0) +
    (results?.decisions.length ?? 0) +
    (results?.knowledge.length ?? 0);

  return (
    <div className="h-full overflow-auto p-8">
      <PageHeader
        title="Search"
        description="Search projects, planning phases, decisions, and knowledge across the workspace."
        icon={<Search className="h-6 w-6 text-muted-foreground" />}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the workspace…"
              className="h-11 pl-10 text-sm"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Use at least 2 characters. This searches structured project data and indexed knowledge.
          </p>
        </CardContent>
      </Card>

      {!hasQuery ? (
        <div className="mt-6 rounded-lg border border-dashed border-border/60 px-4 py-10 text-center">
          <p className="text-sm font-medium">Start typing to search</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Good queries: project names, milestone IDs, goals, decision topics, or docs.
          </p>
        </div>
      ) : isLoading ? (
        <div className="mt-6 text-sm text-muted-foreground">Searching…</div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="text-sm text-muted-foreground">
            {totalResults} result{totalResults === 1 ? '' : 's'} for <span className="font-medium text-foreground">{query.trim()}</span>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Projects</CardTitle>
              <CardDescription>Direct project matches.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {results?.projects.length ? (
                results.projects.map((project) => (
                  <ResultRow
                    key={project.id}
                    icon={<FolderOpen className="h-4 w-4" />}
                    title={project.name}
                    detail={project.description}
                    meta={<Badge variant="outline">{project.status}</Badge>}
                    onOpen={() => void navigate(`/projects/${project.id}`)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No matching projects.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Phases</CardTitle>
              <CardDescription>Matching planning phases and milestones.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {results?.phases.length ? (
                results.phases.map((phase) => (
                  <ResultRow
                    key={phase.id}
                    icon={<Layers className="h-4 w-4" />}
                    title={`${phase.project_name} · ${phase.name}`}
                    detail={phase.goal}
                    meta={<Badge variant="outline">{phase.status}</Badge>}
                    onOpen={() => void navigate(`/projects/${phase.project_id}`)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No matching phases.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Decisions</CardTitle>
              <CardDescription>Captured decision records across projects.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {results?.decisions.length ? (
                results.decisions.map((decision) => (
                  <ResultRow
                    key={decision.id}
                    icon={<GitBranch className="h-4 w-4" />}
                    title={`${decision.project_name} · ${decision.question}`}
                    detail={decision.answer}
                    meta={decision.category ? <Badge variant="outline">{decision.category}</Badge> : undefined}
                    onOpen={() => void navigate(`/projects/${decision.project_id}`)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No matching decisions.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Knowledge</CardTitle>
              <CardDescription>Matches from indexed docs and knowledge entries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {results?.knowledge.length ? (
                results.knowledge.map((item) => (
                  <ResultRow
                    key={item.id}
                    icon={<BookOpen className="h-4 w-4" />}
                    title={`${item.project_name} · ${item.title}`}
                    detail={item.category}
                    meta={<Badge variant="outline">{item.category}</Badge>}
                    onOpen={() => void navigate(`/projects/${item.project_id}?view=knowledge`)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No matching knowledge entries.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
