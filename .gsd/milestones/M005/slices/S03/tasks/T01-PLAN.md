---
estimated_steps: 4
estimated_files: 2
skills_used:
  - react-best-practices
---

# T01: Add success toasts to all user-facing mutations

**Slice:** S03 — Micro-interactions & Feedback
**Milestone:** M005

## Description

18 user-facing mutations in `src/lib/queries.ts` have `toast.error` on failure but no `toast.success` on success. This task adds contextual success toasts to each one. The `toast` import from `"sonner"` is already available in the file. Every mutation already has an `onSuccess` callback — we add `toast.success("Message")` as the first line of each.

The mutations to update and their messages:

1. `useImportProjectEnhanced` (line ~310) → `toast.success("Project imported")`
2. `useCreateProject` (line ~336) → `toast.success("Project created")`
3. `useUpdateProject` (line ~365) → `toast.success("Project updated")`
4. `useDeleteProject` (line ~380) → `toast.success("Project deleted")`
5. `useIndexProjectMarkdown` (line ~404) → `toast.success("Documentation indexed")`
6. `useDeleteProjectFile` (line ~442) → `toast.success("File deleted")`
7. `useUpdateSettings` (line ~463) → `toast.success("Settings saved")`
8. `useClearCommandHistory` (line ~606) → `toast.success("Command history cleared")`
9. `useCreateSnippet` (line ~649) → `toast.success("Snippet created")`
10. `useUpdateSnippet` (line ~663) → `toast.success("Snippet saved")`
11. `useDeleteSnippet` (line ~676) → `toast.success("Snippet deleted")`
12. `useCreateAutoCommand` (line ~705) → `toast.success("Auto-command created")`
13. `useUpdateAutoCommand` (line ~719) → `toast.success("Auto-command updated")`
14. `useDeleteAutoCommand` (line ~733) → `toast.success("Auto-command deleted")`
15. `useToggleAutoCommand` (line ~747) → Use the returned `AutoCommand` result: `toast.success(\`Auto-command ${result.enabled ? "enabled" : "disabled"}\`)`. Change `onSuccess: (_, variables)` to `onSuccess: (result, variables)`.
16. `useMarkAllNotificationsRead` (line ~788) → `toast.success("All notifications marked read")`
17. `useClearNotifications` (line ~802) → `toast.success("Notifications cleared")`
18. `useGsd2ApplyDoctorFixes` (line ~1306) → `toast.success("Doctor fixes applied")`

**Intentionally skipped** (silent background operations, not user-facing):
- `useToggleFavorite` — star icon toggles visually
- `useFinalizeProjectCreation` — internal wizard step
- `useClearAllData` — has its own dialog state management
- `useExportData` — has its own dialog with success/error states
- `useClearAppLogs` — the logs page shows the result inline
- `useAddCommandHistory` — background recording
- `useToggleScriptFavorite` — star icon toggles visually
- `useMarkNotificationRead` — badge decrements visually
- `useGsd2ResolveCapture` — action happens in a dialog with its own success state

**Note on `useUpdateSettings`:** The call site in `settings.tsx` uses `mutateAsync` and sets `setHasChanges(false)` afterward. Adding the toast in the hook's `onSuccess` is correct — TanStack Query fires `onSuccess` on the hook even when `mutateAsync` is used. No change needed in `settings.tsx`.

## Steps

1. Open `src/lib/queries.ts` and add `toast.success("...")` as the first statement inside `onSuccess` for each of the 18 mutations listed above.
2. For `useToggleAutoCommand`, change the `onSuccess` signature from `(_, variables)` to `(result, variables)` and add `toast.success(\`Auto-command ${result.enabled ? "enabled" : "disabled"}\`)`.
3. Run `pnpm build` to verify no TypeScript errors.
4. Run `pnpm test --run` to verify all tests pass.

## Must-Haves

- [ ] All 18 listed mutations have `toast.success` with a contextual message (not generic "Success")
- [ ] `useToggleAutoCommand` uses the returned `AutoCommand.enabled` field to pick "enabled" vs "disabled"
- [ ] No toast added to the 9 intentionally-skipped silent mutations
- [ ] `pnpm build` exits 0
- [ ] `pnpm test --run` passes 143+ tests

## Verification

- `rg 'toast\.success' src/lib/queries.ts | wc -l` returns ≥ 28 (10 existing git/data-management toasts + 18 new)
- `pnpm build` exits 0
- `pnpm test --run` passes all tests

## Inputs

- `src/lib/queries.ts` — the file containing all mutation hooks; already imports `toast` from `"sonner"`
- `src/lib/tauri.ts` — reference for `AutoCommand` interface (has `enabled: boolean` field)

## Expected Output

- `src/lib/queries.ts` — 18 mutations now have `toast.success` calls in their `onSuccess` callbacks
