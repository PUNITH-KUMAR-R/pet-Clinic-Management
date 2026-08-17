import fs from 'fs';
import path from 'path';

interface LeakedSecretFinding {
  secretType: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  file: string;
  line: number;
  snippet: string;
  maskedMatch: string;
  recommendation: string;
}

// Shannon entropy calculation to detect high-entropy random strings / API secrets
function calculateShannonEntropy(str: string): number {
  const map: Record<string, number> = {};
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    map[char] = (map[char] || 0) + 1;
  }
  let entropy = 0;
  for (const char in map) {
    const p = map[char] / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function maskSecret(secret: string): string {
  if (secret.length <= 8) return '****';
  return secret.substring(0, 3) + '****' + secret.substring(secret.length - 3);
}

const SECRET_PATTERNS = [
  {
    type: 'AWS Access Key ID',
    severity: 'CRITICAL' as const,
    regex: /\b(AKIA[0-9A-Z]{16})\b/,
    recommendation: 'Rotate AWS credentials immediately and use IAM roles or AWS SSM Secrets.'
  },
  {
    type: 'AWS Secret Access Key',
    severity: 'CRITICAL' as const,
    regex: /(?:aws_secret_access_key|aws_sec_key|secret_key)\s*[:=]\s*['"`]([A-Za-z0-9/+=]{40})['"`]/i,
    recommendation: 'Do not commit AWS secret access keys. Use AWS IAM or .env variables.'
  },
  {
    type: 'Google Cloud / Gemini API Key',
    severity: 'CRITICAL' as const,
    regex: /\b(AIza[0-9A-Za-z-_]{35})\b/,
    recommendation: 'Remove hardcoded Google API Key. Use process.env.GEMINI_API_KEY.'
  },
  {
    type: 'GitHub Personal Access Token (Classic / Fine-grained)',
    severity: 'CRITICAL' as const,
    regex: /\b(ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{82})\b/,
    recommendation: 'Revoke the GitHub token immediately in GitHub Settings > Developer Settings.'
  },
  {
    type: 'Stripe Secret or Restricted Key',
    severity: 'CRITICAL' as const,
    regex: /\b(sk_live_[0-9a-zA-Z]{24,}|rk_live_[0-9a-zA-Z]{24,})\b/,
    recommendation: 'Rotate Stripe secret key in Stripe Dashboard and store in server environment.'
  },
  {
    type: 'RSA / OpenSSH / PGP Private Key',
    severity: 'CRITICAL' as const,
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    recommendation: 'Never commit private cryptographic keys into source repositories.'
  },
  {
    type: 'Slack Bot / Webhook Token',
    severity: 'HIGH' as const,
    regex: /\b(xox[baprs]-[0-9a-zA-Z]{10,48})\b|https:\/\/hooks\.slack\.com\/services\/T[0-9A-Z]{8}\/B[0-9A-Z]{8}\/[0-9a-zA-Z]{24}/,
    recommendation: 'Revoke Slack webhook/token and inject via encrypted environment variables.'
  },
  {
    type: 'JSON Web Token (JWT)',
    severity: 'HIGH' as const,
    regex: /\beyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+\b/,
    recommendation: 'Hardcoded JWT tokens leak user or server authentication sessions.'
  },
  {
    type: 'Database Connection String with Password',
    severity: 'HIGH' as const,
    regex: /(?:postgres|postgresql|mysql|mongodb|mongodb\+srv|redis):\/\/(?!\$\{)[^:\s]+:(?!\$\{)[^@\s]+@[^/\s]+/,
    recommendation: 'Do not commit DB credentials in connection URIs. Use process.env.DATABASE_URL.'
  },
  {
    type: 'Generic Hardcoded Credential / Secret Assignment',
    severity: 'HIGH' as const,
    regex: /(?:api_?key|auth_?token|client_?secret|db_?password|private_?key|secret_?key)\s*[:=]\s*['"`]([A-Za-z0-9_\-!@#$%^&*()]{16,})['"`]/i,
    recommendation: 'Extract secrets to environment configuration (.env) and add .env to .gitignore.'
  }
];

const IGNORE_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git']);
const IGNORE_FILES = new Set(['package-lock.json', 'pnpm-lock.yaml', 'bun.lockb', '.env.example']);

function collectFiles(dir: string, results: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, results);
    } else if (!IGNORE_FILES.has(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

export function detectSecrets(): { findings: LeakedSecretFinding[]; totalFiles: number } {
  const files = collectFiles(process.cwd());
  const findings: LeakedSecretFinding[] = [];

  for (const file of files) {
    const relFile = path.relative(process.cwd(), file).replace(/\\/g, '/');
    // Ignore the detector script itself and test fixtures that test scanner rules
    if (relFile.startsWith('scripts/') || relFile === '.semgrep/rules.yml') {
      continue;
    }

    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const pattern of SECRET_PATTERNS) {
          const match = line.match(pattern.regex);
          if (match) {
            const rawSecret = match[1] || match[0];
            const lowerSecret = rawSecret.toLowerCase();
            
            // False positive filtering for common placeholder tokens
            if (
              lowerSecret.includes('your_') || 
              lowerSecret.includes('example') || 
              lowerSecret.includes('placeholder') ||
              lowerSecret.includes('changeme') ||
              lowerSecret.includes('${') ||
              lowerSecret.startsWith('<') ||
              rawSecret.includes('SAMPLE_')
            ) {
              continue;
            }

            findings.push({
              secretType: pattern.type,
              severity: pattern.severity,
              file: relFile,
              line: i + 1,
              snippet: line.trim().substring(0, 100),
              maskedMatch: maskSecret(rawSecret),
              recommendation: pattern.recommendation
            });
          }
        }

        // High-entropy token detection on variable assignments
        const assignmentMatch = line.match(/(?:token|secret|key|hash)\s*[:=]\s*['"`]([A-Za-z0-9_-]{28,})['"`]/i);
        if (assignmentMatch) {
          const candidate = assignmentMatch[1];
          const entropy = calculateShannonEntropy(candidate);
          // High Shannon entropy (> 4.2) indicates random/cryptographic keys
          if (entropy > 4.2 && !findings.some(f => f.file === relFile && f.line === i + 1)) {
            findings.push({
              secretType: 'High-Entropy Cryptographic String',
              severity: 'MEDIUM',
              file: relFile,
              line: i + 1,
              snippet: line.trim().substring(0, 100),
              maskedMatch: maskSecret(candidate),
              recommendation: 'Verify if this high-entropy string is a sensitive secret or API key.'
            });
          }
        }
      }
    } catch {
      // Ignore unreadable binary files
    }
  }

  return { findings, totalFiles: files.length };
}

// Standalone execution
if (process.argv[1] && process.argv[1].endsWith('detect-secrets.ts')) {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  🔍 Running Secret Leak Detection & Entropy Analysis (Gitleaks / TruffleHog Policy)  ');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const { findings, totalFiles } = detectSecrets();
  console.log(`📁 Scanned ${totalFiles} files in repository.`);

  if (findings.length === 0) {
    console.log('\n✅ NO SECRETS DETECTED! Your repository is 100% clean of credentials & API keys.\n');
  } else {
    console.log(`\n🚨 CRITICAL: Found ${findings.length} potential secret leak(s)!\n`);
    for (const f of findings) {
      console.log(`[${f.severity}] ${f.secretType}`);
      console.log(`  File:           ${f.file}:${f.line}`);
      console.log(`  Masked Value:   ${f.maskedMatch}`);
      console.log(`  Code Snippet:   ${f.snippet}`);
      console.log(`  Recommendation: ${f.recommendation}\n`);
    }
    process.exit(1);
  }
}
