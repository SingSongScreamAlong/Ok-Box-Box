import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURATION ---

const ROOT_DIR = path.resolve(__dirname, '..'); // Assuming tools/export-reference.ts
const EXCLUDE_DIRS = new Set([
    'node_modules',
    'dist',
    'build',
    'coverage',
    '.git',
    '.next',
    '.turbo',
    '.gemini',
    '.agent',
    'logs',
    'tmp',
    'temp',
    '.idea',
    '.vscode',
    'out',
    'venv',
    '.venv',
    '__pycache__'
]);

const EXCLUDE_FILES = new Set([
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.DS_Store',
    'thumbs.db',
    'export-reference.ts', // Don't include self
    'README.md', // Usually redundant if we just want code
    'LICENSE'
]);

const EXCLUDE_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
    '.mp4', '.webm', '.mov', '.avi',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.tar', '.gz', '.7z', '.rar',
    '.exe', '.dll', '.so', '.dylib', '.bin',
    '.map', // Source maps
    '.woff', '.woff2', '.ttf', '.eot',
    '.pyc', // Python bytecode
    '.log',
    '.tsbuildinfo'
]);

// Secrets patterns (simple substring check or regex)
const SECRET_PATTERNS = [
    /^\.env/,
    /secret/i,
    /credential/i,
    /\.pem$/,
    /\.key$/,
    /^id_rsa/
];

// Output configuration
const DEFAULT_FILENAME = 'okboxbox_code_reference.md';
// Try to determine a safe external path
const HOME_DIR = process.env.HOME || process.env.USERPROFILE || '.';
const DEFAULT_EXPORT_DIR = path.join(HOME_DIR, 'okboxbox_exports');

// --- TYPES ---

interface FileEntry {
    path: string;
    ext: string;
}

// --- LOGIC ---

async function isBinary(filePath: string): Promise<boolean> {
    try {
        const handle = await fs.open(filePath, 'r');
        const buffer = Buffer.alloc(1024);
        const { bytesRead } = await handle.read(buffer, 0, 1024, 0);
        await handle.close();

        // Check for null bytes, common in binaries
        for (let i = 0; i < bytesRead; i++) {
            if (buffer[i] === 0) return true;
        }
        return false;
    } catch (err) {
        return false; // Treat read error as skip or assume text? Safe to skip.
    }
}

async function shouldExclude(filePath: string, isDirectory: boolean): Promise<boolean> {
    const basename = path.basename(filePath);

    if (isDirectory) {
        if (EXCLUDE_DIRS.has(basename)) return true;
        return false;
    }

    if (EXCLUDE_FILES.has(basename)) return true;

    const ext = path.extname(filePath).toLowerCase();
    if (EXCLUDE_EXTENSIONS.has(ext)) return true;

    // Secret check
    for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(basename)) return true;
    }

    // Double check strict binary if extension was ambiguous
    // (Optimization: only check known binaries or rely on ext? Let's rely on Ext + simple check)
    // We'll do isBinary check during read phase to save time walking.

    return false;
}

async function walk(dir: string, fileList: FileEntry[] = []): Promise<FileEntry[]> {
    try {
        const files = await fs.readdir(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = await fs.stat(filePath);

            if (stats.isDirectory()) {
                if (!(await shouldExclude(filePath, true))) {
                    await walk(filePath, fileList);
                }
            } else {
                if (!(await shouldExclude(filePath, false))) {
                    fileList.push({
                        path: filePath,
                        ext: path.extname(filePath)
                    });
                }
            }
        }
    } catch (err) {
        console.error(`Error walking ${dir}:`, err);
    }
    return fileList;
}

async function generateMarkdown(files: FileEntry[], outputPath: string) {
    let content = `# Code Reference: Ok, Box Box\n\n`;
    content += `Generated: ${new Date().toISOString()}\n`;
    content += `Total Files: ${files.length}\n\n`;

    content += `## Directory Structure\n\n(Omitted for brevity, see file paths below)\n\n`;

    // Sort files for consistent output
    files.sort((a, b) => a.path.localeCompare(b.path));

    for (const file of files) {
        try {
            // Relative path for header
            const relPath = path.relative(ROOT_DIR, file.path);

            // Safety check for binary content before reading full
            if (await isBinary(file.path)) {
                console.log(`Skipping binary file detected during read: ${relPath}`);
                continue;
            }

            const fileContent = await fs.readFile(file.path, 'utf-8');

            // Language detection
            let lang = file.ext.slice(1); // remove dot
            if (lang === 'ts' || lang === 'tsx') lang = 'typescript';
            if (lang === 'js' || lang === 'jsx') lang = 'javascript';
            if (lang === 'md') lang = 'markdown';
            if (lang === 'json') lang = 'json';
            if (!lang) lang = 'text';

            content += `## File: ${relPath}\n\n`;
            content += '```' + lang + '\n';
            content += fileContent;
            content += '\n```\n\n';
        } catch (err) {
            console.error(`Failed to read ${file.path}:`, err);
            content += `> Error reading file\n\n`;
        }
    }

    // Ensure output directory exists takes recursive creation
    const outDir = path.dirname(outputPath);
    await fs.mkdir(outDir, { recursive: true });

    await fs.writeFile(outputPath, content, 'utf-8');
    console.log(`\n✅ Export successful: ${outputPath}`);
    console.log(`   Stats: ${files.length} files processed.`);
}

async function runExport() {
    console.log('🔍 Scanning codebase...');
    const files = await walk(ROOT_DIR);

    // Resolve output path
    let outputPath = process.env.REFERENCE_EXPORT_PATH;
    if (!outputPath) {
        outputPath = path.join(DEFAULT_EXPORT_DIR, DEFAULT_FILENAME);
    }

    console.log(`📝 Generating Markdown reference at: ${outputPath}`);
    await generateMarkdown(files, outputPath);
}

// --- MAIN / WATCH ---

async function main() {
    const isWatch = process.argv.includes('--watch');

    if (isWatch) {
        console.log('👀 Starting Watch Mode (Debounced 2s)...');

        await runExport(); // Initial run

        let debounceTimer: NodeJS.Timeout | null = null;

        // Watch relevant source directories only to avoid noise
        const watchDirs = ['packages', 'apps', 'tools', 'services'].map(d => path.join(ROOT_DIR, d));

        // Add root files? Using recursive watch on specific folders is safer than root.
        // fs.watch is platform dependent. Recursive option available on macOS/Windows.

        const watchers = [];
        for (const dir of watchDirs) {
            try {
                // Check existence first
                await fs.access(dir);
                const ac = new AbortController();
                const { signal } = ac;

                // Note: fs.watch recursive is technically experimental/platform dependent but works on macOS
                const watcher = fs.watch(dir, { recursive: true, signal });

                // Async iterator for events
                (async () => {
                    try {
                        for await (const event of watcher) {
                            if (debounceTimer) clearTimeout(debounceTimer);
                            debounceTimer = setTimeout(() => {
                                console.log(`♻️  Change detected in ${dir}. Regenerating...`);
                                runExport().catch(err => console.error('Export failed:', err));
                            }, 2000); // 2s Debounce
                        }
                    } catch (err: any) {
                        if (err.name !== 'AbortError') console.error(`Watcher error on ${dir}:`, err);
                    }
                })();
                watchers.push(ac);
                console.log(`   Watching: ${path.relative(ROOT_DIR, dir)}`);

            } catch (err) {
                // Dir might not exist, ignore
            }
        }

        // Keep process alive
        setInterval(() => { }, 100000);

    } else {
        // Single Run
        await runExport();
    }
}

main().catch(console.error);
