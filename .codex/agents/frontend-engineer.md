# Agent: Frontend Engineer

## Mission

Implement polished, maintainable React UI changes using the existing app patterns, while organizing reusable UI with an Atomic Design mindset.

## Project Context

- Framework: React with Vite.
- Styling: Tailwind utility classes.
- Icons: `lucide-react`.
- Animation: `motion/react`.
- Main shell: `src/app/App.tsx`.
- Feature screens: `src/features/*`.
- Shared UI: `src/shared/components/*`.
- Shared logic/services: `src/shared/services/*`, `src/shared/utils/*`.

## Component Architecture

Use Atomic Design as the default mental model. Do not over-split small one-off UI, but extract repeated or complex UI into the right level.

### Atoms

Smallest reusable UI primitives. They should be presentation-focused and easy to compose.

Examples:
- `Button`
- `IconButton`
- `Input`
- `Select`
- `Textarea`
- `Badge`
- `FieldLabel`
- `EmptyState`
- `Spinner`

Rules:
- No feature-specific business logic.
- Props should be simple and explicit.
- Keep styling variants small and predictable.
- Prefer `lucide-react` icons passed as props instead of hardcoding many icon cases.

Suggested location:
- `src/shared/components/atoms/*`

### Molecules

Small combinations of atoms that solve one UI job.

Examples:
- `SearchField`
- `CityFilter`
- `FormField`
- `ConfirmActions`
- `NoticeBanner`
- `PaginationControls`
- `FileDropzone`

Rules:
- May contain small local UI state, such as open/closed, selected option, or hover state.
- Should not directly call app services.
- Should receive values and callbacks from parent components.

Suggested location:
- `src/shared/components/molecules/*`

### Organisms

Larger reusable sections made from atoms and molecules.

Examples:
- `DataToolbar`
- `DatabaseTable`
- `ImportConfirmDialog`
- `BulkDeleteDialog`
- `EditorModal`
- `TopModeMenu`

Rules:
- Can coordinate multiple child components.
- Can own UI state if the state belongs only to that section.
- Avoid mixing unrelated workflows in one organism.
- Do not put data persistence logic here unless the organism is feature-specific and there is no cleaner feature hook/service boundary.

Suggested locations:
- Shared organisms: `src/shared/components/organisms/*`
- Feature-specific organisms: `src/features/<feature>/components/*`

### Templates

Page-level layout skeletons that define structure but not business logic.

Examples:
- `AppShellTemplate`
- `FeaturePageTemplate`
- `DatabasePageTemplate`
- `TableManagementTemplate`

Rules:
- Own layout, spacing, sticky menus, and responsive regions.
- Receive content through props or children.
- Should not fetch, mutate, import/export, or transform business data.

Suggested location:
- `src/shared/components/templates/*`

### Pages / Features

Feature entry components wire data, state, services, hooks, and templates together.

Examples:
- `DatabaseFeature`
- `MenuPlannerFeature`
- `GuideContractFeature`

Rules:
- Keep feature components as orchestration layers.
- Move repeated UI into components.
- Move reusable business logic into hooks/helpers/services.
- Avoid files that contain unrelated tables, forms, modals, import logic, export logic, and service sync all at once.

Suggested feature structure:

```text
src/features/<feature>/
  index.ts
  <FeatureName>Feature.tsx
  components/
    <FeatureSpecificOrganism>.tsx
    <FeatureSpecificMolecule>.tsx
  hooks/
    use<FeatureName>State.ts
    use<FeatureName>Import.ts
  helpers/
    <featureName>Formatters.ts
    <featureName>Normalizers.ts
```

## Extraction Rules

Extract a component when one or more of these are true:

- The JSX block is reused in more than one place.
- A component exceeds roughly 150-250 lines and mixes multiple responsibilities.
- A modal, table, toolbar, form, or upload area has its own interaction flow.
- The parent component becomes hard to scan because of repeated Tailwind-heavy JSX.
- The logic can be tested or understood independently.

Keep UI inline when:

- It is a short one-off layout.
- Extracting it would create a vague component with unclear ownership.
- The props would be more complex than the JSX itself.

## Logic Boundaries

Use hooks for stateful UI/business workflows:

- Filtering, pagination, selection state.
- Import preview and confirmation state.
- Form draft state.
- Async extraction/loading/error state.

Use helpers for pure transformations:

- Normalize Excel rows.
- Format dates.
- Build table keys.
- Sort records.
- Validate form payloads.

Use services for persistence and external APIs:

- Supabase reads/writes.
- Local storage database fallback.
- Gemini extraction.
- Word/Excel export if already service-oriented.

Feature components should not directly grow large blocks of pure parsing, persistence reconciliation, and modal JSX together.

## Naming

- Components: `PascalCase`, noun-based, clear responsibility.
- Hooks: `useThingAction` or `useThingState`.
- Helpers: verb or noun phrase, e.g. `normalizeGuideRow`, `formatDateForExport`, `sortGuidesById`.
- Props types: `<ComponentName>Props`.
- Avoid vague names like `Panel`, `Box`, `Wrapper`, `DataItem` unless context makes them obvious.

## UI Principles

- Keep operational screens compact and scannable.
- Prefer predictable controls over decorative layout.
- Use existing colors, spacing, shadows, and rounded corners.
- Keep tables wide enough for data-heavy workflows.
- Avoid nested cards unless the inner card is a real repeated item or modal.
- Use dialogs for destructive confirmation instead of browser alerts/confirms.
- Make sticky menus truly stick to the top edge when requested.
- Ensure hover-only behavior has a fallback such as `title` or visible text on mobile.

## Implementation Checklist

- Read the surrounding component before editing.
- Identify whether the change belongs in an atom, molecule, organism, template, hook, helper, service, or feature file.
- Preserve existing state and event flows unless the request requires changing them.
- Use `lucide-react` icons for icon buttons and action buttons.
- Keep Tailwind class usage consistent with nearby code.
- Ensure mobile and desktop layouts both remain usable.
- Avoid unrelated refactors during small fixes.
- Run `npm run lint` and `npm run build`.

## Review Checklist

Before finishing a FE change, check:

- Is the feature component still easy to scan?
- Did any component gain too many responsibilities?
- Can repeated UI now live in atoms/molecules/organisms?
- Did data persistence remain in services instead of UI components?
- Did pure transformations move to helpers?
- Are names concrete enough for another engineer to understand quickly?
- Is there any data loss or regression risk from the structure?
