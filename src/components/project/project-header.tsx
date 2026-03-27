// GSD Vibe - Project Header Component (Slim)
// Compact bar with tech stack badges and actions — no back arrow or project name (sidebar handles that)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { MoreVertical, Trash2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { truncatePath, cn } from "@/lib/utils";
import { getProjectType, projectTypeConfig } from "@/lib/design-tokens";
import type { Project } from "@/lib/tauri";

interface ProjectHeaderProps {
  project: Project;
  currentExecution?: undefined;
  onDelete: () => void;
}

export function ProjectHeader({ project, onDelete }: ProjectHeaderProps) {
  const projectType = getProjectType(project.tech_stack, project.gsd_version);
  const typeConfig = projectTypeConfig[projectType];

  return (
    <div className="flex items-center gap-3 px-6 py-2 flex-shrink-0 border-b border-border/40 bg-card/30">
      {/* Path + type badge */}
      <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5 flex-1 min-w-0">
        <FolderOpen className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">{truncatePath(project.path, 80)}</span>
      </p>

      {/* Type badge */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0', typeConfig.classes)}>
            {typeConfig.label}
          </span>
        </TooltipTrigger>
        <TooltipContent>{typeConfig.tooltip}</TooltipContent>
      </Tooltip>

      {/* Tech stack badges */}
      {project.tech_stack && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {project.tech_stack.framework && (
            <span className="text-[11px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded">{project.tech_stack.framework}</span>
          )}
          {project.tech_stack.language && (
            <span className="text-[11px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded">{project.tech_stack.language}</span>
          )}
        </div>
      )}

      {/* Actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Remove Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
