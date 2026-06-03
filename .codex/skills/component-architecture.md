# Skill: Component Architecture

Use this when creating, refactoring, or reviewing React components.

## Atomic Design Levels

Atoms:
- Small reusable primitives.
- No feature-specific business logic.
- Examples: `Button`, `IconButton`, `Input`, `Select`, `Badge`, `Spinner`.

Molecules:
- Small combinations of atoms for one UI job.
- Examples: `SearchField`, `FormField`, `PaginationControls`, `NoticeBanner`.

Organisms:
- Larger UI sections with multiple interactions.
- Examples: `DataToolbar`, `DatabaseTable`, `EditorModal`, `TopModeMenu`.

Templates:
- Layout skeletons for pages/features.
- No fetching, mutation, parsing, or persistence.

Feature components:
- Wire data, state, hooks, services, and templates.
- Should read like orchestration, not a dumping ground.

## Extraction Checklist

Extract when:

- JSX is repeated.
- A block has its own interaction state.
- A file is hard to scan because UI and logic are interleaved.
- A modal/table/form can be named clearly.
- Logic can move to a hook/helper/service.

Do not extract when:

- The JSX is short and one-off.
- The extracted component would have vague props.
- The abstraction hides important feature context.

## Naming

- Use concrete nouns for components.
- Use `Props` suffix for prop types.
- Avoid generic names like `Box`, `Section`, `Wrapper` unless locally obvious.
- Prefer feature prefix for feature-only components when helpful, e.g. `DatabaseToolbar`.

## Output For Review

When reviewing structure, group recommendations:

- High: reduces bug/data-loss risk.
- Medium: improves maintainability soon.
- Low: cleanup only.
