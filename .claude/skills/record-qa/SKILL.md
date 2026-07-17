---
name: record-qa
description: "Use when user says '记录一下问题' / '记录这个问题' / '记一下' or asks to log a technical issue for future reference. Records the question in docs/<topic>/questions.md AND generates the answer in docs/<topic>/answers.md. Only records questions, not answers."
argument-hint: 'Describe the problem you want to record'
---

# Record Q&A — 问题记录与解答

## Trigger

激活条件：
- 用户说 **"记录一下问题"**、"记录这个问题"、"记一下"
- 用户说 **"把这个问题记下来"**
- 用户描述了一个技术问题并明确要归档

## Procedure

### Step 1: 确定分类目录

根据问题所属领域，确定 `docs/` 下的目录：

| 领域 | 目录 |
|------|------|
| 构建工具（Rspack/SWC/webpack） | `docs/构建工具/` |
| 路由（React Router） | `docs/路由/` |
| 状态管理（MobX） | `docs/状态库/` |
| 组件 | `docs/组件/` |
| 样式（Tailwind/CSS） | `docs/样式/` |
| 其他 | `docs/` |

如目录不存在则创建。

### Step 2: 记录问题到 questions.md

追加到 `docs/<topic>/questions.md`，格式：

```markdown
---

## Q{n}: {问题标题}

**日期**：{今天}

**现象**：{发生了什么}

**排查方向**：
- {排查点 1}
- {排查点 2}
```

**规则**：只记录现象和排查方向，不记录答案。

### Step 3: 记录答案到 answers.md

追加到 `docs/<topic>/answers.md`，格式：

```markdown
---

## Q{n}: {问题标题}

**日期**：{今天}

**根因**：{一句话总结}

**解决方案**：
1. {步骤 1}
2. {步骤 2}

**关键代码**：
\`\`\`
{代码片段}
\`\`\`
```

### Step 4: 确认

向用户确认已记录的位置。

## 示例

用户说："记录一下问题，Rspack 配置了 tailwindcss-animate 插件后报 require is not defined"

AI 执行：
1. 确定分类：`docs/构建工具/`
2. 追加到 `questions.md`
3. 追加到 `answers.md`

## Anti-patterns

- ❌ 把答案写到 questions.md
- ❌ 不创建对应的 answers.md
- ❌ 目录不存在时也不创建
