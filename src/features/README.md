Feature folders are the target home for each app mode.

The first refactor pass keeps behavior in `src/app/App.tsx` while shared
types, services, components, and utilities are extracted. Move one feature at a
time into its folder and keep the app buildable after each move.
