const fs = require('fs');
const path = require('path');
const { program } = require('commander');

const REQUIRED_SECTIONS = {
    "module": [
        "## 概览",
        "## 全局状态",
        "## 功能页面",
        "## 模块结构",
        "## 关联文档",
    ],
    "state": [
        "## 概览",
        "## 数据结构",
        "## API",
        "## 关联文档",
    ],
    "business-component": [
        "## 概览",
        "## 数据结构",
        "## 渲染逻辑",
        "## 关联文档",
    ],
    "generic-component": [
        "## 概览",
        "## 渲染逻辑",
    ],
    "page": [
        "## 概览",
        "## 数据结构",
        "## 子组件",
        "## 页面流程",
        "## 路由配置",
        "## 关联文档",
    ],
    "hook": [
        "## 概览",
        "## 输入参数",
        "## 返回值",
    ]
};

const PLACEHOLDER_PATTERNS = [
    "[DIRECTORY NAME]",
    "[DATE]",
    "模板示例",
    "[模块名称]",
    "[状态名称]",
    "[组件名称]",
    "[页面名称]",
    "[描述]",
    "[路径]",
    "[数据源]",
    "[核心库]",
    "[数据结构]",
];

function validateAgentsFile(agentsPath, dirType) {
    const issues = [];

    if (!fs.existsSync(agentsPath)) {
        issues.push(`File does not exist: ${agentsPath}`);
        return { valid: false, issues };
    }

    let content;
    try {
        content = fs.readFileSync(agentsPath, 'utf8');
    } catch (e) {
        issues.push(`Failed to read file: ${e.message}`);
        return { valid: false, issues };
    }

    const requiredSections = REQUIRED_SECTIONS[dirType] || [];
    for (const section of requiredSections) {
        if (!content.includes(section)) {
            issues.push(`Missing section: ${section}`);
        }
    }

    for (const placeholder of PLACEHOLDER_PATTERNS) {
        if (content.includes(placeholder)) {
            issues.push(`Contains placeholder: ${placeholder}`);
        }
    }

    const lines = content.split('\n').length;
    if (lines < 100) {
        issues.push(`Content too short (${lines} lines), minimum 100 lines required for "Serious Audit" standards`);
    }

    if (!content.includes("生成于") && !content.includes("更新")) {
        issues.push("Missing timestamp or generation marker");
    }

    return { valid: issues.length === 0, issues };
}

program
    .argument('<input>', 'Input JSON file from scan_and_classify.js')
    .option('--base-dir <path>', 'Base directory')
    .option('--target-dir <path>', 'Only validate directories under this relative path')
    .parse(process.argv);

const options = program.opts();
const inputFile = path.resolve(program.args[0]);

if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file '${inputFile}' does not exist`);
    process.exit(1);
}

const classificationResults = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const baseDir = options.baseDir ? path.resolve(options.baseDir) : path.resolve(classificationResults.base_dir);
const targetDir = options.targetDir ? options.targetDir.replace(/\\/g, '/') : null;

if (!fs.existsSync(baseDir)) {
    console.error(`Error: Base directory '${baseDir}' does not exist`);
    process.exit(1);
}

const results = { validated: [], failed: [], skipped: [] };

for (const item of classificationResults.directories) {
    // Filter by target directory if provided
    const normalizedItemPath = item.path.replace(/\\/g, '/');
    if (targetDir && !normalizedItemPath.startsWith(targetDir)) {
        continue;
    }

    const dirPath = path.join(baseDir, item.path);
    const dirType = item.type;
    const agentsPath = path.join(dirPath, 'AGENTS.md');
    const hasGiantFiles = item.giantFiles && item.giantFiles.length > 0;

    // Check if documentation is MANDATORY for this directory
    // Mandatory if: type is page/module OR contains giant files
    const isMandatory = dirType === 'page' || dirType === 'module' || hasGiantFiles;
    const fileExists = fs.existsSync(agentsPath);

    if (!fileExists) {
        if (isMandatory) {
            results.failed.push({
                path: item.path,
                type: dirType,
                valid: false,
                issues: [`Mandatory documentation missing (Type: ${dirType}${hasGiantFiles ? ', Has Giant Files' : ''})`]
            });
        } else {
            results.skipped.push({ path: item.path, type: dirType, reason: "Optional directory, skipped by strategy" });
        }
        continue;
    }

    // If file exists, validate its content regardless of whether it was mandatory
    const { valid, issues } = validateAgentsFile(agentsPath, dirType);
    
    // Additional check for giant files: ensure they are mentioned in the doc
    if (hasGiantFiles && fileExists) {
        const content = fs.readFileSync(agentsPath, 'utf8');
        for (const giant of item.giantFiles) {
            if (!content.includes(giant.file)) {
                issues.push(`Giant file '${giant.file}' (${giant.lines} lines) is not explicitly documented`);
            }
        }
    }

    const result = {
        path: item.path,
        type: dirType,
        valid,
        issues
    };

    if (valid && issues.length === 0) {
        results.validated.push(result);
    } else {
        results.failed.push(result);
    }
}

console.log("\n" + "=".repeat(80));
console.log("VALIDATION RESULTS (Hierarchical Strategy)");
console.log("=".repeat(80));

if (results.validated.length > 0) {
    console.log(`\n✅ VALIDATED (${results.validated.length} files):`);
    results.validated.forEach(item => console.log(`  ✓ ${item.path} (${item.type})`));
}

if (results.skipped.length > 0) {
    console.log(`\n⏭️  SKIPPED (${results.skipped.length} optional directories):`);
}

if (results.failed.length > 0) {
    console.log(`\n❌ FAILED (${results.failed.length} files):`);
    results.failed.forEach(item => {
        console.log(`  ✗ ${item.path} (${item.type})`);
        item.issues.forEach(issue => console.log(`      - ${issue}`));
    });
}

console.log("\n" + "-".repeat(80));
console.log("SUMMARY:");
console.log(`  Total validated: ${results.validated.length}`);
console.log(`  Failed: ${results.failed.length}`);

if (results.failed.length > 0) {
    console.log("\n⚠️  Some validations failed. Please review the issues above.");
    process.exit(1);
} else {
    console.log("\n✅ All validations passed!");
    process.exit(0);
}
