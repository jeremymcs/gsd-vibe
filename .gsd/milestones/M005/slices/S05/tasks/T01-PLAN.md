---
estimated_steps: 5
estimated_files: 1
skills_used: []
---

# T01: Switch file-browser.tsx to selective highlight.js imports

**Slice:** S05 — Bundle Optimization
**Milestone:** M005

## Description

Replace the full `highlight.js` import in `file-browser.tsx` with `highlight.js/lib/core` plus explicit individual language imports and registrations. This is the only file in the codebase that imports the full highlight.js bundle (confirmed via `rg "from 'highlight\.js'" src/`). The change is purely mechanical — import the core, import each language module, register them, fix two broken language mappings, and replace the `highlightAuto` fallback.

## Steps

1. **Replace the main import.** Change line 16 from `import hljs from 'highlight.js'` to `import hljs from 'highlight.js/lib/core'`. Keep the CSS import on line 4 (`import 'highlight.js/styles/github-dark.css'`) unchanged — it's a stylesheet, not a JS bundle.

2. **Add individual language imports.** After the `import hljs` line, add imports for all 40 languages used in `EXTENSION_TO_LANGUAGE`. The complete list of import statements:

   ```ts
   import javascript from 'highlight.js/lib/languages/javascript';
   import typescript from 'highlight.js/lib/languages/typescript';
   import python from 'highlight.js/lib/languages/python';
   import ruby from 'highlight.js/lib/languages/ruby';
   import go from 'highlight.js/lib/languages/go';
   import rust from 'highlight.js/lib/languages/rust';
   import java from 'highlight.js/lib/languages/java';
   import kotlin from 'highlight.js/lib/languages/kotlin';
   import swift from 'highlight.js/lib/languages/swift';
   import c from 'highlight.js/lib/languages/c';
   import cpp from 'highlight.js/lib/languages/cpp';
   import csharp from 'highlight.js/lib/languages/csharp';
   import php from 'highlight.js/lib/languages/php';
   import lua from 'highlight.js/lib/languages/lua';
   import perl from 'highlight.js/lib/languages/perl';
   import r from 'highlight.js/lib/languages/r';
   import scala from 'highlight.js/lib/languages/scala';
   import dart from 'highlight.js/lib/languages/dart';
   import xml from 'highlight.js/lib/languages/xml';
   import css from 'highlight.js/lib/languages/css';
   import scss from 'highlight.js/lib/languages/scss';
   import less from 'highlight.js/lib/languages/less';
   import json from 'highlight.js/lib/languages/json';
   import yaml from 'highlight.js/lib/languages/yaml';
   import ini from 'highlight.js/lib/languages/ini';
   import markdown from 'highlight.js/lib/languages/markdown';
   import sql from 'highlight.js/lib/languages/sql';
   import bash from 'highlight.js/lib/languages/bash';
   import powershell from 'highlight.js/lib/languages/powershell';
   import dockerfile from 'highlight.js/lib/languages/dockerfile';
   import makefile from 'highlight.js/lib/languages/makefile';
   import gradle from 'highlight.js/lib/languages/gradle';
   import objectivec from 'highlight.js/lib/languages/objectivec';
   import elixir from 'highlight.js/lib/languages/elixir';
   import erlang from 'highlight.js/lib/languages/erlang';
   import haskell from 'highlight.js/lib/languages/haskell';
   import ocaml from 'highlight.js/lib/languages/ocaml';
   import vim from 'highlight.js/lib/languages/vim';
   import graphql from 'highlight.js/lib/languages/graphql';
   import plaintext from 'highlight.js/lib/languages/plaintext';
   ```

3. **Register all languages.** After all imports but before `EXTENSION_TO_LANGUAGE`, add registration calls:

   ```ts
   hljs.registerLanguage('javascript', javascript);
   hljs.registerLanguage('typescript', typescript);
   hljs.registerLanguage('python', python);
   hljs.registerLanguage('ruby', ruby);
   hljs.registerLanguage('go', go);
   hljs.registerLanguage('rust', rust);
   hljs.registerLanguage('java', java);
   hljs.registerLanguage('kotlin', kotlin);
   hljs.registerLanguage('swift', swift);
   hljs.registerLanguage('c', c);
   hljs.registerLanguage('cpp', cpp);
   hljs.registerLanguage('csharp', csharp);
   hljs.registerLanguage('php', php);
   hljs.registerLanguage('lua', lua);
   hljs.registerLanguage('perl', perl);
   hljs.registerLanguage('r', r);
   hljs.registerLanguage('scala', scala);
   hljs.registerLanguage('dart', dart);
   hljs.registerLanguage('xml', xml);
   hljs.registerLanguage('css', css);
   hljs.registerLanguage('scss', scss);
   hljs.registerLanguage('less', less);
   hljs.registerLanguage('json', json);
   hljs.registerLanguage('yaml', yaml);
   hljs.registerLanguage('ini', ini);
   hljs.registerLanguage('markdown', markdown);
   hljs.registerLanguage('sql', sql);
   hljs.registerLanguage('bash', bash);
   hljs.registerLanguage('powershell', powershell);
   hljs.registerLanguage('dockerfile', dockerfile);
   hljs.registerLanguage('makefile', makefile);
   hljs.registerLanguage('gradle', gradle);
   hljs.registerLanguage('objectivec', objectivec);
   hljs.registerLanguage('elixir', elixir);
   hljs.registerLanguage('erlang', erlang);
   hljs.registerLanguage('haskell', haskell);
   hljs.registerLanguage('ocaml', ocaml);
   hljs.registerLanguage('vim', vim);
   hljs.registerLanguage('graphql', graphql);
   hljs.registerLanguage('plaintext', plaintext);
   ```

4. **Fix EXTENSION_TO_LANGUAGE mappings.** Two entries reference languages that don't exist in highlight.js:
   - Change `tf: 'hcl'` → `tf: 'ini'` (ini is the closest available approximation for Terraform/HCL)
   - Remove the `sol: 'solidity'` line entirely (will fall to `'plaintext'` via the default)

5. **Replace highlightAuto fallback.** In the `highlightCode()` function (~line 107), change:
   ```ts
   return hljs.highlightAuto(code).value;
   ```
   to:
   ```ts
   return code;
   ```
   `highlightAuto` needs a populated auto-detection registry which `highlight.js/lib/core` doesn't provide. Since `detectLanguage()` always returns a value from the map or `'plaintext'`, this fallback only fires if language is empty/undefined — returning raw text is the correct behavior.

## Must-Haves

- [ ] Import is `highlight.js/lib/core`, NOT `highlight.js`
- [ ] All 40 language modules imported individually from `highlight.js/lib/languages/<name>`
- [ ] All 40 languages registered with `hljs.registerLanguage()`
- [ ] `tf` maps to `'ini'` (not `'hcl'`)
- [ ] `sol: 'solidity'` entry removed
- [ ] `highlightAuto` call replaced with `return code`
- [ ] CSS import (`highlight.js/styles/github-dark.css`) unchanged
- [ ] File header preserved: `// GSD VibeFlow - File Browser Component` + copyright

## Observability Impact

### Signals Changed
- **Build-time**: Switching from `highlight.js` to `highlight.js/lib/core` removes ~900 KB from the `vendor-markdown` chunk. The Vite build output's chunk size table is the primary observable signal — the `vendor-markdown` line should drop below 500 KB.
- **TypeScript strict compile**: `noUnusedLocals: true` means every imported language variable must appear in a `registerLanguage()` call. A missing registration is a compile error, not a silent dead import — this makes correctness machine-checkable.
- **Runtime highlight**: `highlightCode()` uses `hljs.getLanguage(language)` as a guard before calling `hljs.highlight()`. If a language was not registered, `getLanguage` returns `undefined`, the guard fails, and `return code` returns plain text — observable as unhighlighted code in the file viewer. No crashes, no thrown errors visible to the user.

### How a Future Agent Inspects This
1. `pnpm build 2>&1 | grep vendor-markdown` — check chunk size in build output
2. `rg "from 'highlight\.js'" src/` — verify no bare `highlight.js` import remains
3. `hljs.listLanguages()` in browser DevTools console — lists all registered language IDs
4. TypeScript compile errors at build time if any of the 40 imports are unused (indicates a missing `registerLanguage` call)

### Failure State
- If the `vendor-markdown` chunk stays above 500 KB after this task, it means the `highlight.js` entry in `manualChunks` (vite.config.ts) is still forcing the full bundle — that's T02's responsibility, not T01's.
- If `pnpm build` fails with `error TS2305: Module ... has no exported member`, one of the 40 language module paths is wrong.
- Unhighlighted `.tf` files after this change are expected (maps to `ini`, not a perfect match).

## Verification

- `pnpm build` completes without TypeScript errors (confirms all imports are valid and all variables are used per `noUnusedLocals: true`)
- `rg "from 'highlight\.js'" src/` returns only lines matching `highlight.js/lib/core` or `highlight.js/lib/languages/` or `highlight.js/styles/` — no bare `'highlight.js'` import

## Inputs

- `src/components/project/file-browser.tsx` — the only file importing full highlight.js bundle

## Expected Output

- `src/components/project/file-browser.tsx` — modified with selective imports, language registrations, fixed mappings, and replaced fallback
