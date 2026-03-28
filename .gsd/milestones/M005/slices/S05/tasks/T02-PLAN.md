---
estimated_steps: 3
estimated_files: 1
skills_used: []
---

# T02: Remove highlight.js from manualChunks and verify clean build

**Slice:** S05 — Bundle Optimization
**Milestone:** M005

## Description

Remove the `'highlight.js'` entry from the `vendor-markdown` manualChunks array in `vite.config.ts`. With T01's switch to `highlight.js/lib/core` + selective language imports, the full `highlight.js` package is no longer imported by any source file. The manualChunks entry is now a dead reference that would cause Rollup to unnecessarily bundle the full module. Removing it lets Rollup naturally include only the core + 40 language files via the selective imports in `file-browser.tsx`. Then verify the build is clean and all tests pass.

## Steps

1. **Edit `vite.config.ts`.** In the `build.rollupOptions.output.manualChunks` object, find the `'vendor-markdown'` array and remove the `'highlight.js'` entry. The array should become:
   ```ts
   'vendor-markdown': [
     'react-markdown',
     'remark-gfm',
     'rehype-highlight',
   ],
   ```
   The `lowlight` library (used by `rehype-highlight`) will be included in this chunk automatically via Rollup's module resolution — no explicit entry needed.

2. **Run `pnpm build` and verify.** Confirm:
   - No "(!) Some chunks are larger than 500 kB after minification" warning in the output
   - `vendor-markdown` chunk is under 500 KB minified (expect ~300-350 KB)
   - All other chunks unchanged

3. **Run `pnpm test` and verify.** Confirm all 146 tests still pass. No tests reference `file-browser` directly, so this is a safety check that the import changes didn't break anything unexpected.

## Must-Haves

- [ ] `'highlight.js'` removed from `vendor-markdown` manualChunks array
- [ ] `pnpm build` produces zero chunk size warnings
- [ ] `vendor-markdown` chunk is under 500 KB minified
- [ ] `pnpm test` passes (146 tests)

## Verification

- `pnpm build 2>&1 | grep -c "chunks are larger than 500 kB"` outputs `0`
- `pnpm build 2>&1 | grep "vendor-markdown"` shows a size under 500 KB
- `pnpm test` exits 0 with 146 tests passed

## Inputs

- `vite.config.ts` — contains the manualChunks configuration
- `src/components/project/file-browser.tsx` — modified by T01 with selective imports (dependency: T01 must be complete)

## Expected Output

- `vite.config.ts` — modified with `'highlight.js'` removed from vendor-markdown manualChunks
