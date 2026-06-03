# Skill: Refactor Plan

Use this when changing structure without intending to change behavior.

## Safe Refactor Workflow

1. Identify current behavior and user workflows.
2. Find the smallest independent slice.
3. Move pure helpers first.
4. Move presentational components next.
5. Move stateful workflows into hooks only after helper/component boundaries are clear.
6. Keep service behavior unchanged unless the refactor is specifically about persistence.
7. Run checks after each meaningful slice when practical.

## Slice Order For Large Feature Files

Prefer this order:

1. Constants and pure helpers.
2. Types.
3. Small atoms/molecules.
4. Tables/forms/modals.
5. Hooks for filtering, pagination, selection, import state.
6. Service-level persistence cleanup.

## Guardrails

- Do not mix refactor and feature behavior unless explicitly requested.
- Preserve exports and import paths where possible.
- Avoid renaming many concepts at once.
- Keep final diff reviewable.
- If behavior changes are discovered as necessary, call them out explicitly.

## Verification

For UI refactors:
- `npm run lint`
- `npm run build`
- Manual smoke test for affected feature.

For data-flow refactors:
- Test create/edit/delete/import paths where possible.
- Check that merge does not behave like replace.
