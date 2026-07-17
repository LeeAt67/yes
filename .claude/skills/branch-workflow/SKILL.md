---
name: branch-workflow
description: "Use when user asks to develop a new feature, build a new component, fix a bug, or start any code change. ENFORCES: always create a new branch from main before writing code; merge back to main ONLY with explicit user permission. NEVER merge or push to main without asking first."
---

# Branch Workflow

## Rule

**任何代码更改必须在独立分支上进行。严禁直接 push 到 main/master。**

## Trigger

激活条件（满足任一）：
- 用户要求开发新功能
- 用户要求修复 Bug
- 用户说"开始开发"、"实现 XXX"、"写一个新页面"
- 任何会产生代码变更的请求

## Procedure

### Step 1: 确认当前分支

```bash
git branch --show-current
```

如果当前在 `main` 或 `master` 分支上，**必须先切新分支**。

### Step 2: 创建功能分支

分支命名规范：`{type}/{short-desc}`

| 类型 | 前缀 | 示例 |
|------|------|------|
| 新功能 | `feat/` | `feat/login-page` |
| 修复 | `fix/` | `fix/button-disabled` |
| 重构 | `refactor/` | `refactor/kui-button` |
| 文档 | `docs/` | `docs/api-guide` |
| CI/CD | `ci/` | `ci/github-actions` |

```bash
git checkout -b feat/my-feature
```

### Step 3: 开发

在功能分支上进行所有代码更改、测试、提交。

```bash
# 多次提交是正常的
git add -A
git commit -m "feat: xxx"
```

### Step 4: 开发完成，请求合并许可

**⚠️ 关键规则：AI 不得自行合并。必须先向用户请求许可。**

当功能开发完成并通过验证后：

1. 向用户汇报分支上的所有更改摘要
2. **明确询问**："功能已开发完成，是否合并到 main 并推送？"
3. 仅在用户明确回复"合并"/"推送"/"可以"/"好"等肯定答复后，才执行合并

```bash
# 用户许可后执行：
git checkout main
git pull origin main
git merge feat/my-feature
git push origin main

# 清理
git branch -d feat/my-feature
git push origin --delete feat/my-feature
```

**禁止行为：**
- ❌ 在用户未明确许可的情况下执行 `git merge`
- ❌ 在用户未明确许可的情况下执行 `git push origin main`
- ❌ 假设用户"之前说过可以"而跳过询问

### Step 5: 确认

- 确认 `git branch --show-current` 显示 `main`
- 确认 push 成功无误

## Anti-patterns

- ❌ 在 `main` 分支上直接写代码
- ❌ 在 `main` 分支上直接 `git push`
- ❌ 用 `git push --force` 推 main
- ❌ 跳过分支直接在 main 上 commit
- ❌ **未获得用户明确许可就合并到 main**
- ❌ 用"之前你说过可以"作为跳过询问的理由

## 检查清单

在每次代码更改前，AI 必须确认：
- [ ] 是否在非 main 分支上？
- [ ] 分支名是否符合规范？
- [ ] 开发完成后是否已向用户请求合并许可？
- [ ] 仅在用户明确许可后才执行 merge + push
