// GSD Vibe - GSD-2 Session Browser
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState } from 'react';
import { RefreshCw, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGsd2Sessions } from '@/lib/queries';
import { toast } from 'sonner';

interface Gsd2SessionBrowserProps {
  projectId: string;
  projectPath: string;
}

export function Gsd2SessionBrowser({ projectId }: Gsd2SessionBrowserProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: sessions, isLoading, isError, refetch } = useGsd2Sessions(projectId);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Sessions refreshed');
    } catch (error) {
      toast.error('Failed to refresh sessions');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4" /> Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4" /> Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-center text-sm text-status-error">
          Failed to load sessions
        </CardContent>
      </Card>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4" /> Sessions
            <Button 
              variant="ghost" 
              size="icon"
              className="h-4 w-4 ml-auto"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">No sessions found</p>
          <p className="text-xs text-muted-foreground mt-1">
            GSD sessions will appear here once created.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <History className="h-4 w-4" /> Sessions
          <Button 
            variant="ghost" 
            size="icon"
            className="h-4 w-4 ml-auto"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-4">
        {sessions.map((session, index) => (
          <Card key={index} className="p-3">
            <code className="text-xs font-mono text-foreground break-all">
              {session.raw}
            </code>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}