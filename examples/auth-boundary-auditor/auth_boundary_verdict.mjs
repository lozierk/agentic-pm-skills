#!/usr/bin/env node
// auth_boundary_verdict.mjs — recompute the auth-boundary-auditor verdict from
// a report's findings and check it against the report's own reported Verdict
// line. The auditor agent (.claude/agents/auth-boundary-auditor.md) applies
// the verdict rule by judgment; this script is the single source of truth for
// that rule from now on, so a wrong verdict is a defect the script catches,
// not a judgment call. Printed output from this script is evidence for done
// reports, same convention as scripts/scan_pii_secrets.sh.
//
// Usage: node scripts/auth_boundary_verdict.mjs <report.md>
//        node scripts/auth_boundary_verdict.mjs < report.md
//
// Exit 0 = reported verdict matches the computed one.
// Exit 1 = mismatch, or no Verdict line found in the report.
// Exit 2 = the input could not be read.

import { readFileSync } from 'node:fs';

function readInput() {
  const arg = process.argv[2];
  if (arg) {
    return { label: arg, text: readFileSync(arg, 'utf8') };
  }
  return { label: 'stdin', text: readFileSync(0, 'utf8') };
}

function computeFindings(text) {
  const lines = text.split(/\r?\n/);
  const counts = { BLOCKER: 0, DEGRADED: 0, MINOR: 0 };
  const severities = new Set(['BLOCKER', 'DEGRADED', 'MINOR']);

  for (const line of lines) {
    // Heading form: ### V<n> — <rule text> — <SEVERITY> — <file:line>
    // Tolerant of "-" or "—" as the separator, with surrounding whitespace.
    if (/^###\s+V\d+\b/.test(line)) {
      const segments = line.split(/\s+[-—]\s+/).map((s) => s.trim());
      for (const seg of segments) {
        if (severities.has(seg)) {
          counts[seg] += 1;
          break; // one severity per heading
        }
      }
      continue;
    }
    // Prose form: a line like "Severity: MINOR" (older reports put the R6
    // static-ban finding this way instead of a ### V heading).
    const proseMatch = line.match(/^\s*Severity:\s*(BLOCKER|DEGRADED|MINOR)/);
    if (proseMatch) {
      counts[proseMatch[1]] += 1;
    }
  }

  return counts;
}

function countSanctionedExceptions(text) {
  const lines = text.split(/\r?\n/);
  let inSection = false;
  let count = 0;
  for (const line of lines) {
    if (/^##\s+Sanctioned exceptions\b/.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^##\s+/.test(line)) {
      break;
    }
    if (inSection) {
      const cellMatch = line.match(/^\s*\|\s*([^\s|]+)/);
      if (cellMatch && /^X\d+$/.test(cellMatch[1])) {
        count += 1;
      }
    }
  }
  return count;
}

function findReportedVerdict(text) {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^Verdict:\s*\**\s*(PASS WITH EXCEPTIONS|PASS|FAIL)/);
    if (m) return m[1];
  }
  return null;
}

function computeVerdict(counts, exceptionCount) {
  if (counts.BLOCKER > 0 || counts.DEGRADED > 0) return 'FAIL';
  if (exceptionCount > 0 || counts.MINOR > 0) return 'PASS WITH EXCEPTIONS';
  return 'PASS';
}

function main() {
  let label;
  let text;
  try {
    ({ label, text } = readInput());
  } catch (err) {
    console.error(`auth-boundary verdict check: could not read input: ${err.message}`);
    process.exit(2);
  }

  const counts = computeFindings(text);
  const exceptionCount = countSanctionedExceptions(text);
  const computed = computeVerdict(counts, exceptionCount);
  const reported = findReportedVerdict(text);

  console.log(`auth-boundary verdict check: ${label}`);
  console.log(
    `findings: BLOCKER=${counts.BLOCKER} DEGRADED=${counts.DEGRADED} MINOR=${counts.MINOR}  sanctioned exceptions: ${exceptionCount}`
  );
  console.log(`computed: ${computed}`);
  console.log(`reported: ${reported ?? 'none found'}`);

  if (reported === null) {
    console.log('FAIL no Verdict line in report');
    process.exit(1);
  }

  if (reported === computed) {
    console.log('PASS verdict matches');
    process.exit(0);
  }

  console.log(`FAIL verdict mismatch: report says ${reported}, findings say ${computed}`);
  process.exit(1);
}

main();
