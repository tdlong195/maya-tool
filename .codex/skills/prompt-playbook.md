# Skill: Prompt Playbook

Use this to ask AI for focused work.

## Review Structure

```text
Hãy dùng .codex/agents/reviewer.md và .codex/agents/architect.md để review structure source code hiện tại.

Tập trung vào:
- Folder/file organization
- Component nào quá lớn
- Logic nào nên tách hook/helper/service
- Data flow app/feature/service
- Rủi ro regression hoặc data loss
- Refactor priority high/medium/low

Chỉ đưa findings quan trọng, không sửa code.
```

## Implement UI Change

```text
Hãy dùng .codex/agents/frontend-engineer.md và .codex/skills/frontend-layout.md để implement yêu cầu này.

Yêu cầu:
<mô tả UI>

Sau khi làm xong chạy npm run lint và npm run build.
```

## Refactor Large Component

```text
Hãy dùng .codex/agents/architect.md, .codex/agents/frontend-engineer.md, .codex/skills/component-architecture.md và .codex/skills/refactor-plan.md.

Refactor <file/component> theo Atomic Design.
Không đổi behavior.
Làm theo từng bước nhỏ, chạy kiểm tra sau khi xong.
```

## Fix Database/Data Loss Bug

```text
Hãy dùng .codex/agents/data-engineer.md, .codex/skills/database-sync.md và .codex/skills/data-loss-prevention.md.

Bug:
<mô tả bug>

Yêu cầu:
- Không làm mất dữ liệu liên quan
- Hiển thị lỗi chi tiết nếu save fail
- Verify create/edit/delete/import nếu liên quan
```

## Test Current Changes

```text
Hãy dùng .codex/agents/tester.md và .codex/skills/testing-checklist.md để verify thay đổi hiện tại.
Chạy các command cần thiết và liệt kê manual test còn thiếu.
```

## Release Summary

```text
Hãy dùng .codex/skills/release-notes.md để viết summary ngắn cho thay đổi hiện tại.
```
