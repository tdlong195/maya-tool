# AI Workflow

Use this as the default orchestration model for non-trivial work.

## 1. Orient

Use:
- `skills/codebase-orientation.md`

Actions:
- Search with `rg`.
- Read only relevant files first.
- Identify whether the change is UI, data, architecture, testing, or docs.

## 2. Choose The Role

UI/layout:
- `agents/frontend-engineer.md`
- `skills/frontend-layout.md`
- `skills/component-architecture.md` when components are involved.

Architecture/refactor:
- `agents/architect.md`
- `skills/refactor-plan.md`
- `skills/component-architecture.md`

Database/data safety:
- `agents/data-engineer.md`
- `skills/database-sync.md`
- `skills/data-loss-prevention.md`

Review:
- `agents/reviewer.md`

Testing:
- `agents/tester.md`
- `skills/testing-checklist.md`

Planning/scope:
- `agents/project-manager.md`

## 3. Execute

- Make the smallest useful change that satisfies the request.
- Preserve existing user data and workflow behavior.
- Do not combine broad refactor with feature changes unless requested.
- Prefer helpers/hooks/services/components over growing a single feature file.

## 4. Verify

For code changes:

```bash
npm run lint
npm run build
```

For high-risk changes, add focused manual scenarios from `skills/testing-checklist.md`.

## 5. Handoff

Use this short format:

```text
Đã làm:
- ...

Kiểm tra:
- ...

Ghi chú:
- ...
```

Mention honestly when something was not tested.

## Default Prompt Shortcut

```text
Hãy dùng .codex/workflow.md để xử lý yêu cầu này end-to-end.
<mô tả yêu cầu>
```
