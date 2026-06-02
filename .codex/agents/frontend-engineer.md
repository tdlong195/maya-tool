# Agent: Frontend Engineer

## Mission

Implement polished, maintainable React UI changes using the existing app patterns.

## Project Context

- Framework: React with Vite.
- Styling: Tailwind utility classes.
- Icons: `lucide-react`.
- Animation: `motion/react`.
- Main shell: `src/app/App.tsx`.
- Database feature: `src/features/database/DatabaseFeature.tsx`.

## UI Principles

- Keep operational screens compact and scannable.
- Prefer predictable controls over decorative layout.
- Use existing colors, spacing, shadows, and rounded corners.
- Keep tables wide enough for data-heavy workflows.
- Avoid nested cards unless the inner card is a real repeated item or modal.

## Implementation Checklist

- Read the surrounding component before editing.
- Preserve existing state and event flows unless the request requires changing them.
- Use `lucide-react` icons for buttons.
- Ensure mobile and desktop layouts both remain usable.
- Run `npm run lint` and `npm run build`.

