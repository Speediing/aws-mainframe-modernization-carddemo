#!/usr/bin/env node
/**
 * CardDemo modernization risk scorer.
 *
 * Evaluates the repository using three rule families:
 *   1. Manifest rules  – inventory completeness and module topology
 *   2. Coupling rules  – copybook, call, and CICS dependency density
 *   3. Test rules      – screen-validation complexity (CSSETATY patterns)
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_APP_ROOT = join(REPO_ROOT, "app");
const DEFAULT_OUTPUT = join(REPO_ROOT, "risk.md");

type Severity = "Critical" | "High" | "Medium" | "Low";
type ModuleTier = "base" | "db2" | "ims-db2-mq" | "mq";

interface ProgramManifest {
  name: string;
  path: string;
  module: ModuleTier;
  lines: number;
  isOnline: boolean;
  isBatch: boolean;
  transaction?: string;
}

interface CouplingMetrics {
  copyCount: number;
  uniqueCopybooks: string[];
  callCount: number;
  callTargets: string[];
  cicsFileRefs: string[];
  execCics: number;
  execSql: number;
  execDli: number;
  execMq: number;
}

interface TestMetrics {
  cssetatyRules: number;
  validationFlags: number;
  redefinesCount: number;
}

interface PatternMetrics {
  alterCount: number;
  goToCount: number;
  comp3Count: number;
  controlBlockRefs: number;
  occursDependingOn: number;
}

interface ProgramScore {
  manifest: ProgramManifest;
  coupling: CouplingMetrics;
  tests: TestMetrics;
  patterns: PatternMetrics;
  score: number;
  severity: Severity;
  factors: string[];
}

interface Blocker {
  id: string;
  severity: Severity;
  description: string;
  programs: string[];
}

interface PilotCandidate {
  program: string;
  module: ModuleTier;
  score: number;
  rationale: string;
}

interface RiskReport {
  generatedAt: string;
  appRoot: string;
  overallScore: number;
  severity: Severity;
  manifestSummary: {
    programs: number;
    copybooks: number;
    jclJobs: number;
    csdPrograms: number;
    csdTransactions: number;
    csdFiles: number;
    modules: Record<ModuleTier, number>;
  };
  couplingSummary: {
    avgCopyCount: number;
    maxCopyCount: number;
    avgCallCount: number;
    sharedCopybooks: Array<{ name: string; usage: number }>;
  };
  testSummary: {
    programsWithValidationRules: number;
    totalCssetatyRules: number;
    totalValidationFlags: number;
  };
  blockers: Blocker[];
  pilotCandidates: PilotCandidate[];
  topRiskPrograms: ProgramScore[];
  allPrograms: ProgramScore[];
}

const MODULE_PATHS: Record<string, ModuleTier> = {
  "app-authorization-ims-db2-mq": "ims-db2-mq",
  "app-transaction-type-db2": "db2",
  "app-vsam-mq": "mq",
};

const ONLINE_PROGRAMS = new Set([
  "COSGN00C", "COMEN01C", "COACTVWC", "COACTUPC", "COCRDLIC", "COCRDSLC",
  "COCRDUPC", "COTRN00C", "COTRN01C", "COTRN02C", "CORPT00C", "COBIL00C",
  "COADM01C", "COUSR00C", "COUSR01C", "COUSR02C", "COUSR03C",
  "COPAUS0C", "COPAUS1C", "COPAUA0C", "COTRTUPC", "COTRTLIC",
  "CODATE01", "COACCT01",
]);

const BATCH_PROGRAMS = new Set([
  "CBACT01C", "CBACT02C", "CBACT03C", "CBACT04C", "CBCUS01C", "CBEXPORT",
  "CBIMPORT", "CBSTM03A", "CBSTM03B", "CBTRN01C", "CBTRN02C", "CBTRN03C",
  "CBPAUP0C", "COBTUPDT", "COBSWAIT", "CSUTLDTC", "DBUNLDGS", "PAUDBLOD",
  "PAUDBUNL",
]);

function walkFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, extensions));
      continue;
    }
    const ext = entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase();
    if (extensions.includes(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

function detectModule(filePath: string): ModuleTier {
  const rel = relative(DEFAULT_APP_ROOT, filePath);
  for (const [dir, tier] of Object.entries(MODULE_PATHS)) {
    if (rel.startsWith(dir)) {
      return tier;
    }
  }
  return "base";
}

function programNameFromPath(filePath: string): string {
  return basename(filePath).replace(/\.(cbl|CBL)$/i, "").toUpperCase();
}

function parseCsd(csdPaths: string[]): {
  programs: Set<string>;
  transactions: Set<string>;
  files: Set<string>;
  programTransactions: Map<string, string[]>;
} {
  const programs = new Set<string>();
  const transactions = new Set<string>();
  const files = new Set<string>();
  const programTransactions = new Map<string, string[]>();

  for (const csdPath of csdPaths) {
    const content = readFileSync(csdPath, "utf8");
    for (const match of content.matchAll(/DEFINE PROGRAM\(([^)]+)\)/gi)) {
      programs.add(match[1].toUpperCase());
    }
    for (const match of content.matchAll(/DEFINE TRANSACTION\(([^)]+)\)/gi)) {
      transactions.add(match[1].toUpperCase());
    }
    for (const match of content.matchAll(/DEFINE FILE\(([^)]+)\)/gi)) {
      files.add(match[1].toUpperCase());
    }
    for (const match of content.matchAll(
      /DEFINE TRANSACTION\(([^)]+)\)[\s\S]*?PROGRAM\(([^)]+)\)/gi,
    )) {
      const transId = match[1].toUpperCase();
      const program = match[2].toUpperCase();
      const existing = programTransactions.get(program) ?? [];
      existing.push(transId);
      programTransactions.set(program, existing);
    }
  }

  return { programs, transactions, files, programTransactions };
}

function countMatches(content: string, pattern: RegExp): number {
  return [...content.matchAll(pattern)].length;
}

function extractUnique(content: string, pattern: RegExp): string[] {
  return [...new Set([...content.matchAll(pattern)].map((m) => m[1].toUpperCase()))];
}

function analyzeProgram(
  filePath: string,
  csdProgramTransactions: Map<string, string[]>,
): ProgramScore {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).length;
  const name = programNameFromPath(filePath);
  const module = detectModule(filePath);

  const manifest: ProgramManifest = {
    name,
    path: relative(REPO_ROOT, filePath),
    module,
    lines,
    isOnline: ONLINE_PROGRAMS.has(name) || csdProgramTransactions.has(name),
    isBatch: BATCH_PROGRAMS.has(name),
    transaction: csdProgramTransactions.get(name)?.[0],
  };

  const coupling: CouplingMetrics = {
    copyCount: countMatches(content, /^\s*COPY\s+([A-Z0-9-]+)/gim),
    uniqueCopybooks: extractUnique(content, /^\s*COPY\s+([A-Z0-9-]+)/gim),
    callCount: countMatches(content, /CALL\s+'([^']+)'/gi),
    callTargets: extractUnique(content, /CALL\s+'([^']+)'/gi),
    cicsFileRefs: extractUnique(content, /EXEC CICS\s+(?:READ|WRITE|REWRITE|DELETE|STARTBR|READNEXT|READPREV|ENDBR|UNLOCK)\s+[\s\S]*?\(\s*([A-Z0-9-]+)\s*\)/gi),
    execCics: countMatches(content, /EXEC CICS/gi),
    execSql: countMatches(content, /EXEC SQL/gi),
    execDli: countMatches(content, /EXEC DLI/gi),
    execMq: countMatches(content, /EXEC\s+MQ/gi),
  };

  const tests: TestMetrics = {
    cssetatyRules: countMatches(content, /COPY\s+CSSETATY\s+REPLACING/gi),
    validationFlags: countMatches(content, /FLG-[A-Z0-9-]+-(?:NOT-OK|BLANK)/gi),
    redefinesCount: countMatches(content, /\bREDEFINES\b/gi),
  };

  const patterns: PatternMetrics = {
    alterCount: countMatches(content, /\bALTER\b/gi),
    goToCount: countMatches(content, /\bGO TO\b/gi),
    comp3Count: countMatches(content, /COMP-3/gi),
    controlBlockRefs: countMatches(content, /SET\s+ADDRESS\s+OF/gi),
    occursDependingOn: countMatches(content, /OCCURS\s+DEPENDING\s+ON/gi),
  };

  const factors: string[] = [];
  let score = 0;

  // Manifest rules
  if (manifest.module !== "base") {
    score += 12;
    factors.push(`optional-module:${manifest.module}`);
  }
  if (lines > 2000) {
    score += 15;
    factors.push("large-program");
  } else if (lines > 1000) {
    score += 8;
    factors.push("medium-program");
  }
  if (!manifest.isOnline && !manifest.isBatch && coupling.execCics === 0) {
    score += 3;
    factors.push("unclassified-program");
  }

  // Coupling rules
  if (coupling.copyCount >= 20) {
    score += 12;
    factors.push("high-copybook-coupling");
  } else if (coupling.copyCount >= 10) {
    score += 6;
    factors.push("moderate-copybook-coupling");
  }
  if (coupling.callCount >= 10) {
    score += 10;
    factors.push("high-call-coupling");
  } else if (coupling.callCount >= 3) {
    score += 4;
    factors.push("moderate-call-coupling");
  }
  if (coupling.cicsFileRefs.length >= 4) {
    score += 8;
    factors.push("multi-file-cics");
  }
  if (coupling.execSql > 0) {
    score += 10;
    factors.push("db2-sql");
  }
  if (coupling.execDli > 0) {
    score += 12;
    factors.push("ims-dli");
  }
  if (coupling.execMq > 0) {
    score += 8;
    factors.push("mq-integration");
  }
  if (coupling.execCics > 0 && coupling.execSql > 0 && coupling.execDli > 0) {
    score += 15;
    factors.push("multi-platform-integration");
  }

  // Test rules (validation complexity increases test/migration effort)
  if (tests.cssetatyRules >= 20) {
    score += 12;
    factors.push("extensive-screen-validation");
  } else if (tests.cssetatyRules >= 5) {
    score += 5;
    factors.push("screen-validation-rules");
  }
  if (tests.validationFlags >= 40) {
    score += 6;
    factors.push("many-validation-flags");
  }
  if (tests.redefinesCount >= 10) {
    score += 6;
    factors.push("complex-data-layout");
  }

  // Legacy pattern penalties (CardDemo modernization exercise patterns)
  if (patterns.alterCount > 0) {
    score += 20;
    factors.push("alter-statements");
  }
  if (patterns.controlBlockRefs > 0) {
    score += 15;
    factors.push("control-block-addressing");
  }
  if (patterns.goToCount >= 15) {
    score += 10;
    factors.push("heavy-go-to");
  } else if (patterns.goToCount >= 5) {
    score += 5;
    factors.push("go-to-usage");
  }
  if (patterns.comp3Count >= 10) {
    score += 5;
    factors.push("comp-3-fields");
  }
  if (patterns.occursDependingOn > 0) {
    score += 8;
    factors.push("occurs-depending-on");
  }

  score = Math.min(100, score);

  let severity: Severity = "Low";
  if (score >= 70) severity = "Critical";
  else if (score >= 50) severity = "High";
  else if (score >= 30) severity = "Medium";

  return {
    manifest,
    coupling,
    tests,
    patterns,
    score,
    severity,
    factors,
  };
}

function buildBlockers(programs: ProgramScore[]): Blocker[] {
  const blockers: Blocker[] = [];

  const alterPrograms = programs.filter((p) => p.patterns.alterCount > 0);
  if (alterPrograms.length > 0) {
    blockers.push({
      id: "ALTER-GOTO-CONTROL-FLOW",
      severity: "Critical",
      description:
        "Programs use ALTER statements that rewrite control flow at runtime; automated refactoring tools cannot safely transform these without manual redesign.",
      programs: alterPrograms.map((p) => p.manifest.name),
    });
  }

  const controlBlockPrograms = programs.filter(
    (p) => p.patterns.controlBlockRefs > 0,
  );
  if (controlBlockPrograms.length > 0) {
    blockers.push({
      id: "CONTROL-BLOCK-ADDRESSING",
      severity: "Critical",
      description:
        "Programs address mainframe control blocks directly (SET ADDRESS OF); these patterns are platform-specific and block straightforward rehosting.",
      programs: controlBlockPrograms.map((p) => p.manifest.name),
    });
  }

  const multiPlatform = programs.filter(
    (p) =>
      p.coupling.execCics > 0 &&
      p.coupling.execSql > 0 &&
      p.coupling.execDli > 0,
  );
  if (multiPlatform.length > 0) {
    blockers.push({
      id: "CICS-DB2-IMS-TRIAD",
      severity: "Critical",
      description:
        "Programs combine CICS, DB2 SQL, and IMS DLI in one unit; modernization requires coordinated data-store and middleware migration.",
      programs: multiPlatform.map((p) => p.manifest.name),
    });
  }

  const largeValidation = programs.filter((p) => p.tests.cssetatyRules >= 20);
  if (largeValidation.length > 0) {
    blockers.push({
      id: "EXTENSIVE-VALIDATION-RULES",
      severity: "High",
      description:
        "Programs expand CSSETATY copybook validation macros extensively; parity testing is required before any screen/API rewrite.",
      programs: largeValidation.map((p) => p.manifest.name),
    });
  }

  const imsMq = programs.filter(
    (p) => p.manifest.module === "ims-db2-mq" && p.coupling.execMq > 0,
  );
  if (imsMq.length > 0) {
    blockers.push({
      id: "IMS-DB2-MQ-MODULE",
      severity: "High",
      description:
        "Optional authorization module spans IMS, DB2, and MQ; treat as a separate migration workstream with infrastructure prerequisites.",
      programs: imsMq.map((p) => p.manifest.name),
    });
  }

  const unmanifested = programs.filter(
    (p) =>
      p.manifest.isOnline &&
      p.manifest.module === "base" &&
      p.coupling.execCics > 0 &&
      p.coupling.copyCount === 0,
  );
  if (unmanifested.length > 0) {
    blockers.push({
      id: "MISSING-COPYBOOK-MANIFEST",
      severity: "Medium",
      description:
        "Online CICS programs with zero detected COPY statements may indicate incomplete source inventory or non-standard includes.",
      programs: unmanifested.map((p) => p.manifest.name),
    });
  }

  return blockers;
}

function selectPilotCandidates(programs: ProgramScore[]): PilotCandidate[] {
  const candidates = programs
    .filter((p) => {
      if (p.score >= 35) return false;
      if (p.patterns.alterCount > 0 || p.patterns.controlBlockRefs > 0) return false;
      if (p.coupling.execSql > 0 || p.coupling.execDli > 0 || p.coupling.execMq > 0) {
        return false;
      }
      if (p.manifest.lines > 1500) return false;
      if (p.tests.cssetatyRules >= 10) return false;
      return p.manifest.isOnline || p.manifest.isBatch;
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 8);

  return candidates.map((p) => {
    let rationale = "Low coupling and no legacy control-flow blockers.";
    if (p.manifest.isOnline && p.coupling.execCics > 0 && p.coupling.copyCount <= 8) {
      rationale = "Self-contained CICS online program with manageable copybook fan-in.";
    } else if (p.manifest.isBatch && p.coupling.execCics === 0) {
      rationale = "Batch-only program with VSAM/file I/O and no middleware dependencies.";
    } else if (p.manifest.name === "CSUTLDTC") {
      rationale = "Shared date utility with single responsibility; good extraction candidate.";
    }
    return {
      program: p.manifest.name,
      module: p.manifest.module,
      score: p.score,
      rationale,
    };
  });
}

function computeOverallSeverity(score: number): Severity {
  if (score >= 70) return "Critical";
  if (score >= 50) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

function buildReport(appRoot: string): RiskReport {
  const cobolFiles = walkFiles(appRoot, [".cbl"]);
  const copybookFiles = walkFiles(appRoot, [".cpy", ".CPY"]);
  const jclFiles = walkFiles(appRoot, [".jcl", ".JCL"]);
  const csdFiles = walkFiles(appRoot, [".csd"]);

  const csd = parseCsd(csdFiles);
  const programScores = cobolFiles
    .map((file) => analyzeProgram(file, csd.programTransactions))
    .sort((a, b) => b.score - a.score);

  const moduleCounts: Record<ModuleTier, number> = {
    base: 0,
    db2: 0,
    "ims-db2-mq": 0,
    mq: 0,
  };
  for (const p of programScores) {
    moduleCounts[p.manifest.module]++;
  }

  const copybookUsage = new Map<string, number>();
  for (const p of programScores) {
    for (const copy of p.coupling.uniqueCopybooks) {
      copybookUsage.set(copy, (copybookUsage.get(copy) ?? 0) + 1);
    }
  }
  const sharedCopybooks = [...copybookUsage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, usage]) => ({ name, usage }));

  const avg = (values: number[]) =>
    values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

  const overallScore = Math.round(
    avg(programScores.map((p) => p.score)) +
      (moduleCounts["ims-db2-mq"] > 0 ? 5 : 0) +
      (moduleCounts.db2 > 0 ? 3 : 0) +
      (moduleCounts.mq > 0 ? 2 : 0),
  );

  const blockers = buildBlockers(programScores);
  const pilotCandidates = selectPilotCandidates(programScores);

  return {
    generatedAt: new Date().toISOString(),
    appRoot: relative(REPO_ROOT, appRoot),
    overallScore: Math.min(100, overallScore),
    severity: computeOverallSeverity(Math.min(100, overallScore)),
    manifestSummary: {
      programs: programScores.length,
      copybooks: copybookFiles.length,
      jclJobs: jclFiles.length,
      csdPrograms: csd.programs.size,
      csdTransactions: csd.transactions.size,
      csdFiles: csd.files.size,
      modules: moduleCounts,
    },
    couplingSummary: {
      avgCopyCount: Math.round(avg(programScores.map((p) => p.coupling.copyCount)) * 10) / 10,
      maxCopyCount: Math.max(...programScores.map((p) => p.coupling.copyCount), 0),
      avgCallCount: Math.round(avg(programScores.map((p) => p.coupling.callCount)) * 10) / 10,
      sharedCopybooks,
    },
    testSummary: {
      programsWithValidationRules: programScores.filter((p) => p.tests.cssetatyRules > 0).length,
      totalCssetatyRules: programScores.reduce((sum, p) => sum + p.tests.cssetatyRules, 0),
      totalValidationFlags: programScores.reduce((sum, p) => sum + p.tests.validationFlags, 0),
    },
    blockers,
    pilotCandidates,
    topRiskPrograms: programScores.slice(0, 10),
    allPrograms: programScores,
  };
}

function renderMarkdown(report: RiskReport): string {
  const lines: string[] = [
    "# CardDemo Modernization Risk Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Overall Assessment",
    "",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| **Risk score** | **${report.overallScore}/100** |`,
    `| **Severity** | **${report.severity}** |`,
    `| Application root | \`${report.appRoot}/\` |`,
    "",
    "## Manifest Rules",
    "",
    "Inventory and topology signals from CSD definitions, source discovery, and module layout.",
    "",
    `| Artifact | Count |`,
    `| --- | ---: |`,
    `| COBOL programs | ${report.manifestSummary.programs} |`,
    `| Copybooks | ${report.manifestSummary.copybooks} |`,
    `| JCL jobs | ${report.manifestSummary.jclJobs} |`,
    `| CSD programs | ${report.manifestSummary.csdPrograms} |`,
    `| CSD transactions | ${report.manifestSummary.csdTransactions} |`,
    `| CSD files | ${report.manifestSummary.csdFiles} |`,
    "",
    "### Module Distribution",
    "",
    `| Module | Programs |`,
    `| --- | ---: |`,
    `| Base | ${report.manifestSummary.modules.base} |`,
    `| DB2 (transaction types) | ${report.manifestSummary.modules.db2} |`,
    `| IMS-DB2-MQ (authorizations) | ${report.manifestSummary.modules["ims-db2-mq"]} |`,
    `| MQ (account extraction) | ${report.manifestSummary.modules.mq} |`,
    "",
    "## Coupling Rules",
    "",
    "Copybook, subroutine, and middleware dependency density across programs.",
    "",
    `| Metric | Value |`,
    `| --- | ---: |`,
    `| Average COPY count per program | ${report.couplingSummary.avgCopyCount} |`,
    `| Maximum COPY count | ${report.couplingSummary.maxCopyCount} |`,
    `| Average CALL count per program | ${report.couplingSummary.avgCallCount} |`,
    "",
    "### Most Shared Copybooks",
    "",
    `| Copybook | Programs Using |`,
    `| --- | ---: |`,
    ...report.couplingSummary.sharedCopybooks.map(
      (c) => `| ${c.name} | ${c.usage} |`,
    ),
    "",
    "## Test Rules",
    "",
    "Screen validation complexity from CSSETATY macro expansion and flag checks.",
    "",
    `| Metric | Value |`,
    `| --- | ---: |`,
    `| Programs with CSSETATY rules | ${report.testSummary.programsWithValidationRules} |`,
    `| Total CSSETATY rule expansions | ${report.testSummary.totalCssetatyRules} |`,
    `| Total validation flag checks | ${report.testSummary.totalValidationFlags} |`,
    "",
    "## Blockers",
    "",
  ];

  if (report.blockers.length === 0) {
    lines.push("No modernization blockers detected.");
  } else {
    for (const blocker of report.blockers) {
      lines.push(`### ${blocker.id} (${blocker.severity})`);
      lines.push("");
      lines.push(blocker.description);
      lines.push("");
      lines.push(`Affected programs: ${blocker.programs.join(", ")}`);
      lines.push("");
    }
  }

  lines.push("## Pilot Candidates");
  lines.push("");
  lines.push(
    "Programs recommended for an initial modernization pilot due to lower scores and fewer blockers.",
  );
  lines.push("");
  lines.push("| Program | Module | Score | Rationale |");
  lines.push("| --- | --- | ---: | --- |");

  if (report.pilotCandidates.length === 0) {
    lines.push("| _none identified_ | | | |");
  } else {
    for (const candidate of report.pilotCandidates) {
      lines.push(
        `| ${candidate.program} | ${candidate.module} | ${candidate.score} | ${candidate.rationale} |`,
      );
    }
  }

  lines.push("");
  lines.push("## Top Risk Programs");
  lines.push("");
  lines.push("| Program | Module | Score | Severity | Key Factors |");
  lines.push("| --- | --- | ---: | --- | --- |");

  for (const program of report.topRiskPrograms) {
    lines.push(
      `| ${program.manifest.name} | ${program.manifest.module} | ${program.score} | ${program.severity} | ${program.factors.slice(0, 4).join(", ")} |`,
    );
  }

  lines.push("");
  lines.push("## Program Detail");
  lines.push("");
  lines.push("| Program | Lines | COPY | CALL | CICS | SQL | DLI | CSSETATY | Score |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");

  for (const program of report.allPrograms) {
    lines.push(
      `| ${program.manifest.name} | ${program.manifest.lines} | ${program.coupling.copyCount} | ${program.coupling.callCount} | ${program.coupling.execCics} | ${program.coupling.execSql} | ${program.coupling.execDli} | ${program.tests.cssetatyRules} | ${program.score} |`,
    );
  }

  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(
    "_Report generated by `scripts/score-risk.ts`. Re-run with `npm run score-risk`._",
  );

  return lines.join("\n");
}

function main(): void {
  const args = process.argv.slice(2);
  let appRoot = DEFAULT_APP_ROOT;
  let outputPath = DEFAULT_OUTPUT;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--app" && args[i + 1]) {
      appRoot = resolve(args[++i]);
    } else if (args[i] === "--out" && args[i + 1]) {
      outputPath = resolve(args[++i]);
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`Usage: score-risk.ts [--app <path>] [--out <path>]`);
      process.exit(0);
    }
  }

  if (!statSync(appRoot).isDirectory()) {
    console.error(`App root not found: ${appRoot}`);
    process.exit(1);
  }

  const report = buildReport(appRoot);
  const markdown = renderMarkdown(report);
  writeFileSync(outputPath, markdown, "utf8");

  console.log(`Risk score: ${report.overallScore}/100 (${report.severity})`);
  console.log(`Blockers: ${report.blockers.length}`);
  console.log(`Pilot candidates: ${report.pilotCandidates.length}`);
  console.log(`Report written to ${relative(REPO_ROOT, outputPath)}`);
}

main();
