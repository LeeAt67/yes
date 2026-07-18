---
name: knowledge-base-generator
description: Parse existing frontend project codebases and generate structured AGENTS.md knowledge base documentation for each directory. Use when users need to create comprehensive documentation for frontend projects to help LLMs understand code structure, or when asked to generate knowledge base, documentation structure, or AGENTS.md files for React/frontend projects.
---

# Knowledge Base Generator

Generate structured AGENTS.md documentation for frontend projects, enabling LLMs to quickly understand and work with existing codebases.

## ⚠️ IMPORTANT: Global Rules

**Before executing this skill, you MUST read and strictly follow the [Global Rules (GLOBAL_RULES.md)](assets/GLOBAL_RULES.md).**

Key requirements:

- 💎 **Knowledge Value Density**: Strictly avoid shallow tautology. Explain the "soul" (intent, side effects, transformations).
- 🏗️ **TS Symbiosis**: NEVER copy TS definitions. Use TS as ground truth and focus on **Non-type Knowledge**.
- 🚫 **Anti-hallucination**: All identifiers must be copied exactly from source code.
- 🔍 **Deep code analysis**: Must analyze actual source code, not generate from templates.
- 📁 **Path constraints**: **STRICTLY FORBIDDEN** to create any files other than `.knowledge-base/` and `AGENTS.md`.
- 🎯 **Quality standards**: Every sentence must be based on real code analysis.
- 📋 **Status management**: Follow three-state system for parallel processing in `.knowledge-base/05-generation-checklist.json`.
- ⛔ **File creation limits**: Only use `create_file` tool for `.knowledge-base/*.json` and `**/AGENTS.md` files.
- 🔄 **Evolutionary Editing Protocol**:
    1. **For Existing Docs**: If an `AGENTS.md` already exists, **DO NOT** re-apply the template. Read the file, treat it as the primary source of truth, and perform **direct refinement**.
    2. **Gap Analysis**: Compare the existing doc against the relevant template. If mandatory sections (e.g., `## 渲染逻辑`, `## 测试用例覆盖`) are missing, insert them into the existing flow.
    3. **Preservation**: Strictly maintain all `MANUAL ADDITIONS` and existing high-value analysis.
    4. **For New Docs**: Follow the **Immutable Template Protocol** strictly.
- 📜 **Immutable Template Protocol**: Use only when creating **new** documentation.
    1. `read_file` the target template first to get the exact structural "skeleton".
    2. **STRICTLY FORBIDDEN** to modify, delete, or add any `##` headers. 
    3. **Replace all instructional text and "Template Examples"** with real analysis.
- 📖 **Authority Source Awareness**: Pre-existing `AGENTS.md` files are considered **authoritative**.
    1. Respect and carry forward pre-identified "Invisible Links" or side effects.
    2. Audit the existing content: if it already provides deep insight, focus on expanding missing gaps rather than rewriting.
- 🔍 **E2E-First Audit Strategy**: You MUST treat E2E tests as the primary source of truth for understanding business logic.
    1. Before analyzing source code or writing `## 渲染逻辑`, you MUST scan `e2e/tests/quality/` for relevant `.spec.js` files.
    2. Document these tests in the `## 测试用例覆盖` section *before* detailing the logic.
    3. Use the user interaction paths defined in the tests to guide your analysis of the implementation code.
- 🔄 **Safe Merge-Write Protocol**: When updating an existing `AGENTS.md`, you should prioritize a **Read-Merge-Write** cycle over simple incremental replacements to ensure structural quality:
    1. You MUST `read_file` the entire existing document first.
    2. Identify and preserve all content between `<!-- MANUAL ADDITIONS START -->` and `<!-- MANUAL ADDITIONS END -->`.
    3. Synthesize the new content (based on latest code analysis and template rules) with the preserved manual sections.
    4. Use `write_file` to update the document. This allows for the major structural expansion required to meet the 100-line "Serious Audit" standard without being blocked by brittle string matching.
    5. **Self-Audit**: Before writing, verify that no pre-existing logic or manual notes have been accidentally omitted.

## Workflow

### Step 1: Initialize and Parse Input Parameters

**1.1 Create Working Directory**

Create `.knowledge-base/` directory in project root to store all intermediate results:

```
project-root/
├── .knowledge-base/
│   ├── 01-scan-results.json          # Directory scan results
│   ├── 02-structure-analysis.json    # Structure-based classification
│   ├── 03-llm-module-analysis.json   # LLM-identified modules
│   ├── 04-final-classification.json  # Final directory classification
│   ├── 05-generation-checklist.json  # Generation task checklist with status
│   ├── 06-generation-log.json        # Document generation log
│   └── 07-validation-report.json     # Validation report
└── AGENTS.md                          # Generated root documentation
```

**1.2 Parse Configuration**

- `--base-dir <path>`: Base directory to scan (default: `src/`)
- `--depth <n>`: Maximum scan depth
- `--exclude <dirs>`: Comma-separated directories to exclude
- `--known-pages <path>`: (Recommended) JSON file with known route paths for precise 'page' identification
- `--target-path <path>`: Filter the output JSON to a specific directory branch

### Step 2: Scan and Initial Classification

**2.1 Scan Directory Tree**

Use `scripts/scan_and_classify.js` to scan the project:

```bash
node scripts/scan_and_classify.js --base-dir <base-dir> [--known-pages path] [--target-path path] [--output .knowledge-base/01-scan-results.json]
```

**2.2 Structure-Based Classification**

Initial classification logic (implemented in `scripts/scan_and_classify.js`):

- **module**: Contains both `pages/` and `components/` subdirectories.
- **state**: Contains `store/`, `model/`, `reducer/` directories.
- **page**: Confirmed via `known-pages` or high-strength route signals (not nested inside other pages).
- **business-component**: Contains JSX AND business logic (Hooks, API calls, Context).
- **generic-component**: Pure UI presentation, data from Props only.
- **giant-file detection**: Automatically flags files > 500 lines for special documentation.

**Component Classification Details**:

| Feature            | Generic Component               | Business Component                       |
| :----------------- | :------------------------------ | :--------------------------------------- |
| **Responsibility** | Single presentation feature     | Integrates multiple business features    |
| **Data Source**    | Entirely from Props             | External modules, services, APIs         |
| **Side Effects**   | None / UI only                  | API calls, global state change, tracking |
| **Template**       | `generic-component-template.md` | `business-component-template.md`         |

**2.3 LLM-Assisted Module Identification**

Use LLM to identify modules based on functional grouping if structure is ambiguous.

**2.4 Finalize Classification**

Output: `.knowledge-base/04-final-classification.json` - Complete classification with confidence scores.

### Step 3: Generate Root AGENTS.md

Create a comprehensive AGENTS.md in the project root directory:

1. Use `assets/templates/root-template.md`.
2. Extract project name from `package.json`.
3. Generate module index with links to directory AGENTS.md files.
4. Identify tech stack from dependencies.
5. Initialize checklist: `.knowledge-base/05-generation-checklist.json`.

### Step 4: Generate and Validate Directory AGENTS.md Files

**4.1 Task Assignment**

Manage task status: `pending` -> `in_progress` -> `completed` in `.knowledge-base/05-generation-checklist.json`.

**4.2 LLM-Driven Code Analysis and Generation**

⚠️ **CRITICAL: Knowledge Over Format**

- **Deep Pattern Recognition**: Identify "The Soul" (e.g., complex state sync, unusual side effects, performance hacks).
- **Map Data Transformations**: Document how data changes from input to output.
- **Identify "Invisible Links"**: Document side effects and cross-module impacts.
- **TS Referential Links**: Link to defining TS symbols instead of listing properties.
- **Refactoring Suggestions**: Explicitly highlight debt (e.g., giant files > 500 lines) and provide architectural advice.
- **Test Case Verification**: **STRICTLY FORBIDDEN** to hallucinate test cases. You MUST check the `e2e/tests/quality/` directory to identify existing Playwright test cases related to the component or page before documenting them.

**Self-Audit Redlines (Before Finalizing):**

- ❌ **Tautology Check**: If a section says "The X component does X", it is **FAILED**.
- ❌ **TS Duplication Check**: If a section just lists props or types, it is **FAILED**.
- ❌ **Depth Check**: If the AI hasn't discovered a "non-obvious" implementation detail, it is **NOT** ready to write.

**Documentation Necessity Assessment**:

- **Mandatory**: Every `page` and `module`.
- **Complexity-Driven**: Any directory with `giantFiles` or intricate logic.
- **Skip/Merge Strategy**: If skipped, fold its key logic into the parent's `AGENTS.md`.

**4.3 Incremental Editing and Retry**

- **No Overwrite**: Do not use `write_file` to completely replace existing `AGENTS.md` files. Use `read_file` to understand the current state, then use `replace` or other tools to modify specific sections.
- **Retry Logic**: If a text replacement fails (e.g., `replace` tool error), you **MUST** re-read the file to get the latest content and try the operation again with updated context.

**4.4 Incremental Validation and Self-Correction**

Immediately after generating or modifying each `AGENTS.md` file, use `scripts/validate_single.js` to verify it.

**Usage Example**:
```bash
node .agents/skills/knowledge-base-generator/scripts/validate_single.js <path-to-AGENTS.md> <type>
# Example:
node .agents/skills/knowledge-base-generator/scripts/validate_single.js src/components/MyComponent/AGENTS.md business-component
```

- ⚠️ **CRITICAL**: If validation fails, the LLM **MUST NOT** consider the task complete. It must analyze the error messages, re-read the source code if necessary, immediately correct the `AGENTS.md` file (using incremental edits), and use `scripts/validate_single.js` to verify it again.
- This loop must continue until `validate_single.js` returns success.

**4.5 Parallel Processing Support**

Multiple LLM instances can work simultaneously via the checklist system.

### Step 5: Final Review and Reporting

1. Run `scripts/validate_batch.js` to generate a comprehensive report of the target directory or project.
2. The task is only considered **SUCCESSFUL** when all mandatory directories (especially those with `giantFiles`) have compliant `AGENTS.md` files.
3. Provide a summary showing validated, skipped, and failed files. If any failed files remain, the process must continue until resolved.

## Key Rules (Workflow-Specific)

- **Use .knowledge-base/ for all intermediate files** to maintain process transparency.
- **LLM-driven content generation**: Every AGENTS.md must be generated by LLM after analyzing actual code.
- **Always preserve manual additions** between `<!-- MANUAL ADDITIONS START -->` and `<!-- MANUAL ADDITIONS END -->`.
- **Use relative paths** in root AGENTS.md for linking.

## Windows Environment Compatibility

1. **Shell Commands**: Avoid `&&` in `run_shell_command`; use `;` for PowerShell.
   - Example line count: `(Get-Content <file>).Count`.
2. **Terminal Encoding**: Run `chcp 65001` to ensure UTF-8 output displays correctly.

## Directory Type Reference

| Type                 | Necessity         | Template                         |
| :------------------- | :---------------- | :------------------------------- |
| `module`             | Mandatory         | `module-template.md`             |
| `page`               | Mandatory         | `page-template.md`               |
| `business-component` | Complexity-Driven | `business-component-template.md` |
| `state`              | Complexity-Driven | `state-template.md`              |
| `hook`               | Complexity-Driven | `hook-template.md`               |

## Resources

### Scripts

- `scripts/scan_and_classify.js`: Precision scanner with route awareness and giant-file detection.
- `scripts/validate_agents.js`: Strategy-aware validator.
- `scripts/validate_batch.js`: Batch validator.
- `scripts/validate_single.js`: Single file validator.

### Templates

- Located in `assets/templates/*.md`.
