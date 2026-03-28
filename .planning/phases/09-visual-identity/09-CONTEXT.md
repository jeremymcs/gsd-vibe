# Phase 9: Visual Identity - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate the app's visual identity to match gsd.build: pure black background, white text, and cyan as the sole brand accent color. Deliver a new GSD-branded icon at all required sizes. Update CSS design token names to gsd.build conventions and remove stale brand tokens. No new features, no UX changes — visual identity only.

</domain>

<decisions>
## Implementation Decisions

### Dark Mode / Theme Strategy
- **Dark only** — drop the light theme CSS entirely. The app becomes a single dark-mode UI matching gsd.build's dark-first presentation.
- Remove all CSS inside `:root { }` (light mode values) — only the `.dark { }` block remains, and it becomes the default.
- The theme switcher/selector UI can be removed or hidden if it exists; no light/ocean/forest/etc. themes needed for v1.1.

### Color Palette
- **Background**: Pure black `hsl(0 0% 0%)` — replaces current dark blue-gray `hsl(222 20% 4.5%)`
- **Cards / sidebar surfaces**: Near-black with no color cast — `hsl(0 0% 5%)` for cards, `hsl(0 0% 8%)` for elevated surfaces
- **Primary accent**: Cyan fully replaces blue everywhere — buttons, focus rings, active states, links, interactive elements
  - Current cyan value: `hsl(189 94% 43%)` — use this or a slightly brighter variant matching gsd.build
- **Text**: White `hsl(0 0% 98%)` for primary text, muted gray `hsl(0 0% 65%)` for secondary
- **Borders**: Dark gray with no color cast — `hsl(0 0% 15%)` or similar

### CSS Token Cleanup (VISL-04)
- **Remove non-cyan brand tokens**: Delete `--brand-blue`, `--brand-purple`, `--brand-yellow` — the new palette is cyan-only
- **Rename remaining token to gsd.build conventions**: Rename `--brand-cyan` to `--gsd-cyan` (or whatever gsd.build uses — if no documented convention, use `--gsd-cyan`)
- **Status colors stay unchanged**: `--status-success`, `--status-warning`, `--status-error`, `--status-info`, `--status-pending`, `--status-blocked`, `--status-paused` are semantic colors (green/red/orange/yellow) — not brand-specific, keep as-is
- **Primary token** (`--primary`) becomes the cyan value — update its HSL to match `--gsd-cyan`
- Goal: no token name that references the old blue/purple brand identity; no dead tokens for colors no longer in the palette

### Icon Design
- **Concept**: GSD logomark — bold "GSD" text centered on a pure black rounded square
- **Style**: Bold white "GSD" on black background, with cyan accent (e.g., a subtle underline, dot, or the text itself in cyan)
- **Method**: Claude generates a new `icon.svg` from specs — no external design files needed
- **Required output sizes** (from `src-tauri/icons/`):
  - `icons/32x32.png`
  - `icons/128x128.png`
  - `icons/128x128@2x.png` (256x256)
  - `icons/icon.icns` (macOS bundle icon)
  - `icons/icon.ico` (Windows)
  - `icons/icon.png` (512x512 source)
  - `icons/icon.svg` (source SVG)

### Splash Screen (VISL-03)
- **No-op**: No splash screen currently exists in the app. VISL-03 is trivially satisfied — do not add one.
- **Window background color**: Set `backgroundColor` to `#000000` in `tauri.conf.json` to eliminate the white flash before React loads on app startup.

### Claude's Discretion
- Exact cyan HSL value to use for `--gsd-cyan` / `--primary` (choose the closest match to gsd.build's cyan — approximately `hsl(189 94% 43%)` or a slightly brighter value like `hsl(186 100% 50%)`)
- Specific icon SVG design details (font weight, letter spacing, exact placement, optional cyan accent treatment)
- Whether any Tailwind config (`tailwind.config.ts`) needs updating to reflect token renames

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### CSS Tokens & Palette
- `src/styles/globals.css` — Current CSS variable definitions; all `:root` and `.dark` blocks to be replaced
- `src/lib/design-tokens.ts` — TypeScript design token utilities; check for hardcoded color references that need updating

### Icon
- `src-tauri/icons/icon.svg` — Current icon SVG (blue/purple clipboard); to be replaced
- `src-tauri/tauri.conf.json` — Icon list paths (`bundle.icon`) and `backgroundColor` window config

### Phase Requirements
- `.planning/REQUIREMENTS.md` §VISL-01 through VISL-04 — Acceptance criteria for each visual identity requirement

No external specs — requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/styles/globals.css`: Single file for all CSS variables — palette migration is a targeted edit of `:root` and `.dark` blocks only
- `src-tauri/icons/`: Contains all icon files including the source `icon.svg` — replace SVG then regenerate PNGs/ICNS/ICO
- `src/lib/design-tokens.ts`: TypeScript utilities referencing status colors and project type configs — check for `--brand-blue/purple/yellow` references

### Established Patterns
- CSS custom properties (HSL format): All colors use `hsl(var(--token))` pattern — rename tokens but keep HSL format intact
- Tailwind tokens: `tailwind.config.ts` likely extends these CSS vars — check after renaming
- Theme class strategy (`class="dark"` on root): Already in use; dropping light mode means this class is permanent

### Integration Points
- `src-tauri/tauri.conf.json`: `bundle.icon` array + window `backgroundColor` — two edits needed
- Any component using `--brand-blue`, `--brand-purple`, or `--brand-yellow` Tailwind classes will break if tokens are removed — grep before deleting

</code_context>

<specifics>
## Specific Ideas

- Match gsd.build's dark identity: pure black backgrounds, white text, cyan as the single accent
- Icon should be readable at 32x32 — bold "GSD" with minimal decoration
- Window launch should feel seamless (no white flash) via `backgroundColor: #000000`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-visual-identity*
*Context gathered: 2026-03-21*
