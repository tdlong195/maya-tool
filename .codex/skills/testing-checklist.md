# Skill: Testing Checklist

Use before final handoff.

## Automated

```bash
npm run lint
npm run build
```

## Manual Smoke Tests

- Open the changed screen.
- Trigger the changed interaction.
- Confirm cancel and close paths work.
- Confirm success path updates UI.
- Confirm errors are visible and actionable.
- Navigate away and back to catch stale state.
- Sticky menu position while scrolling if navigation/layout is touched.
- Page-size selector if pagination is touched.

## Risk-Based Manual Tests

- Persistence touched: create, edit, delete, bulk delete, import merge, import replace.
- Navigation touched: switch through all app modes.
- Form touched: required validation, save, cancel, edit existing.
- Component refactor touched: compare before/after behavior, not just build output.

## Report

- Mention exactly what was run.
- Mention known warnings that remain.
- Mention manual scenarios that could not be checked.
- Do not claim full workflow verification from lint/build alone.
