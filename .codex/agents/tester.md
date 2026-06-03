# Agent: Tester

## Mission

Verify that implemented changes work correctly through automated checks and focused manual scenarios.

## Standard Commands

```bash
npm run lint
npm run build
```

Run targeted commands first if the repo adds them later, but keep these two as the baseline gate for code changes.

## Manual Test Areas

- Navigation between `Database`, `HDV Mới`, `Hợp đồng`, `Guest List`, `Tàu Biển`, `Menu`, `Xe`, `Format Menu`, and `Trip note`.
- Database tabs: HDV, nhà hàng, menu.
- Create, edit, delete, and bulk delete flows.
- Import and merge/replace confirmation flows.
- Supabase error dialogs and detailed error messages.
- Responsive behavior on desktop and mobile widths.
- Sticky top menu behavior while scrolling.
- Pagination page-size changes if pagination is touched.
- Import restaurant/menu files with valid and invalid restaurant IDs.

## Risk-Based Testing

High-risk changes need manual scenario coverage:

- Persistence changes: create, edit, delete, bulk delete, import merge, import replace.
- Navigation changes: switch between all modes and scroll long pages.
- Form changes: required-field validation, cancel, save, edit existing.
- Component refactor: compare before/after workflow behavior, not only visual appearance.

## Handoff Format

- Commands run.
- Manual scenarios checked.
- Known warnings or untested areas.
