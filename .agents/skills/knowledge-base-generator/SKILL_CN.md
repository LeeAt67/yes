---
name: knowledge-base-generator
description: 解析现有前端项目代码库，并为每个目录生成结构化的 AGENTS.md 知识库文档。当用户需要为前端项目创建全面的文档以帮助 LLM 理解代码结构，或被要求为 React/前端项目生成知识库、文档结构或 AGENTS.md 文件时使用。
---

# 知识库生成器 (Knowledge Base Generator)

为前端项目生成结构化的 AGENTS.md 文档，使 LLM 能够快速理解并操作现有代码库。

## ⚠️ 重要：全局规则

**在执行此技能前，你必须阅读并严格遵守 [全局规则 (GLOBAL_RULES.md)](assets/GLOBAL_RULES.md)。**

核心要求：

- 💎 **知识价值密度**：严禁同义反复。必须解释代码的“灵魂”（意图、副作用、转换逻辑）。
- 🏗️ **TS 共生**：严禁搬运 TS 定义。以 TS 为事实来源，专注于描述**非类型知识**。
- 🚫 **严禁幻觉**：所有标识符必须从源码中精确复制。
- 🔍 **深度代码分析**：必须分析真实源码，而非仅根据模板生成。
- 📁 **路径约束**：**严禁**创建除 `.knowledge-base/` 和 `AGENTS.md` 之外的任何文件。
- 🎯 **质量标准**：每一句话都必须基于真实的源码分析。
- 📋 **状态管理**：遵循 `.knowledge-base/05-generation-checklist.json` 中的三状态体系进行并行处理。
- ⛔ **文件创建限制**：仅允许使用 `create_file` 工具创建 `.knowledge-base/*.json` 和 `**/AGENTS.md` 文件。
- 🔄 **演进式编辑协议 (Evolutionary Editing Protocol)**：
    1. **针对现有文档**：如果 `AGENTS.md` 已存在，**严禁**重新应用模板。应读取文件，将其视为主要事实来源，并进行**直接优化**。
    2. **差异分析**：将现有文档与相关模板对比。如果缺失强制章节（如 `## 渲染逻辑`、`## 测试用例覆盖`），则将其插入现有流程。
    3. **内容保留**：严格保留所有 `MANUAL ADDITIONS` 区域和现有的高价值分析。
    4. **针对新文档**：严格遵循**不可变模板协议**。
- 📜 **不可变模板协议 (Immutable Template Protocol)**：仅在创建**新**文档时使用。
    1. 先 `read_file` 目标模板以获取精确的结构“骨架”。
    2. **严禁**修改、删除或添加任何 `##` 标题。
    3. 将所有指示性文本和“模板示例”替换为真实的分析。
- 📖 **权威来源意识**：预先存在的 `AGENTS.md` 文件被视为**权威来源**。
    1. 尊重并继承预先识别的“不可见链路”或副作用。
    2. 审计现有内容：如果已提供深度见解，则专注于填补缺失的空白而非重写。
- 🔍 **E2E 优先审计策略**：必须将 E2E 测试视为理解业务逻辑的第一事实来源。
    1. 在分析源码或编写 `## 渲染逻辑` 前，**必须**扫描 `e2e/tests/quality/` 寻找相关的 `.spec.js` 文件。
    2. 在详细描述逻辑前，先在 `## 测试用例覆盖` 章节中记录这些测试。
    3. 使用测试中定义的用户交互路径来引导对实现代码的分析。
- 🔄 **安全合并写入协议 (Safe Merge-Write Protocol)**：更新现有 `AGENTS.md` 时，应优先采用**读取-合并-写入**循环，而非简单的增量替换，以确保结构质量：
    1. **必须**先读取整个现有文档。
    2. 识别并保留 `<!-- MANUAL ADDITIONS START -->` 与 `<!-- MANUAL ADDITIONS END -->` 之间的所有内容。
    3. 将新内容（基于最新代码分析和模板规则）与保留的手动区域进行合成。
    4. 使用 `write_file` 更新文档。这允许进行满足 100 行“深度审计”标准所需的大规模结构扩展，而不受脆性字符串匹配的限制。
    5. **自检**：在写入前，确认没有意外遗漏任何预先存在的逻辑或手动注释。

## 工作流

### 第一步：初始化与参数解析

**1.1 创建工作目录**

在项目根目录创建 `.knowledge-base/` 文件夹，用于存储所有中间结果。

**1.2 解析配置**

- `--base-dir <path>`: 要扫描的基准目录（默认：`src/`）
- `--depth <n>`: 最大扫描深度
- `--exclude <dirs>`: 以逗号分隔的排除目录
- `--known-pages <path>`: 包含已知路由路径的 JSON 文件
- `--target-path <path>`: 将输出的 JSON 过滤到特定的目录分支

### 第二步：扫描与初步分类

**2.1 扫描目录树**

使用 `scripts/scan_and_classify.js` 扫描项目：

```bash
node scripts/scan_and_classify.js --base-dir <base-dir> [--known-pages path] [--target-path path] [--output .knowledge-base/01-scan-results.json]
```

**2.2 基于结构的分类**

初步分类逻辑：
- **module**: 包含 `pages/` 和 `components/` 子目录。
- **state**: 包含 `store/`、`model/`、`reducer/` 目录。
- **page**: 通过 `known-pages` 或高强度路由信号确认。
- **business-component**: 包含 JSX 且含有业务逻辑。
- **generic-component**: 纯 UI 展示。
- **巨型文件检测**: 自动标记 > 500 行的文件进行重点审计。

**2.3 LLM 辅助模块识别**

如果结构模糊，使用 LLM 基于功能分组识别模块。

**2.4 确定最终分类**

输出：`.knowledge-base/04-final-classification.json`。

### 第三步：生成根目录 AGENTS.md

使用 `assets/templates/root-template.md` 在项目根目录创建总览文档：
1. 提取 `package.json` 中的项目名称。
2. 生成模块索引。
3. 初始化任务清单：`.knowledge-base/05-generation-checklist.json`。

### 第四步：生成与校验目录 AGENTS.md

**4.1 任务分配**

在 `.knowledge-base/05-generation-checklist.json` 中管理状态：`pending` -> `in_progress` -> `completed`。

**4.2 LLM 驱动的代码分析与生成**

⚠️ **核心：知识胜于格式**
- **深度模式识别**：识别“灵魂”逻辑。
- **识别“不可见链路”**：记录副作用。
- **测试用例验证**：**严禁**凭空编造测试。
- **自检**：若产出不足 100 行，必须检查是否遗漏了深度分析。

**4.3 增量编辑与重试**

- **严禁直接覆盖**：对现有文件使用安全合并写入协议。
- **重试逻辑**：如果替换失败，重新读取并重试。

**4.4 增量校验与自修复**

在生成每个文件后立即使用 `scripts/validate_single.js`。校验循环必须持续直到成功。

**调用示例**：
```bash
node .agents/skills/knowledge-base-generator/scripts/validate_single.js <AGENTS.md路径> <类型>
# 例如：
node .agents/skills/knowledge-base-generator/scripts/validate_single.js src/components/MyComponent/AGENTS.md business-component
```

### 第五步：最终审查与报告

1. 运行 `scripts/validate_batch.js` 生成全面报告。
2. 只有当所有强制目录都拥有合规的 `AGENTS.md` 文件时，任务才被视为**成功**。
3. 提供包含已校验、已跳过和失败文件的摘要。

## 关键规则

- **使用 .knowledge-base/ 存储所有中间文件**，保持过程透明。
- **LLM 驱动的内容生成**：每一份 AGENTS.md 都必须由 LLM 在分析真实代码后生成。
- **始终保留手动添加内容**，即 `<!-- MANUAL ADDITIONS START -->` 与 `<!-- MANUAL ADDITIONS END -->` 之间的部分。
- **在根目录 AGENTS.md 中使用相对路径**进行链接。

## Windows 环境兼容性建议

1. **Shell 命令**：避免在 `run_shell_command` 中使用 `&&`；PowerShell 推荐使用 `;`。
   - 行数统计示例：`(Get-Content <file>).Count`。
2. **终端编码**：运行 `chcp 65001` 以确保 UTF-8 输出显示正常。

## 目录类型参考

| 类型 | 必要性 | 对应模板 |
| :--- | :--- | :--- |
| `module` | 强制 | `module-template.md` |
| `page` | 强制 | `page-template.md` |
| `business-component` | 复杂度驱动 | `business-component-template.md` |
| `state` | 复杂度驱动 | `state-template.md` |
| `hook` | 复杂度驱动 | `hook-template.md` |

## 资源

### 脚本
- `scripts/scan_and_classify.js`: 精准扫描器。
- `scripts/validate_agents.js`: 策略感知校验器。
- `scripts/validate_batch.js`: 批量校验器。
- `scripts/validate_single.js`: 单文件校验器。

### 模板
- 位于 `assets/templates/*.md`。
