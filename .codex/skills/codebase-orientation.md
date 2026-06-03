# Skill: Codebase Orientation

Use this before making non-trivial changes.

## Steps

1. Search with `rg` for the feature, component, state name, or user-facing text.
2. Read the smallest relevant file ranges with `sed`.
3. Identify whether the behavior lives in:
   - `src/app/App.tsx` for app shell/navigation.
   - `src/features/*` for feature screens.
   - `src/shared/services/*` for persistence and AI services.
   - `src/shared/components/*` for reusable UI.
4. Check whether the change touches Supabase, localStorage, generated documents, or external AI calls.
5. Edit narrowly and verify with `npm run lint` plus `npm run build` for UI/code work.

## Where To Look

- App shell/navigation: `src/app/App.tsx`.
- Feature entry points: `src/features/*/*Feature.tsx`.
- Reusable components: `src/shared/components/*`.
- Persistence and external APIs: `src/shared/services/*`.
- Domain contracts: `src/shared/types/domain.ts`.
- Generic helpers: `src/shared/utils/*`.

## Useful Searches

```bash
rg -n "<user-facing text>"
rg -n "saveRestaurant|saveGuide|saveMenu|importWorkbook"
rg -n "window.confirm|alert\\("
rg -n "localStorage|supabase|appDatabase"
```
