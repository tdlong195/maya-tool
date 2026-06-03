# Skill: Database Sync

Use this when changing `appDatabase`, imports, CRUD flows, or Supabase-related UI.

## Safety Rules

- Treat Supabase as the source of truth when configured.
- Keep local fallback behavior equivalent where practical.
- Never delete all rows before an upsert unless the user explicitly chooses replace.
- For merge/import, update matching IDs and keep unrelated existing rows.
- For single-row create/edit/delete, prefer targeted service methods over full collection saves.
- Be careful with foreign keys, especially `restaurant_menus.restaurant_id`.
- When saving restaurants, avoid deleting menus unintentionally through cascade.
- Surface detailed Supabase errors: `message`, `code`, `details`, and `hint` when available.
- Keep local optimistic state consistent with remote save failures.

## Verification

- Add/edit one guide does not remove other guides.
- Add/edit one restaurant does not remove menus.
- Save a menu only when its restaurant exists.
- Import restaurant/menu workbook keeps valid restaurant-menu relationships.
- Confirm merge does not delete rows missing from the import file.
- Confirm replace requires explicit destructive confirmation.
- Bulk delete clears selection state after success.
- Run `npm run lint`.
- Run `npm run build` when UI is touched.
