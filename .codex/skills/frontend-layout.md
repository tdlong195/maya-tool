# Skill: Frontend Layout

Use this when changing screen layout, navigation, modals, forms, or responsive behavior.

## Guidelines

- Keep navigation visible for repeated operational workflows.
- Use sticky headers or menus when users scroll through long forms/tables.
- Sticky top menus should be flush to the top edge unless the design explicitly needs spacing.
- For database tables, preserve horizontal space and avoid constraining content too tightly.
- Use buttons with icons for direct actions.
- Use dialogs for destructive confirmation instead of browser alerts/confirms.
- Keep text labels short and action-oriented.
- Prefer compact operational layouts over marketing-style hero sections.
- Avoid hover-only navigation unless collapsed labels have `title` or mobile fallback.

## Checks

- Desktop layout does not waste horizontal space.
- Mobile layout remains usable with select/menu alternatives when needed.
- Text does not overflow buttons or compact nav items.
- Hover-only behavior has a fallback such as `title` where labels are hidden.
- Top navigation remains reachable after scrolling.
