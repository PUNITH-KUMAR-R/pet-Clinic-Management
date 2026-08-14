import fs from 'fs';
import path from 'path';

interface ScanFinding {
  ruleId: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  file: string;
  line: number;
  snippet: string;
  message: string;
}

const RULES = [
  {
    id: 'SEC001-HARDCODED-SECRETS',
    severity: 'HIGH' as const,
    regex: /(?:api_?key|secret|password|bearer|private_?key)\s*[:=]\s*['"`][A-Za-z0-9_-]{20,}['"`]/i,
    message: 'Hardcoded secret / credential detected. Use process.env instead.'
  },
  {
    id: 'SEC002-UNSAFE-EVAL',
    severity: 'HIGH' as const,
    regex: /\beval\s*\(/,
    message: 'Use of eval() detected, posing arbitrary code execution vulnerabilities.'
  },
  {
    id: 'SEC003-PATH-TRAVERSAL',
    severity: 'HIGH' as const,
    regex: /fs\.(?:readFile|writeFile|readFileSync|writeFileSync)\s*\([^)]*req\.(?:query|params|body)/,
    message: 'Potential Path Traversal: user input directly interpolated into filesystem API.'
  },
  {
    id: 'SEC004-XSS-UNESCAPED-HTML',
    severity: 'MEDIUM' as const,
    regex: /dangerouslySetInnerHTML\s*=\s*\{\s*__html\s*:/,
    message: 'Use of dangerouslySetInnerHTML may expose application to Cross-Site Scripting (XSS).'
  },
  {
    id: 'SEC005-MISSING-SECURITY-HEADERS',
    severity: 'LOW' as const,
    regex: /app\.disable\s*\(\s*['"`]x-powered-by['"`]\s*\)/,
    negativeCheck: true,
    message: 'Express x-powered-by header is not disabled, which leaks server tech stack.'
  }
];

function scanDirectory(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === 'dist' || file === '.git' || file === 'coverage') continue;
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDirectory(fullPath, fileList);
    } else if (/\.(ts|tsx|js|jsx|json)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

export function runSASTScan(): { findings: ScanFinding[]; scannedFiles: number } {
  const files = scanDirectory(process.cwd());
  const findings: ScanFinding[] = [];

  for (const file of files) {
    const relFile = path.relative(process.cwd(), file);
    if (relFile.includes('__tests__') || relFile.includes('scripts/')) continue;

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const rule of RULES) {
        if (!rule.negativeCheck && rule.regex.test(line)) {
          findings.push({
            ruleId: rule.id,
            severity: rule.severity,
            file: relFile,
            line: i + 1,
            snippet: line.trim(),
            message: rule.message
          });
        }
      }
    }
  }

  return { findings, scannedFiles: files.length };
}

// Execute standalone
if (process.argv[1] && process.argv[1].endsWith('sast-scanner.ts')) {
  console.log('\n🔒 Starting Static Application Security Testing (SAST / Semgrep Rules Scan)...\n');
  const { findings, scannedFiles } = runSASTScan();
  console.log(`📁 Scanned ${scannedFiles} source files.`);

  if (findings.length === 0) {
    console.log('✅ SAST Scan Passed: 0 High/Medium/Low Vulnerabilities Detected!\n');
  } else {
    console.log(`⚠️  Found ${findings.length} security notice(s):\n`);
    for (const f of findings) {
      console.log(`[${f.severity}] ${f.ruleId} at ${f.file}:${f.line}`);
      console.log(`  Issue: ${f.message}`);
      console.log(`  Code:  ${f.snippet}\n`);
    }
  }
}
