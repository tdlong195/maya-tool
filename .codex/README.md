# Codex Workspace Guide

This folder is the operating guide for AI work in this project. Use agents for role-specific thinking and skills for repeatable workflows.

## Core Workflow

- `workflow.md`: Default orchestration model for choosing agents, skills, verification, and handoff format.

## How To Use

Ask Codex to use one or more files explicitly:

```text
Hãy dùng .codex/agents/frontend-engineer.md và .codex/skills/frontend-layout.md để refactor màn Database.
```

For review work:

```text
Hãy dùng .codex/agents/reviewer.md để review thay đổi hiện tại. Chỉ đưa findings, không sửa code.
```

For larger work:

```text
Hãy dùng .codex/workflow.md để xử lý yêu cầu này end-to-end.
```

## Agents

- `agents/project-manager.md`: Scope, prioritization, acceptance criteria, and delivery tracking.
- `agents/architect.md`: Source structure, boundaries, refactor strategy, and maintainability.
- `agents/frontend-engineer.md`: React/Vite UI implementation with Atomic Design conventions.
- `agents/data-engineer.md`: Supabase/local database flows, data integrity, import/export, and data-loss prevention.
- `agents/reviewer.md`: Code review stance focused on bugs, regressions, data loss, and architectural risk.
- `agents/tester.md`: Verification strategy and test execution checklist.

## Skills

- `skills/codebase-orientation.md`: How to inspect this repo before changing code.
- `skills/frontend-layout.md`: UI/layout conventions for this application.
- `skills/component-architecture.md`: Atomic Design component extraction rules.
- `skills/refactor-plan.md`: Safe refactor workflow for large files/features.
- `skills/database-sync.md`: Supabase/local database safety rules.
- `skills/data-loss-prevention.md`: Checklist for delete/import/replace/upsert changes.
- `skills/testing-checklist.md`: Commands and manual checks before handoff.
- `skills/release-notes.md`: Concise change summary format.
- `skills/prompt-playbook.md`: Copyable prompts for common AI workflows.

## Recommended Agent Combos

- UI bug or layout polish: `frontend-engineer` + `frontend-layout`.
- Large component cleanup: `architect` + `frontend-engineer` + `component-architecture` + `refactor-plan`.
- Database/import/save issue: `data-engineer` + `database-sync` + `data-loss-prevention`.
- Pre-merge review: `reviewer` + `tester`.
- Feature delivery end-to-end: `project-manager` + relevant specialist + `tester`.

## Project Guardrails

- Do not silently remove data from Supabase when saving a single entity.
- Prefer service/helper/hook boundaries over growing feature files indefinitely.
- Keep operational UI compact, scannable, and responsive.
- Use dialogs for destructive actions.
- Always verify with `npm run lint` and `npm run build` after code changes unless the task is docs-only.
