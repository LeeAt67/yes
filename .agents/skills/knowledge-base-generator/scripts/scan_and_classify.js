const fs = require('fs');
const path = require('path');
const { program } = require('commander');

const DEFAULT_EXCLUDE = ['.git', 'node_modules', '.specify', 'dist', 'build', '.next', '.cache', '__pycache__', '.knowledge-base'];

/**
 * Read file content safely
 */
function readFileContent(filePath, maxLines = null) {
    try {
        if (!fs.existsSync(filePath)) return null;
        const content = fs.readFileSync(filePath, 'utf8');
        if (maxLines) {
            return content.split('\n').slice(0, maxLines).join('\n');
        }
        return content;
    } catch (e) {
        return null;
    }
}

/**
 * Extract imports from content
 */
function extractImports(content) {
    const importRegex = /import\s+.*?\s+from\s+['"](.*?)['"]/g;
    const imports = [];
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
    }
    return imports;
}

/**
 * Check if content contains JSX syntax
 */
function hasJsxSyntax(content) {
    const jsxPatterns = [
        /return\s*\(\s*</,
        /return\s*<\w+/,
        /<\w+\s+[^>]*>[\s\S]*?<\/\w+>/,
        /import\s+.*?\s+from\s+['"]react['"]/
    ];
    return jsxPatterns.some(pattern => pattern.test(content));
}

/**
 * Check if content has React imports
 */
function hasReactImports(content) {
    const reactPatterns = [
        /from\s+['"]react['"]/,
        /import\s+React/,
        /useState\s*\(/,
        /useEffect\s*\(/,
        /useMemo\s*\(/,
        /useCallback\s*\(/
    ];
    return reactPatterns.some(pattern => pattern.test(content));
}

/**
 * Check if content has state management patterns
 */
function hasStateManagement(content) {
    const statePatterns = [
        /makeAutoObservable\s*\(/,
        /makeObservable\s*\(/,
        /@observable/,
        /@action/,
        /createStore\s*\(/,
        /configureStore\s*\(/,
        /createContext\s*\(/,
        /class\s+\w+Store/
    ];
    return statePatterns.some(pattern => pattern.test(content));
}

/**
 * Check if content has route related imports
 */
function hasRouteRelated(content) {
    const routePatterns = [
        /from\s+['"]react-router-dom['"]/,
        /useNavigate\s*\(/,
        /useParams\s*\(/,
        /useLocation\s*\(/,
        /Link\s+to=/,
        /Route\s+path=/
    ];
    return routePatterns.some(pattern => pattern.test(content));
}

/**
 * Check if content makes HTTP API calls for business logic
 */
function hasBusinessApiCalls(content) {
    const businessPatterns = [
        /axios\.(post|get|put|delete|patch)/,
        /fetch\s*\(['"]\/api\//,
        /services\.\w+/,
        /mutation\s+/,
        /query\s+/
    ];
    let count = 0;
    for (const pattern of businessPatterns) {
        if (pattern.test(content)) count++;
    }
    return count >= 2;
}

/**
 * Check if component integrates multiple modules/features
 */
function hasModuleIntegration(content) {
    const imports = extractImports(content);
    const moduleImports = imports.filter(imp => 
        ['services/', 'store/', 'modules/', 'models/', 'hooks/'].some(x => imp.includes(x))
    );

    if (moduleImports.length >= 3) return true;

    const multiConcernPatterns = [
        /@observable[\s\S]*?@observable/,
        /useReducer\s*\(/,
        /useContext\s*\(/
    ];
    return multiConcernPatterns.some(pattern => pattern.test(content));
}

/**
 * Determine if a directory is a business component
 */
function isBusinessComponent(dirPath) {
    if (fs.existsSync(path.join(dirPath, 'services'))) return true;
    if (fs.existsSync(path.join(dirPath, 'store')) || fs.existsSync(path.join(dirPath, 'model'))) return true;

    let apiCallCount = 0;
    let moduleImportCount = 0;
    let servicePatternCount = 0;

    const sourceExtensions = ['.js', '.jsx', '.ts', '.tsx'];
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) continue;
        if (!sourceExtensions.includes(path.extname(file))) continue;
        if (file.endsWith('.test.js') || file.endsWith('.test.ts') || file.endsWith('.spec.js')) continue;

        const rawContent = fs.readFileSync(fullPath, 'utf8');
        const content = rawContent.substring(0, 5000);
        if (!content) continue;

        if (hasBusinessApiCalls(content)) apiCallCount++;
        if (hasModuleIntegration(content)) moduleImportCount++;
        if (/services\./.test(content) || /\.service\./.test(content)) servicePatternCount++;
    }

    return (apiCallCount >= 1 && servicePatternCount >= 1) || moduleImportCount >= 1;
}

/**
 * Classify by directory structure
 */
function classifyByStructure(dirPath) {
    const entries = fs.readdirSync(dirPath);
    const subdirs = entries.filter(e => {
        try {
            return fs.statSync(path.join(dirPath, e)).isDirectory();
        } catch(e) { return false; }
    });

    if (subdirs.includes('pages') && subdirs.includes('components')) return 'module';
    if (['store', 'model', 'reducer'].some(d => subdirs.includes(d))) return 'state';
    
    return null;
}

/**
 * Classify by analyzing all source files in the directory
 */
function analyzeAllSourceFiles(dirPath) {
    const analysis = {
        fileCount: 0,
        jsxFileCount: 0,
        hasJsx: false,
        hasState: false,
        hasRoutes: false,
        hasContainers: false,
        hasReact: false,
        hasHooks: false,
        giantFiles: []
    };

    const sourceExtensions = ['.js', '.jsx', '.ts', '.tsx'];
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) continue;
        if (!sourceExtensions.includes(path.extname(file))) continue;
        if (file.endsWith('.test.js') || file.endsWith('.spec.js')) continue;

        const rawContent = fs.readFileSync(fullPath, 'utf8');
        const lineCount = rawContent.split('\n').length;
        if (lineCount > 500) {
            analysis.giantFiles.push({ file, lines: lineCount });
        }

        const content = rawContent.substring(0, 5000);
        if (!content) continue;

        analysis.fileCount++;
        const hasJsx = hasJsxSyntax(content);
        const hasReact = hasReactImports(content);

        if (hasJsx) {
            analysis.hasJsx = true;
            analysis.jsxFileCount++;
        }
        if (hasReact) {
            analysis.hasReact = true;
        }
        if (hasStateManagement(content)) analysis.hasState = true;
        if (hasRouteRelated(content)) analysis.hasRoutes = true;
        if (content.includes('Container') || content.includes('Wrapper')) analysis.hasContainers = true;
        if (file.startsWith('use') || /use[A-Z]/.test(content)) analysis.hasHooks = true;
    }

    return analysis;
}

/**
 * Comprehensive analysis
 */
function classifyByComprehensiveAnalysis(dirPath, isInsidePage = false) {
    const analysis = analyzeAllSourceFiles(dirPath);
    if (analysis.fileCount === 0) return [null, 'low', analysis];

    const parts = dirPath.split(path.sep);
    const inComponents = parts.includes('components');
    const inHooks = parts.includes('hooks');
    const inPages = parts.includes('pages');
    const baseName = path.basename(dirPath);

    const isReservedName = ['components', 'hooks', 'utils', 'services', 'shared', 'service'].includes(baseName.toLowerCase());

    // 1. State Management (High Priority)
    if (analysis.hasState && !analysis.hasJsx) return ['state', 'high', analysis];

    // 2. Hook Classification
    if (baseName.toLowerCase() === 'hooks' || baseName.startsWith('use') || inHooks || (!analysis.hasJsx && (analysis.hasHooks || analysis.hasReact))) {
        return ['hook', 'high', analysis];
    }

    // 3. Page vs Component Classification
    if (analysis.hasJsx) {
        const isInsideReservedFolder = parts.some(p => ['components', 'hooks', 'utils', 'services', 'shared', 'service'].includes(p.toLowerCase()));
        
        if (!isReservedName && !isInsideReservedFolder && !isInsidePage) {
            if (analysis.hasRoutes && analysis.hasContainers) return ['page', 'high', analysis];
            if (inPages && analysis.hasContainers && analysis.jsxFileCount >= 2) return ['page', 'medium', analysis];
            if (inPages) return ['page', 'medium', analysis];
        }

        const isBusiness = isBusinessComponent(dirPath) || analysis.hasHooks || analysis.hasState;
        if (baseName.toLowerCase() === 'components' || baseName.toLowerCase() === 'shared') return ['generic-component', 'medium', analysis];
        if (isBusiness) return ['business-component', 'high', analysis];
        return ['generic-component', 'high', analysis];
    }

    return [null, 'low', analysis];
}

/**
 * Main classification function
 */
function classifyDirectory(dirPath, isInsidePage = false) {
    const structType = classifyByStructure(dirPath);
    const [compType, confidence, analysis] = classifyByComprehensiveAnalysis(dirPath, isInsidePage);
    
    if (structType) return [structType, 'high', analysis];
    return [compType, confidence, analysis];
}

function shouldExclude(dirPath, excludeList) {
    const baseName = path.basename(dirPath);
    if (baseName.startsWith('.')) {
        return !['.knowledge-base'].includes(baseName);
    }
    return excludeList.includes(baseName);
}

program
    .option('--base-dir <path>', 'Base directory to scan', 'src')
    .option('--depth <n>', 'Maximum scan depth', parseInt)
    .option('--exclude <dirs>', 'Comma-separated directories to exclude')
    .option('--output <path>', 'Output JSON file path')
    .option('--known-pages <path>', 'JSON file containing array of known page paths')
    .option('--target-path <path>', 'Only include directories under this path in the output')
    .parse(process.argv);

const options = program.opts();
const baseDir = path.resolve(options.baseDir);
const targetPath = options.targetPath ? options.targetPath.replace(/\\/g, '/') : null;

let knownPagePaths = [];
if (options.knownPages) {
    try {
        const knownPagesPath = path.resolve(options.knownPages);
        if (fs.existsSync(knownPagesPath)) {
            const rawData = JSON.parse(fs.readFileSync(knownPagesPath, 'utf8'));
            knownPagePaths = rawData.map(p => {
                let clean = p;
                if (p.startsWith('@/')) clean = p.replace('@/', '');
                return clean.replace(/\\/g, '/');
            });
        }
    } catch (e) {
        console.error(`Warning: Failed to load known-pages file: ${e.message}`);
    }
}

const excludeList = [...DEFAULT_EXCLUDE];
if (options.exclude) {
    excludeList.push(...options.exclude.split(',').map(d => d.trim()));
}

function scanDirectory(baseDir, excludeList, maxDepth = null) {
    const results = {
        base_dir: path.resolve(baseDir),
        directories: [],
        unclassified: []
    };

    function scanRecursive(currentDir, depth, insidePage = false) {
        if (maxDepth !== null && depth > maxDepth) return;

        let entries;
        try {
            entries = fs.readdirSync(currentDir);
        } catch (e) {
            return;
        }

        const relPath = path.relative(baseDir, currentDir);
        const normalizedRelPath = relPath.replace(/\\/g, '/');
        
        const isKnownPage = knownPagePaths.some(p => {
            const cleanP = p.startsWith('/') ? p.substring(1) : p;
            return normalizedRelPath === cleanP || normalizedRelPath.endsWith('/' + cleanP);
        });

        let currentDirType = null;

        if (currentDir !== baseDir) {
            if (shouldExclude(currentDir, excludeList)) return;

            let [dirType, confidence, analysis] = classifyDirectory(currentDir, insidePage);
            if (isKnownPage) {
                dirType = 'page';
                confidence = 'absolute';
            }

            currentDirType = dirType;

            const result = {
                path: relPath,
                type: dirType,
                confidence: confidence,
                giantFiles: analysis?.giantFiles || []
            };

            if (dirType) {
                results.directories.push(result);
            } else {
                results.unclassified.push(result);
            }
        }

        const nextInsidePage = insidePage || currentDirType === 'page';

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry);
            if (fs.statSync(fullPath).isDirectory()) {
                if (!shouldExclude(fullPath, excludeList)) {
                    scanRecursive(fullPath, depth + 1, nextInsidePage);
                }
            }
        }
    }

    scanRecursive(baseDir, 0, false);
    return results;
}

const results = scanDirectory(baseDir, excludeList, options.depth);

let finalResults = results;
if (targetPath) {
    const filterFn = item => {
        const normalizedItemPath = item.path.replace(/\\/g, '/');
        return normalizedItemPath === targetPath || normalizedItemPath.startsWith(targetPath + '/');
    };
    finalResults = {
        ...results,
        directories: results.directories.filter(filterFn),
        unclassified: results.unclassified.filter(filterFn)
    };
}

if (options.output) {
    const outputPath = path.resolve(options.output);
    const dirName = path.dirname(outputPath);
    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(finalResults, null, 2), 'utf8');
    console.error(`Results written to ${outputPath} (filtered by ${targetPath || 'none'})`);
} else {
    console.log(JSON.stringify(finalResults, null, 2));
}

console.error('\nSummary:');
console.error(`  Total directories classified: ${results.directories.length}`);
console.error(`  Unclassified directories: ${results.unclassified.length}`);

const typeCounts = {};
results.directories.forEach(item => {
    typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
});

Object.keys(typeCounts).sort().forEach(type => {
    console.error(`    ${type}: ${typeCounts[type]}`);
});
