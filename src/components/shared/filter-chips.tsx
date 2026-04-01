// VCCA - Shared Filter Chips Component  
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterChip {
  /** Unique identifier for the chip */
  id: string;
  /** Display label for the chip */
  label: string;
  /** Optional badge count to display */
  count?: number;
  /** Whether this chip is disabled */
  disabled?: boolean;
}

export interface FilterChipsProps {
  /** Array of available filter options */
  options: FilterChip[];
  /** Currently selected chip IDs */
  selected: string[];
  /** Callback when selection changes */
  onSelectionChange: (selected: string[]) => void;
  /** Whether to allow multiple selections (default: false) */
  allowMultiple?: boolean;
  /** Size variant for the chips */
  size?: 'sm' | 'default' | 'lg';
  /** Additional className for the container */
  className?: string;
  /** Optional label to display before the chips */
  label?: string;
  /** Whether to show "All" option that clears selection */
  showAllOption?: boolean;
  /** Custom label for the "All" option */
  allLabel?: string;
}

/**
 * FilterChips - A reusable filter chip component supporting both single and multi-select
 * 
 * Supports:
 * - Single-select mode for status filters (milestones status)
 * - Multi-select mode for category filters (activity phases)
 * - Active/inactive visual states
 * - Optional count badges
 * - Consistent styling with VCCA design system
 */
export function FilterChips({
  options,
  selected,
  onSelectionChange,
  allowMultiple = false,
  size = 'default',
  className,
  label,
  showAllOption = true,
  allLabel = "All",
}: FilterChipsProps) {
  const handleChipClick = (chipId: string) => {
    if (allowMultiple) {
      // Multi-select: toggle the chip
      const newSelected = selected.includes(chipId)
        ? selected.filter(id => id !== chipId)
        : [...selected, chipId];
      onSelectionChange(newSelected);
    } else {
      // Single-select: only this chip (or clear if already selected)
      const newSelected = selected.includes(chipId) ? [] : [chipId];
      onSelectionChange(newSelected);
    }
  };

  const handleAllClick = () => {
    onSelectionChange([]);
  };

  const isChipSelected = (chipId: string) => selected.includes(chipId);
  const hasAnySelection = selected.length > 0;

  const chipSizeStyles = {
    sm: "px-2 py-1 text-xs h-6",
    default: "px-3 py-1.5 text-sm h-7", 
    lg: "px-4 py-2 text-base h-8"
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {label && (
        <span className="text-sm font-medium text-muted-foreground mr-1">
          {label}:
        </span>
      )}

      {showAllOption && (
        <Button
          variant={hasAnySelection ? "outline" : "default"}
          size="sm"
          onClick={handleAllClick}
          className={cn(
            chipSizeStyles[size],
            "transition-all duration-200",
            !hasAnySelection && "bg-primary text-primary-foreground"
          )}
        >
          {allLabel}
        </Button>
      )}

      {options.map((option) => {
        const isSelected = isChipSelected(option.id);
        const chipContent = (
          <>
            {option.label}
            {typeof option.count === 'number' && (
              <Badge
                variant="secondary"
                size="sm"
                className="ml-1.5 tabular-nums"
              >
                {option.count}
              </Badge>
            )}
          </>
        );

        return (
          <Button
            key={option.id}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => handleChipClick(option.id)}
            disabled={option.disabled}
            className={cn(
              chipSizeStyles[size],
              "transition-all duration-200",
              isSelected && "bg-primary text-primary-foreground",
              !isSelected && "hover:bg-muted/50",
              option.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {chipContent}
          </Button>
        );
      })}
    </div>
  );
}

// Type-safe helpers for common use cases

export interface SingleSelectFilterProps extends Omit<FilterChipsProps, 'allowMultiple' | 'selected' | 'onSelectionChange'> {
  /** Currently selected chip ID (single value) */
  selected: string | null;
  /** Callback when selection changes (single value) */
  onSelectionChange: (selected: string | null) => void;
}

/**
 * SingleSelectFilter - Type-safe wrapper for single-select filter chips
 */
export function SingleSelectFilter({
  selected,
  onSelectionChange,
  ...props
}: SingleSelectFilterProps) {
  const handleChange = (selectedArray: string[]) => {
    onSelectionChange(selectedArray[0] || null);
  };

  return (
    <FilterChips
      {...props}
      selected={selected ? [selected] : []}
      onSelectionChange={handleChange}
      allowMultiple={false}
    />
  );
}

export interface MultiSelectFilterProps extends Omit<FilterChipsProps, 'allowMultiple'> {
  // Use the base props as-is for multi-select
}

/**
 * MultiSelectFilter - Type-safe wrapper for multi-select filter chips
 */
export function MultiSelectFilter(props: MultiSelectFilterProps) {
  return <FilterChips {...props} allowMultiple={true} />;
}