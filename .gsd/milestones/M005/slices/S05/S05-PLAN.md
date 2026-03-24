# S05: Bundle Optimization

**Goal:** `pnpm build` produces zero chunk size warnings; vendor-markdown is below 500 KB minified via selective highlight.js language imports.
**Demo:** Run `pnpm build` — no "(!) Some chunks are larger than 500 kB" warning appears; `vendor-markdown` chunk is under 500 KB raw.

## Must-Haves

- `file-browser.tsx` imports `highlight.js/lib/core` instead of the full `highlight.js` bundle
- All 40 languages from `EXTENSION_TO_LANGUAGE` are explicitly registered via `hljs.registerLanguage()`
- `hcl` mapping changed to `ini`; `solidity` mapping removed (falls to `plaintext`)
- `highlightAuto` fallback replaced with raw text return (no auto-detection needed)
- `highlight.js` removed from `vendor-markdown` manualChunks in `vite.config.ts`
- `pnpm build` produces zero chunk size warnings
- `pnpm test` still passes (146 tests)

## Observability / Diagnostics

### Runtime Signals
- **Build output**: `pnpm build` emits chunk size warnings to stderr when any chunk exceeds 500 KB. The absence of `"(!) Some chunks are larger than 500 kB"` in build output is the primary success signal.
- **Chunk manifest**: Vite writes `dist/.vite/manifest.json` after every build; the `vendor-markdown` entry's `file` size on disk is ground truth for the bundle size claim.
- **TypeScript strict mode**: `tsconfig.json` enables `noUnusedLocals: true` — if any of the 40 language imports are unused (e.g. not passed to `registerLanguage`), the build fails with a TS error instead of silently succeeding with dead code.

### Inspection Surfaces
- After build: `ls -lh dist/assets/ | grep vendor-markdown` shows raw chunk size
- Runtime highlight failures surface as plain-text code blocks (the `catch` in `highlightCode()` returns raw `code`) — visible in the UI but not crashing
- `hljs.listLanguages()` in browser console lists all registered languages post-load — verifies the 40 registrations are in effect

### Failure Visibility
- If a language name passed to `registerLanguage` does not match the module's expected identifier, `hljs.highlight()` throws and the `catch` block returns raw text — visible to the user as unhighlighted code
- If `gradle` or another language module is missing from `highlight.js/lib/languages/`, the TypeScript import will fail at build time with a module-not-found error
- The `tf: 'ini'` mapping means `.tf` files highlight as INI; this is intentional and a known approximation

### Redaction
- No secrets or user data flow through highlight.js. Build artifacts contain no credentials.

## Verification

```bash
# 1. Build produces no chunk warnings
pnpm build 2>&1 | grep -c "chunks are larger than 500 kB" | grep -q "^0$"

# 2. vendor-markdown chunk is under 500 KB minified
pnpm build 2>&1 | grep "vendor-markdown" | awk '{print $1}' | awk -F, '{gsub(/ /,"",$1); if ($1+0 < 500) print "PASS"; else print "FAIL"}'

# 3. No bare highlight.js import remains
rg "from 'highlight\.js'" src/ | grep -v "lib/core\|lib/languages\|styles/"

# 4. All tests pass
pnpm test
```

## Tasks

- [x] **T01: Switch file-browser.tsx to selective highlight.js imports** `est:20m`
  - Why: The full `highlight.js` import (192 languages, 1.2 MB) is the sole cause of the oversized `vendor-markdown` chunk. Switching to `highlight.js/lib/core` + explicit language registration eliminates ~900 KB.
  - Files: `src/components/project/file-browser.tsx`
  - Do: Replace `import hljs from 'highlight.js'` with `import hljs from 'highlight.js/lib/core'`. Import all 40 language modules individually from `highlight.js/lib/languages/<name>`. Register each with `hljs.registerLanguage()`. Fix `EXTENSION_TO_LANGUAGE`: `tf` → `ini` (was `hcl`), remove `sol` entry (was `solidity`). Replace `highlightAuto` fallback with `return code`. Keep CSS import `highlight.js/styles/github-dark.css` unchanged.
  - Verify: `pnpm build` completes without TypeScript errors
  - Done when: `file-browser.tsx` has zero direct imports from `'highlight.js'` (only from `'highlight.js/lib/core'` and `'highlight.js/lib/languages/*'`)

- [x] **T02: Remove highlight.js from manualChunks and verify clean build** `est:10m`
  - Why: With the full `highlight.js` no longer imported, the `manualChunks` entry that routes it into `vendor-markdown` must be removed. This task also runs the final verification to prove R048 and R050 are met.
  - Files: `vite.config.ts`
  - Do: Remove `'highlight.js'` from the `vendor-markdown` array in `manualChunks`. Run `pnpm build` and confirm no chunk size warnings. Run `pnpm test` and confirm 146 tests pass.
  - Verify: `pnpm build 2>&1 | grep -c "chunks are larger than 500 kB"` outputs `0`; `pnpm test` passes
  - Done when: `pnpm build` has zero chunk warnings AND `vendor-markdown` < 500 KB minified AND `pnpm test` passes (146 tests)

## Files Likely Touched

- `src/components/project/file-browser.tsx`
- `vite.config.ts`
