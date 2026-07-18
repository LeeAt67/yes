const { program } = require('commander');
const path = require('path');
const { validateAgentsFile } = require('./core_validator');

program
    .argument('<file>', 'Path to the AGENTS.md file')
    .argument('<type>', 'Directory type (module|page|business-component|generic-component|state|hook)')
    .parse(process.argv);

const filePath = path.resolve(program.args[0]);
const type = program.args[1];

console.log(`Validating ${filePath} as type: ${type}...`);

const { valid, issues } = validateAgentsFile(filePath, type);

if (valid) {
    console.log('✅ Validation passed!');
    process.exit(0);
} else {
    console.error('❌ Validation failed:');
    issues.forEach(issue => console.error(`  - ${issue}`));
    process.exit(1);
}
