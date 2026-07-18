# Knowledge Base Generator - Global Rules

> **Scope**: All Stages | **Priority**: Highest | **Version**: 1.1

---

## 🎯 Language Standards

- **Strict Chinese**: Think and respond in Simplified Chinese; avoid translation tone.
- **Technical Terms**: Preserve English technical names (React, JSX, TypeScript, MobX, etc.).

---

## 🏛️ Relationship with TypeScript Definitions (Symbiosis)

`AGENTS.md` is not a replacement for TS definitions; it is a **semantic supplement**.

- **Forbidden Copying**: Do not list every property of an Interface or Type.
- **Referential Linking**: Use "Defined as `SymbolName` in `path/to/file.ts`" to establish links.
- **Focus on Non-type Knowledge**: Explain the **constraints** between properties, the **business meaning** of default values, and the **side effects** of property changes.

---

## 💎 Knowledge Value Density (Anti-Boilerplate)

Every `AGENTS.md` must pass the "Value Test": **Could a senior developer understand the 'soul' of this module without reading the source code?**

| Prohibited (Shallow) | Required (High-Value) |
| :--- | :--- |
| **Tautology**: "The Button component renders a button." | **Intent**: "Wraps AntD Button to inject global Onetrack click-tracking logic." |
| **TS Duplication**: "Includes properties: id, name, type." | **Transformation**: "Converts backend UnionQuery protocol into a flat topological Map for UI dependency calculation." |
| **Vague Logic**: "Fetches data from API." | **Mechanics**: "Uses `IntersectionObserver` to delay API calls by 400ms until the panel enters the viewport." |
| **Empty Sections**: "Refer to TS for data structures." | **Structural Links**: "Maintains a dual-state (Local vs Global) via `registerLocalFilterChanger` to support 'Search-on-Click' mode." |

**Quality Self-Audit Golden Standard**:
- **Line Count Warning**: Basic templates already contain significant structural information. If the produced `AGENTS.md` is **under 100 lines**, it typically implies missing business sections or shallow analysis. In such cases, you MUST re-audit for missing `## 渲染逻辑`, `## 业务逻辑`, or complex `## 交互事件` 分析.
- **Template Reflection**: Strictly forbidden to perform only a dictionary-style replacement of template placeholders.

---

## 🗺️ Hierarchical Documentation Strategy (Necessity Decision)

LLM must decide whether to create an independent `AGENTS.md` based on the following tier system:

| Tier | Category | Necessity | Rule |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **Module** | **Mandatory** | Define business boundaries and global data flow. |
| **Tier 2** | **Page** | **Mandatory** | Explain routing, parameters, and main page entry logic. |
| **Tier 3** | **Business Component** | **As Needed** | Only if logic is complex, has side effects, or deep state coupling. |
| **Tier 4** | **Hook / Util / Generic** | **Conditional** | **Skip/Merge by default.** Generate an independent document only if the logic is exceptionally complex. |

**Decision Logic**: Priority order for generation: Complexity > Strategic Importance > Tier Category. If a directory is Tier 4 but "hard to understand at a glance," generate it.

---

## 🚫 Anti-Hallucination Convention (Data Anchoring)

| Rule | Description |
| :--- | :--- |
| **Exact Copy** | Identifiers (IDs, class names, method names) must be **copied exactly** from source code. |
| **No Guessing** | Unverified technical names must be marked `[Pending Verification]`. |
| **Source Attribution** | Mark speculative content with `[Speculation]`; cite evidence for fact-based content. |

---

## 🚫 Path and Directory Constraints

| Prohibited | Correct Approach |
| :--- | :--- |
| ❌ Write to source code directories | ✅ Output to `.knowledge-base/` directory |
| ❌ Modify existing source files | ✅ Only create/update AGENTS.md files |
| ❌ Create files outside designated paths | ✅ Follow `.knowledge-base/` structure |
| ❌ Create any other file types | ✅ Only `.json` and `.md` in allowed paths |

**Designated Output Paths:**
- `.knowledge-base/*.json` - All stage output files (ONLY these 7 files: 01-scan-results.json, 02-structure-analysis.json, 03-llm-module-analysis.json, 04-final-classification.json, 05-generation-checklist.json, 06-generation-log.json, 07-validation-report.json)
- `**/AGENTS.md` - Generated documentation files only

---

## 🚫 Prohibited Actions

| Prohibited | Reason |
| :--- | :--- |
| ❌ Create temporary scripts | Use existing tool scripts (`scan_and_classify.js`, `validate_agents.js`). |
| ❌ Inline code snippets | AI should directly analyze data and generate documentation description. |
| ❌ Mermaid diagrams | Use tables/lists/text descriptions instead for better searchability. |
| ❌ Repeated file reads | Pre-load and reuse data where possible. |
| ❌ Generic templates without code analysis | Must analyze actual source code for every AGENTS.md. |
| ❌ Placeholder content | Every sentence must be based on real code analysis. |

---

## ✅ Execution Standards

### Step Broadcasting
- **Output step title** before starting each step.
- Format: `### [Step N] Step Name`.
- Include brief description of what will be done.

### Silent Processing
- **No verbose descriptions** of intermediate processes.
- Only output: step titles, key decisions, final results.
- Avoid: "I'm now reading...", "Next I will...", "Processing...".

### Token Optimization
- **Large files**: Read targeted sections only, avoid full load.
- **Batch operations**: Group related file reads/operations.
- **Reuse data**: Cache parsed results, avoid re-reading.
- **Smart filtering**: Use grep/search before full reads.

### Quality Gates
- **Each stage completion**: Check required outputs before proceeding.
- **LLM Analysis Verification**: Ensure actual code was analyzed, not just templates filled.
- **Status Management**: Update `05-generation-checklist.json` status correctly.
- **Validation**: Run `validate_agents.js` before marking complete.

---

## 📋 LLM Code Analysis Requirements

**Every AGENTS.md file must be generated through deep code analysis:**

1. **Read ALL relevant source files** in the target directory.
2. **Extract actual implementations** - real function names, data structures, component logic, API calls.
3. **Document reality, not templates** - match source code exactly, base every description on observed behavior.
4. **Forbidden** - no generic descriptions, placeholder names, assumed functionality, or template sections without real content.

---

## 🔄 Parallel Processing Rules

When multiple LLM instances work on the same project:

1. **Read checklist first**: Load `05-generation-checklist.json` before starting any task.
2. **Claim task**: Find first `pending` task, update to `in_progress` with timestamp.
3. **Work exclusively**: Only process tasks in `in_progress` state claimed by self.
4. **Mark completion**: Update to `completed` with results path after finishing.
5. **Never duplicate**: Skip tasks already `in_progress` or `completed`.

---

## 📊 Data Persistence

All intermediate data must persist in `.knowledge-base/`:

| File | Purpose | Required Fields |
| :--- | :--- | :--- |
| `01-scan-results.json` | Directory tree | `path`, `type`, `files[]` |
| `02-structure-analysis.json` | Structure classification | `directory`, `type`, `confidence`, `reasons[]` |
| `03-llm-module-analysis.json` | LLM module identification | `directory`, `is_module`, `rationale` |
| `04-final-classification.json` | Final classification | `directory`, `type`, `template` |
| `05-generation-checklist.json` | Task status tracking | `task_id`, `target_dir`, `status` |
| `06-generation-log.json` | Generation log | `timestamp`, `action`, `target`, `result` |
| `07-validation-report.json` | Validation results | `file`, `is_valid`, `issues[]` |

**Purpose**: Enable process transparency, debugging, and resume capability.

---

## 🎯 Success Criteria

A successful knowledge base generation must satisfy:
- ✅ All directories classified with confidence > 0.7.
- ✅ Every AGENTS.md contains real code analysis (no generic templates).
- ✅ All checklist tasks marked `completed`.
- ✅ Validation report shows zero critical issues.
- ✅ Root AGENTS.md provides accurate project overview.
- ✅ All identifiers match source code exactly.
- ✅ All file paths referenced are valid.

---

## 🆘 Error Handling

| Error Type | Response |
| :--- | :--- |
| **Missing source files** | Mark directory as `[Unable to analyze]`, continue with others. |
| **Classification uncertainty** | Request human input for directories with confidence < 0.5. |
| **LLM analysis failure** | Retry once, then fallback to structure-based classification. |
| **Validation errors** | Log issues, request manual review before completion. |
| **Checklist conflicts** | Detect status mismatch, prompt for resolution. |

---

## 📝 Summary

**Remember:**

1. 🎯 **Chinese first**, technical terms in English
2. 🚫 **No hallucination** - every fact must be verified
3. 📁 **Respect paths** - only write to `.knowledge-base/` and `AGENTS.md` files
4. 🔍 **Deep code analysis** - read and understand actual source code
5. 📋 **Status management** - maintain checklist for parallel processing
6. ✅ **Quality gates** - validate before proceeding

**Priority Order:**

1. Data accuracy (anti-hallucination)
2. Code analysis depth (real vs template)
3. Status management (parallel processing)
4. Process transparency (persistence)
5. Output quality (validation)
