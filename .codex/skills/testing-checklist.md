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

## Report

Mention exactly what was run and any warnings that remain.

