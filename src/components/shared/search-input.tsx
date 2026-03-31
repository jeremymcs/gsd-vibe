// GSD VibeFlow - Shared Search Input Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchInputProps {
  /** Current search value */
  value: string;
  /** Callback when search value changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Additional className for the container */
  className?: string;
  /** Additional className for the input */
  inputClassName?: string;
  /** Size variant */
  size?: 'sm' | 'default' | 'lg';
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Auto focus the input */
  autoFocus?: boolean;
}

const sizeStyles = {
  sm: {
    container: "h-8",
    input: "pl-8 h-8 text-xs",
    icon: "h-3.5 w-3.5 left-2.5"
  },
  default: {
    container: "h-10", 
    input: "pl-10 h-10 text-sm",
    icon: "h-4 w-4 left-3"
  },
  lg: {
    container: "h-12",
    input: "pl-12 h-12 text-base",
    icon: "h-5 w-5 left-3.5"
  }
};

/**
 * SearchInput - A reusable search input with left-positioned search icon
 * 
 * Extracted from the Sessions tab search pattern to provide consistent
 * search UX across all list views in VibeFlow.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ 
    value, 
    onChange, 
    placeholder = "Search...",
    className,
    inputClassName,
    size = 'default',
    disabled = false,
    autoFocus = false,
    ...props 
  }, ref) => {
    const styles = sizeStyles[size];
    
    return (
      <div className={cn("relative", styles.container, className)}>
        <Search className={cn(
          "absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
          styles.icon
        )} />
        <Input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(styles.input, inputClassName)}
          disabled={disabled}
          autoFocus={autoFocus}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";