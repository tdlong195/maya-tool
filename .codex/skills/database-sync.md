# Skill: Database Sync

Use this when changing `appDatabase`, imports, CRUD flows, or Supabase-related UI.

## Safety Rules

- Never delete all rows before an upsert unless the user explicitly chooses replace.
- Be careful with foreign keys, especially `restaurant_menus.restaurant_id`.
- When saving restaurants, avoid deleting menus unintentionally through cascade.
- Surface detailed Supabase errors: message, code, details, and hint when available.
- Keep local optimistic state consistent with remote save failures.

## Verification

- Add or edit a restaurant without losing existing menus.
- Save a menu only when its restaurant exists.
- Import restaurant/menu files and confirm merge/replace behavior.
- Run `npm run lint`.
- Run `npm run build` when UI is touched.

