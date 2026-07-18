const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const { validateAgentsFile } = require('./core_validator');

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
const targetDir = options.targetDir ? options.targetDir.split('\\').join('/') : null;

const results = { validated: [], failed: [], skipped: [] };

for (const item of classificationResults.directories) {
    const normalizedItemPath = item.path.split('\\').join('/');
    if (targetDir && !normalizedItemPath.startsWith(targetDir)) {
        continue;
    }

    const dirPath = path.join(baseDir, item.path);
    const dirType = item.type;
    const agentsPath = path.join(dirPath, 'AGENTS.md');
    const hasGiantFiles = item.giantFiles && item.giantFiles.length > 0;

    const isMandatory = dirType === 'page' || dirType === 'module' || hasGiantFiles;
    const fileExists = fs.existsSync(agentsPath);

    if (!fileExists) {
        if (isMandatory) {
            results.failed.push({
                path: item.path,
                type: dirType,
                issues: [`Mandatory documentation missing (Type: ${dirType})`]
            });
        } else {
            results.skipped.push({ path: item.path, type: dirType });
        }
        continue;
    }

    const { valid, issues } = validateAgentsFile(agentsPath, dirType);
    
    if (hasGiantFiles) {
        const content = fs.readFileSync(agentsPath, 'utf8');
        for (const giant of item.giantFiles) {
            if (!content.includes(giant.file)) {
                issues.push(`Giant file '${giant.file}' is not explicitly documented`);
            }
        }
    }

    if (issues.length === 0) {
        results.validated.push({ path: item.path, type: dirType });
    } else {
        results.failed.push({ path: item.path, type: dirType, issues });
    }
}

console.log("\n" + "=".repeat(80));
console.log("FINAL BATCH VALIDATION SUMMARY");
console.log("=".repeat(80));

console.log(`\n✅ VALIDATED: ${results.validated.length}`);
console.log(`❌ FAILED: ${results.failed.length}`);
console.log(`⏭️  SKIPPED: ${results.skipped.length}`);

if (results.failed.length > 0) {
    console.log("\nDetails for FAILED files:");
    results.failed.forEach(item => {
        console.log(`  ✗ ${item.path} (${item.type})`);
        item.issues.forEach(issue => console.log(`      - ${issue}`));
    });
    process.exit(1);
} else {
    console.log("\n✅ All documented files are compliant!");
    process.exit(0);
}
