# Skill: Data Loss Prevention

Use this before changing delete, import, replace, merge, sync, or save behavior.

## Red Flags

- A function named `saveX(allRows)` deletes rows missing from `allRows`.
- UI state is used as the full source of truth after a partial sync failure.
- Import merge and import replace share too much code.
- Parent rows are deleted without explicitly handling child rows.
- Error messages hide Supabase details.
- Optimistic UI updates happen before a write that can fail.

## Required Questions

- What exact rows can this operation create?
- What exact rows can this operation update?
- What exact rows can this operation delete?
- Can unrelated rows be deleted because they are missing from local state?
- Are foreign keys validated before write?
- What does the user see if the write fails?

## Safer Patterns

- Single add/edit: targeted upsert.
- Single delete: targeted delete by ID/key.
- Bulk delete: explicit selected IDs only.
- Merge import: upsert imported keys only.
- Replace import: confirmed destructive delete plus insert.
- Parent delete: delete children intentionally or block delete with explanation.

## Handoff Requirement

For any persistence change, final response should mention:

- Which operation was made safer.
- What data-loss scenario is prevented.
- Which checks were run.
