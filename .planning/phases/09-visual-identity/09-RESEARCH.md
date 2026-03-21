# Phase 9: Visual Identity - Research

**Researched:** 2026-03-21
**Domain:** CSS design tokens, Tailwind config, Tauri icon pipeline, theme system
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dark Mode / Theme Strategy**
- Dark only — drop the light theme CSS entirely. The app becomes a single dark-mode UI matching gsd.build's dark-first presentation.
- Remove all CSS inside `:root { }` (light mode values) — only the `.dark { }` block remains, and it becomes the default.
- The theme switcher/selector UI can be removed or hidden if it exists; no light/ocean/forest/etc. themes needed for v1.1.

**Color Palette**
- Background: Pure black `hsl(0 0% 0%)` — replaces current dark blue-gray `hsl(222 20% 4.5%)`
- Cards / sidebar surfaces: Near-black with no color cast — `hsl(0 0% 5%)` for cards, `hsl(0 0% 8%)` for elevated surfaces
- Primary accent: Cyan fully replaces blue everywhere — buttons, focus rings, active states, links, interactive elements. Current cyan value: `hsl(189 94% 43%)` — use this or a slightly brighter variant
- Text: White `hsl(0 0% 98%)` for primary text, muted gray `hsl(0 0% 65%)` for secondary
- Borders: Dark gray with no color cast — `hsl(0 0% 15%)` or similar

**CSS Token Cleanup (VISL-04)**
- Remove non-cyan brand tokens: Delete `--brand-blue`, `--brand-purple`, `--brand-yellow`
- Rename remaining token: `--brand-cyan` → `--gsd-cyan`
- Status colors stay unchanged
- `--primary` token becomes the cyan value
- Goal: no token name referencing old blue/purple brand identity; no dead tokens

**Icon Design**
- Concept: GSD logomark — bold "GSD" text centered on a pure black rounded square
- Style: Bold white "GSD" on black background, with cyan accent (underline, dot, or text itself)
- Method: Claude generates a new `icon.svg` from specs
- Required output files: `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico`, `icon.png` (512x512), `icon.svg`

**Splash Screen (VISL-03)**
- No-op: No splash screen currently exists. VISL-03 is satisfied by setting `backgroundColor: "#000000"` in `tauri.conf.json` to eliminate the white flash before React loads.

### Claude's Discretion
- Exact cyan HSL value to use for `--gsd-cyan` / `--primary` (approximately `hsl(189 94% 43%)` or brighter like `hsl(186 100% 50%)`)
- Specific icon SVG design details (font weight, letter spacing, exact placement, optional cyan accent treatment)
- Whether `tailwind.config.ts` needs updating to reflect token renames

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VISL-01 | Color palette migrated to gsd.build brand (black background, white text, cyan accent) | Exact token values documented; 88 usages across 33 files identified; replacement values specified in UI-SPEC |
| VISL-02 | New app icon created and applied for all target sizes (macOS, Windows, Linux) | Current SVG identified (blue/purple clipboard); replacement spec documented; `rsvg-convert` and `convert` available on machine for PNG generation |
| VISL-03 | Splash/loading screen updated with GSD VibeFlow branding (if splash exists) | No splash screen exists; satisfied by `backgroundColor: "#000000"` in `tauri.conf.json` — single-line edit |
| VISL-04 | CSS design token names updated to remove old brand references | 4 tokens to rename/delete; Tailwind config `brand.*` map and 3 box shadow utilities also need updating; `theme-customization.tsx` and `theme-provider.tsx` require updates to remove accent presets |
</phase_requirements>

---

## Summary

Phase 9 is a pure visual migration — no new features, no UX changes. Two plans deliver the full scope: Plan 01 migrates all CSS tokens and cleans up Tailwind config, theme provider, and accent UI; Plan 02 creates the new SVG icon and regenerates all required binary icon formats.

The scope is well-bounded and fully audited. The token migration affects 88 occurrences across 33 files plus `globals.css` and `tailwind.config.js`. The theme system (accent presets: ocean/forest/sunset/purple) is backed by `theme-provider.tsx` and `theme-customization.tsx` in settings — both need surgical updates to remove the old accent machinery. The icon pipeline uses `rsvg-convert` (present at `/opt/homebrew/bin/rsvg-convert`) to convert SVG to PNG at each target size, then `convert` (ImageMagick 7.1.2, present at `/opt/homebrew/bin/convert`) for the `.ico` bundle. The `.icns` requires either the `iconutil` macOS command or `png2icns`.

**Primary recommendation:** Execute token migration first (grep-and-replace across 33 files), then icon creation. Audit `text-gradient`, `glow-*`, and `nav-item-active` CSS utilities as a final sweep — they reference deleted tokens but have no TSX callers, so they are safe to update in the CSS-only pass.

---

## Standard Stack

### Core
| Library / Tool | Version | Purpose | Why Standard |
|---------------|---------|---------|--------------|
| Tailwind CSS | Existing (config at `tailwind.config.js`) | Utility classes map to CSS vars | Already in use; `brand.*` color map needs rename to `gsd.*` |
| shadcn/ui | Manually installed (no `components.json`) | Component primitives via Radix UI | Already in use; no new components added this phase |
| CSS Custom Properties (HSL) | Browser-native | All color tokens in `hsl(var(--token))` format | Existing pattern; keep HSL format intact throughout migration |
| `rsvg-convert` | 2.61.4 (at `/opt/homebrew/bin/rsvg-convert`) | SVG → PNG conversion | Fastest, cleanest SVG renderer available on this machine |
| ImageMagick `convert` | 7.1.2-13 (at `/opt/homebrew/bin/convert`) | PNG → ICO multi-size bundle | Standard tool for `.ico` assembly |
| macOS `iconutil` | Bundled with Xcode CLI tools | PNG set → `.icns` bundle | Native macOS tool; requires `.iconset` directory structure |

### Supporting
| Library / Tool | Version | Purpose | When to Use |
|---------------|---------|---------|-------------|
| `pnpm build` | Existing | TypeScript + Vite build verification | After every token rename pass to catch broken references early |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `rsvg-convert` | `inkscape --export-type=png` | Inkscape not installed; rsvg-convert is cleaner for headless use |
| `iconutil` | Third-party `png2icns` | `iconutil` is native macOS; preferred when running on macOS |
| Manual grep-replace | Automated codemod | Manual grep is sufficient for 88 occurrences; no AST transformation needed |

**Icon generation commands:**
```bash
# PNG sizes from SVG
rsvg-convert -w 512 -h 512 src-tauri/icons/icon.svg -o src-tauri/icons/icon.png
rsvg-convert -w 128 -h 128 src-tauri/icons/icon.svg -o src-tauri/icons/128x128.png
rsvg-convert -w 256 -h 256 src-tauri/icons/icon.svg -o src-tauri/icons/128x128@2x.png
rsvg-convert -w 32  -h 32  src-tauri/icons/icon.svg -o src-tauri/icons/32x32.png

# ICO bundle (Windows) — embed 16, 32, 48, 64, 128, 256px
convert src-tauri/icons/icon.png \
  \( -clone 0 -resize 256x256 \) \
  \( -clone 0 -resize 128x128 \) \
  \( -clone 0 -resize 64x64 \) \
  \( -clone 0 -resize 48x48 \) \
  \( -clone 0 -resize 32x32 \) \
  \( -clone 0 -resize 16x16 \) \
  -delete 0 src-tauri/icons/icon.ico

# ICNS bundle (macOS) — iconutil method
mkdir -p /tmp/gsd.iconset
rsvg-convert -w 16   -h 16   src-tauri/icons/icon.svg -o /tmp/gsd.iconset/icon_16x16.png
rsvg-convert -w 32   -h 32   src-tauri/icons/icon.svg -o /tmp/gsd.iconset/icon_16x16@2x.png
rsvg-convert -w 32   -h 32   src-tauri/icons/icon.svg -o /tmp/gsd.iconset/icon_32x32.png
rsvg-convert -w 64   -h 64   src-tauri/icons/icon.svg -o /tmp/gsd.iconset/icon_32x32@2x.png
rsvg-convert -w 128  -h 128  src-tauri/icons/icon.svg -o /tmp/gsd.iconset/icon_128x128.png
rsvg-convert -w 256  -h 256  src-tauri/icons/icon.svg -o /tmp/gsd.iconset/icon_128x128@2x.png
rsvg-convert -w 256  -h 256  src-tauri/icons/icon.svg -o /tmp/gsd.iconset/icon_256x256.png
rsvg-convert -w 512  -h 512  src-tauri/icons/icon.svg -o /tmp/gsd.iconset/icon_256x256@2x.png
rsvg-convert -w 512  -h 512  src-tauri/icons/icon.svg -o /tmp/gsd.iconset/icon_512x512.png
rsvg-convert -w 1024 -h 1024 src-tauri/icons/icon.svg -o /tmp/gsd.iconset/icon_512x512@2x.png
iconutil -c icns /tmp/gsd.iconset -o src-tauri/icons/icon.icns
```

---

## Architecture Patterns

### Recommended Project Structure

No structural changes in this phase. Work targets:
```
src/
├── styles/globals.css           # Token values + utility classes — primary edit target
├── lib/design-tokens.ts         # brand-purple refs → gsd-cyan (2 locations)
└── components/
    ├── theme/theme-provider.tsx  # Remove ACCENT_CLASSES ocean/forest/sunset/purple; simplify AccentColor type
    └── settings/theme-customization.tsx  # Remove accent color picker section

tailwind.config.js               # brand.* → gsd.* color map; glow box shadows
src-tauri/
├── icons/icon.svg               # Replace with new GSD logomark
├── icons/*.png / .icns / .ico   # Regenerate from new SVG
└── tauri.conf.json              # Add backgroundColor: "#000000"
```

### Pattern 1: CSS Token Migration (globals.css)

**What:** Replace `:root {}` block with empty/removed state; update `.dark {}` block with new HSL values; rename `--brand-cyan` to `--gsd-cyan`; delete `--brand-blue`, `--brand-purple`, `--brand-yellow`.

**When to use:** Single targeted edit — all color tokens live in one file.

**Key insight:** The `:root {}` light mode block is entirely removed. The `.dark {}` block stays and becomes the permanent palette. The `--spacing-scale: 0.8` in the second `:root {}` block at line 261 must be retained — it is the density preset, not a color token.

**Approach:** Two `:root {}` blocks exist in globals.css:
- Lines 9–48: Light mode colors → delete this entire block
- Lines 261–263: `--spacing-scale: 0.8` → keep this; it is density config, not theme color

### Pattern 2: Tailwind Brand Color Rename

**What:** In `tailwind.config.js`, rename the `brand` color map to `gsd` with only `cyan` key; delete `glow-purple` box shadow; update `glow-sm`, `glow`, `glow-lg` to reference `--gsd-cyan`.

**Before:**
```javascript
brand: {
  blue: "hsl(var(--brand-blue))",
  purple: "hsl(var(--brand-purple))",
  cyan: "hsl(var(--brand-cyan))",
  yellow: "hsl(var(--brand-yellow))",
},
boxShadow: {
  'glow-sm': '0 0 10px hsl(var(--brand-blue) / 0.2)',
  'glow': '0 0 20px hsl(var(--brand-blue) / 0.3)',
  'glow-lg': '0 0 30px hsl(var(--brand-blue) / 0.4)',
  'glow-purple': '0 0 20px hsl(var(--brand-purple) / 0.3)',
},
```

**After:**
```javascript
gsd: {
  cyan: "hsl(var(--gsd-cyan))",
},
boxShadow: {
  'glow-sm': '0 0 10px hsl(var(--gsd-cyan) / 0.2)',
  'glow': '0 0 20px hsl(var(--gsd-cyan) / 0.3)',
  'glow-lg': '0 0 30px hsl(var(--gsd-cyan) / 0.4)',
},
```

### Pattern 3: 88-Occurrence Class Name Sweep

**What:** All 33 files with `brand-blue`, `brand-purple`, `brand-yellow`, or `brand-cyan` Tailwind class references must be updated to `gsd-cyan` (for cyan) or removed (for blue/purple/yellow).

**Migration rule:**
- `brand-cyan` → `gsd-cyan` (1-for-1 rename)
- `brand-blue` → `gsd-cyan` (blue is replaced by cyan in the new palette)
- `brand-purple` → `gsd-cyan` (purple is replaced by cyan in the new palette)
- `brand-yellow` → remove or replace with appropriate semantic token (check context — mostly used for warning-adjacent highlights; consider `status-warning` if semantic fit, else `gsd-cyan`)

**High-impact files:**
| File | Count | Notes |
|------|-------|-------|
| `src/styles/globals.css` | 11 | Primary definition site; handled in CSS edit |
| `src/components/project/roadmap-progress-card.tsx` | 6 | Likely progress bar and active state highlights |
| `src/components/projects/project-card.tsx` | 6 | Project type badge colors |
| `src/components/layout/main-layout.tsx` | 7 | Nav active state, nav-item-active shadow |
| `src/pages/todos.tsx` | 5 | Status/label highlights |
| `src/lib/design-tokens.ts` | 3 | `projectTypeConfig.gsd` and `systemGroupConfig.gsd` — both use `brand-purple` |
| `src/components/dashboard/status-bar.tsx` | 3 | Status indicators |

### Pattern 4: Theme Provider Simplification

**What:** `theme-provider.tsx` currently supports `AccentColor` variants (ocean/forest/sunset/purple) via `ACCENT_CLASSES` map. Per locked decision, accent variants are removed. The `AccentColor` type and context API should be simplified to only `"default"`.

**Approach options:**
1. **Minimal (recommended):** Remove the ocean/forest/sunset/purple entries from `ACCENT_CLASSES` and `getInitialAccent()`; keep the `AccentColor` type as `"default"` only. This avoids breaking the `ThemeContext` interface while removing all non-cyan accent logic.
2. **Full removal:** Delete `accentColor`, `setAccentColor` from `ThemeContext` entirely. More invasive — requires updating all consumers of `useTheme()` that destructure `accentColor`.

Recommended approach is option 1 (minimal) for this phase. Full removal is Phase 10 dead code work.

**`theme-customization.tsx`:** The accent color picker section (the 5-option `ACCENT_OPTIONS` list: default/ocean/forest/sunset/purple) should be removed from the settings UI. The component can be simplified to density + font scale + font family controls only.

### Anti-Patterns to Avoid

- **Deleting tokens before updating consumers:** Always grep all usages before removing a token. The 33-file list is confirmed; do not delete CSS vars until after all TSX/TS class names are updated.
- **Editing the second `:root {}` block:** The `--spacing-scale: 0.8` block at line 261 is density config, not a color token. Do not touch it.
- **Removing AccentColor type from ThemeContext in this phase:** Theme context is consumed widely; defer full interface cleanup to Phase 10.
- **Using `pnpm tauri dev` to test icon changes:** Full Tauri dev build is heavy. For CSS token changes, `pnpm build` (TypeScript + Vite) is sufficient for verification. Icon changes require a full `pnpm tauri build` to see the icon applied in the app bundle.
- **Generating icons before SVG is finalized:** Confirm the SVG renders correctly at 32x32 before doing the full batch generation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG-to-PNG conversion | Custom Node.js canvas renderer | `rsvg-convert` | Accurate SVG rendering including fonts and gradients |
| ICO multi-size bundle | Manual binary assembly | `convert` (ImageMagick) | ICO format is complex; ImageMagick handles all sizes correctly |
| ICNS bundle | Manual binary packing | `iconutil` (macOS native) | ICNS format is proprietary; `iconutil` is the authoritative tool |
| Token find-and-replace | Custom AST codemod | Direct string search with IDE or `sed` | 88 occurrences are all Tailwind class name strings in JSX — no AST needed |

**Key insight:** All required icon tools are already installed on this machine. No npm packages or additional installation is needed for icon generation.

---

## Common Pitfalls

### Pitfall 1: Forgetting the `--spacing-scale` `:root` Block

**What goes wrong:** Deleting the entire `globals.css` `:root {}` block removes `--spacing-scale: 0.8` (the compact density default), breaking all density-sensitive spacing.

**Why it happens:** `globals.css` has two separate `@layer base` blocks — the first contains color tokens (lines 9–48), the second a later `:root {}` block at line 261 that only sets `--spacing-scale`. They look similar.

**How to avoid:** Delete only the color token `:root {}` block (lines 9–48). The spacing `:root {}` block at line 261 is separate and must remain.

**Warning signs:** After edit, check that `--spacing-scale` is still present in the file.

### Pitfall 2: brand-yellow Usage Context

**What goes wrong:** Replacing `brand-yellow` with `gsd-cyan` in all locations looks correct syntactically but may produce semantically wrong UI (cyan warning badges, etc.).

**Why it happens:** `brand-yellow` was used both as a brand color and as a warning-adjacent visual cue in some components.

**How to avoid:** Before replacing, check each `brand-yellow` usage in context. If the element is a warning badge or caution indicator, replace with `status-warning` instead of `gsd-cyan`. If it's a pure brand accent, replace with `gsd-cyan`.

**Warning signs:** Yellow-highlighted "warning" or "caution" elements that look out of place after migration.

### Pitfall 3: Theme Provider AccentColor Consumers

**What goes wrong:** Removing `AccentColor` variants from `theme-provider.tsx` without checking all files that import `AccentColor` from `@/hooks/use-theme` causes TypeScript errors.

**Why it happens:** `AccentColor` type is exported and imported in: `theme-customization.tsx`, `use-theme.ts`, `theme-provider.tsx`, and any settings page that passes accent values.

**How to avoid:** When simplifying the accent system, update the type definition in `use-theme.ts` first, then let TypeScript errors guide the remaining consumer fixes.

**Warning signs:** Build failure referencing `AccentColor` with values like `"ocean"` or `"forest"` not assignable.

### Pitfall 4: Icon Not Visible in Development Mode

**What goes wrong:** After replacing icon files, running `pnpm tauri dev` still shows the old icon.

**Why it happens:** Tauri dev mode uses a WebView window that doesn't apply the native app icon the same way a bundled `.app` does.

**How to avoid:** Icon visual verification requires `pnpm tauri build` to produce the actual `.app`/`.dmg` bundle. For the purposes of this phase, confirming the PNG files are correctly generated and referenced in `tauri.conf.json` is sufficient to claim VISL-02.

### Pitfall 5: White Flash on App Launch

**What goes wrong:** Without `backgroundColor` set in `tauri.conf.json`, the window briefly shows white before React hydrates, jarring against the new black background.

**Why it happens:** The WebView initializes with a white default background before the CSS is parsed.

**How to avoid:** Add `"backgroundColor": "#000000"` to the window config in `tauri.conf.json` under `app.windows[0]`. This is a single-line addition — do not confuse it with `bundle.*` settings.

---

## Code Examples

Verified from direct source inspection:

### globals.css: New .dark block (complete replacement)

```css
/* Source: src/styles/globals.css — replaces existing .dark {} block */
.dark {
  --background: 0 0% 0%;
  --foreground: 0 0% 98%;
  --card: 0 0% 5%;
  --card-foreground: 0 0% 98%;
  --popover: 0 0% 5%;
  --popover-foreground: 0 0% 98%;
  --primary: 189 94% 43%;
  --primary-foreground: 0 0% 100%;
  --secondary: 0 0% 8%;
  --secondary-foreground: 0 0% 98%;
  --muted: 0 0% 8%;
  --muted-foreground: 0 0% 65%;
  --accent: 0 0% 12%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 15%;
  --input: 0 0% 8%;
  --ring: 189 94% 43%;

  /* GSD VibeFlow Brand Color */
  --gsd-cyan: 189 94% 50%;

  /* Status Colors - Semantic (Dark - higher contrast) */
  --status-success: 142 76% 52%;
  --status-warning: 38 95% 58%;
  --status-error: 0 88% 68%;
  --status-info: 217 91% 68%;
  --status-pending: 220 12% 58%;
  --status-blocked: 30 95% 58%;
  --status-paused: 45 100% 58%;
}
```

### design-tokens.ts: Updated projectTypeConfig and systemGroupConfig

```typescript
// Source: src/lib/design-tokens.ts — replace brand-purple with gsd-cyan
gsd: {
  label: "GSD",
  classes: "bg-gsd-cyan/10 text-gsd-cyan border-gsd-cyan/20",
  tooltip: "GSD project (.planning/)",
},

// systemGroupConfig.gsd:
gsd: {
  label: "GSD",
  color: "text-gsd-cyan",
  bgTint: "bg-gsd-cyan/20",
},
```

### tauri.conf.json: Add backgroundColor

```json
// Source: src-tauri/tauri.conf.json — add to app.windows[0]
{
  "title": "GSD VibeFlow",
  "width": 1200,
  "height": 800,
  "minWidth": 900,
  "minHeight": 600,
  "resizable": true,
  "fullscreen": false,
  "center": true,
  "backgroundColor": "#000000"
}
```

### globals.css: nav-item-active and text-gradient updates

```css
/* nav-item-active: brand-blue → gsd-cyan */
.dark .nav-item-active {
  box-shadow: 0 0 12px -2px hsl(var(--gsd-cyan) / 0.35),
    inset 0 0 0 1px hsl(var(--gsd-cyan) / 0.1);
}

/* text-gradient: brand-blue→brand-purple gradient → cyan-to-white */
.text-gradient {
  background: linear-gradient(to right, hsl(var(--gsd-cyan)), hsl(var(--foreground)));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### Icon SVG specification

```svg
<!-- Source: Design contract in 09-UI-SPEC.md + 09-CONTEXT.md -->
<!-- Canvas: 512x512, pure black fill, no SVG-level rounding -->
<!-- Content: Bold geometric "GSD" in white, centered -->
<!-- Accent: Single cyan underline beneath text -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#000000"/>
  <!-- "GSD" text + cyan underline — exact positioning at Claude's discretion -->
  <!-- Text must be legible at 32x32; decorative elements must not collapse -->
</svg>
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| Blue-to-purple gradient brand (`--brand-blue` + `--brand-purple`) | Single cyan accent (`--gsd-cyan`) | Simpler token surface; matches gsd.build identity |
| Multi-theme accent support (ocean/forest/sunset/purple) | Dark-only, single accent | Theme provider simplification; removes dead CSS blocks |
| Clipboard SVG icon (blue-purple gradient, checklist design) | GSD text logomark (black + white + cyan) | Brand alignment with gsd.build |
| Light mode `:root {}` token block | Removed | Single `.dark {}` block becomes permanent default |

**Deprecated/outdated:**
- `--brand-blue`, `--brand-purple`, `--brand-yellow` tokens: replaced by `--gsd-cyan` single accent
- `.theme-ocean`, `.theme-forest`, `.theme-sunset`, `.theme-purple` CSS blocks: removed (no theme variants in v1.1)
- `glow-purple` box shadow utility: removed (no purple accent in new palette)

---

## Open Questions

1. **brand-yellow replacement: gsd-cyan vs status-warning**
   - What we know: `brand-yellow` appears in 5 files (todos, dashboard, projects, logs, project components); some usages are warning-adjacent, others are brand accents
   - What's unclear: The exact intent of each `brand-yellow` usage in context requires file-by-file inspection
   - Recommendation: Implementer should read each occurrence before replacing; default to `gsd-cyan` for brand accents, `status-warning` for semantic warnings

2. **AccentColor type scope in this phase**
   - What we know: `AccentColor` type is exported from `use-theme.ts` and imported in multiple files; simplifying to `"default"` only may cause TS errors in `getInitialAccent()` validators
   - What's unclear: Full list of consumers that use `accentColor` value at runtime vs just import the type
   - Recommendation: Minimal approach — keep `AccentColor` as `"default"` only, remove `ocean/forest/sunset/purple` entries from `ACCENT_CLASSES` and validators; let TypeScript compilation identify any remaining consumers

3. **Tauri `backgroundColor` key availability**
   - What we know: `tauri.conf.json` uses schema `https://schema.tauri.app/config/2` (Tauri 2.x); `backgroundColor` is a standard window config property
   - What's unclear: Whether Tauri 2.x schema validates `backgroundColor` at the window object level or elsewhere
   - Recommendation: Add `"backgroundColor": "#000000"` to `app.windows[0]`; if build validation rejects it, check Tauri 2.x docs for the correct key path (may be `app.windows[0].backgroundColor` or a top-level `app` property)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library (vite.config.ts `test` section) |
| Config file | `vite.config.ts` |
| Quick run command | `pnpm test --run` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VISL-01 | CSS token values are black/white/cyan | manual-only | — | N/A |
| VISL-02 | Icon files exist at correct sizes | manual-only | — | N/A |
| VISL-03 | No splash screen; backgroundColor set | manual-only | — | N/A |
| VISL-04 | No `brand-blue/purple/yellow` references in source | automated | `grep -rn "brand-blue\|brand-purple\|brand-yellow" src/ --include="*.tsx" --include="*.ts" --include="*.css"` (expects zero results) | N/A — shell audit |

**Note on VISL-01 through VISL-03:** These are visual/file-system requirements. The primary verification gate is `pnpm build` passing with zero TypeScript errors (catches broken token references that Tailwind would silently ignore at runtime). A visual sanity check via `pnpm tauri dev` confirms the palette. No Vitest unit tests cover CSS token correctness.

### Sampling Rate
- **Per task commit:** `pnpm build` — zero TypeScript errors required
- **Per wave merge:** `pnpm test --run` — confirm no test regressions from component edits
- **Phase gate:** Full `pnpm test` green + `pnpm build` green before `/gsd:verify-work`

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements. No new test files needed. The pre-existing 4 test failures in `projects.test.tsx` and `main-layout.test.tsx` are unrelated to this phase (confirmed in Phase 8 STATE.md) and are deferred to Phase 10.

---

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `src/styles/globals.css` — full token inventory, both `:root {}` blocks confirmed
- Direct file inspection: `tailwind.config.js` — `brand.*` color map and box shadow utilities confirmed
- Direct file inspection: `src/lib/design-tokens.ts` — `projectTypeConfig.gsd` and `systemGroupConfig.gsd` using `brand-purple` confirmed
- Direct file inspection: `src-tauri/icons/icon.svg` — current clipboard SVG confirmed (blue-purple gradient)
- Direct file inspection: `src-tauri/tauri.conf.json` — icon bundle paths confirmed; no `backgroundColor` currently set
- Direct file inspection: `src/components/theme/theme-provider.tsx` — AccentColor variants and ACCENT_CLASSES confirmed
- Direct file inspection: `src/components/settings/theme-customization.tsx` — accent picker UI confirmed
- Grep audit: 88 total occurrences of old brand tokens across 33 files (confirmed count)
- Tool availability: `rsvg-convert 2.61.4` and `ImageMagick convert 7.1.2` present on machine

### Secondary (MEDIUM confidence)
- 09-UI-SPEC.md — complete token replacement table, component-level migration notes, implementation checklist
- 09-CONTEXT.md — locked decisions for palette, icon, splash, and token rename strategy

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools confirmed present; all files directly inspected
- Architecture: HIGH — migration scope fully audited via grep (88 occurrences, 33 files)
- Pitfalls: HIGH — identified from direct inspection of the two `:root {}` blocks, AccentColor consumers, and icon pipeline

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable domain — CSS tokens and icon tooling do not change rapidly)
