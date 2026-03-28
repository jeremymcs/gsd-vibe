// GSD VibeFlow - Theme Customization Settings Component
// Accent color, UI density, and font size configuration
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';
import type { UiDensity, FontScale, FontFamily } from '@/hooks/use-theme';

const DENSITY_OPTIONS: { value: UiDensity; label: string; description: string }[] = [
  { value: 'compact', label: 'Compact', description: 'Tighter spacing' },
  { value: 'normal', label: 'Normal', description: 'Default spacing' },
  { value: 'spacious', label: 'Spacious', description: 'More breathing room' },
];

const FONT_SCALE_OPTIONS: { value: FontScale; label: string; size: string }[] = [
  { value: 'sm', label: 'Small', size: '13px' },
  { value: 'md', label: 'Medium', size: '14px' },
  { value: 'lg', label: 'Large', size: '16px' },
];

const FONT_FAMILY_OPTIONS: { value: FontFamily; label: string; preview: string }[] = [
  { value: 'system', label: 'System', preview: 'Default' },
  { value: 'inter', label: 'Inter', preview: 'Sans-serif' },
  { value: 'jetbrains-mono', label: 'JetBrains', preview: 'Monospace' },
  { value: 'monospace', label: 'Mono', preview: 'Terminal' },
];

export function ThemeCustomization() {
  const { uiDensity, setUiDensity, fontScale, setFontScale, fontFamily, setFontFamily } =
    useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize the look and feel of GSD VibeFlow</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* UI Density */}
        <div>
          <Label className="block text-sm font-medium mb-3">UI Density</Label>
          <div className="grid grid-cols-3 gap-2">
            {DENSITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setUiDensity(option.value)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg border p-3 transition-all duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  uiDensity === option.value
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border hover:border-primary/30 hover:bg-accent/30 text-muted-foreground',
                )}
                aria-pressed={uiDensity === option.value}
              >
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-[10px] mt-0.5">{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div>
          <Label className="block text-sm font-medium mb-3">Font Size</Label>
          <div className="grid grid-cols-3 gap-2">
            {FONT_SCALE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFontScale(option.value)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg border p-3 transition-all duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  fontScale === option.value
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border hover:border-primary/30 hover:bg-accent/30 text-muted-foreground',
                )}
                aria-pressed={fontScale === option.value}
              >
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-[10px] mt-0.5">{option.size}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Font Family */}
        <div>
          <Label className="block text-sm font-medium mb-3">Font Family</Label>
          <div className="grid grid-cols-4 gap-2">
            {FONT_FAMILY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFontFamily(option.value)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg border p-3 transition-all duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  fontFamily === option.value
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border hover:border-primary/30 hover:bg-accent/30 text-muted-foreground',
                )}
                aria-pressed={fontFamily === option.value}
              >
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-[10px] mt-0.5">{option.preview}</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
