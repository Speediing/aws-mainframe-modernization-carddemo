#!/usr/bin/env node
/**
 * CardDemo modernization wave planner.
 *
 * Reads inventory.json and produces a dependency-aware migration wave plan
 * grouped by foundation layers, pilot-ready components, and technology stack.
 */

import { readFileSync, statSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_INVENTORY = joinPath(REPO_ROOT, "inventory.json");
const DEFAULT_OUTPUT = joinPath(REPO_ROOT, "waves.md");

function joinPath(...parts: string[]): string {
  return resolve(...parts);
}

type ModuleKind = "foundation" | "batch" | "online" | "extension" | "tooling";
type Complexity = "low" | "medium" | "high";

interface ModuleDef {
  id: string;
  name: string;
  path: string;
  kind: ModuleKind;
  technologies: string[];
  pilotReady: boolean;
  inboundModules: string[];
  outboundModules: string[];
  priority: number;
}

interface ProgramEntry {
  name: string;
  path: string;
  moduleId: string;
  lines: number;
  kind: "online" | "batch" | "utility";
  transaction?: string;
  pilotReady: boolean;
  complexity: Complexity;
  technologies: string[];
  dependencies: {
    copybooks: string[];
    calls: string[];
    jclJobs: string[];
  };
}

interface JclEntry {
  name: string;
  path: string;
  moduleId: string;
  programs: string[];
  pilotReady: boolean;
}

interface CopybookEntry {
  name: string;
  path: string;
  moduleId: string;
  fanIn: number;
}

interface Inventory {
  generatedAt: string;
  repository: string;
  summary: {
    programs: number;
    copybooks: number;
    jclJobs: number;
    modules: number;
  };
  modules: ModuleDef[];
  programs: ProgramEntry[];
  jclJobs: JclEntry[];
  copybooks: CopybookEntry[];
  systemDependencies: Array<{ id: string; consumedBy: string[] }>;
}

interface WaveItem {
  id: string;
  name: string;
  type: "module" | "program" | "jcl" | "copybook-group";
  path?: string;
  lines?: number;
  pilotReady: boolean;
  rationale?: string;
}

interface Wave {
  number: number;
  title: string;
  objective: string;
  prerequisites: number[];
  items: WaveItem[];
  technologies: string[];
  estimatedPrograms: number;
  estimatedLines: number;
  risk: "low" | "medium" | "high";
}

interface WavePlan {
  generatedAt: string;
  inventoryGeneratedAt: string;
  repository: string;
  totalWaves: number;
  waves: Wave[];
  deferred: WaveItem[];
  summary: {
    totalPrograms: number;
    totalLines: number;
    pilotReadyPrograms: number;
  };
}

const DEFERRED_PROGRAMS = new Set(["COACTUPC", "CBSTM03A"]);

/** JCL jobs that define or load VSAM datasets (environment setup, not batch pipeline). */
const VSAM_SETUP_JCL = new Set([
  "ACCTFILE",
  "CARDFILE",
  "CUSTFILE",
  "DEFCUST",
  "DEFGDGB",
  "DEFGDGD",
  "DISCGRP",
  "DUSRSECJ",
  "ESDSRRDS",
  "REPTFILE",
  "TCATBALF",
  "TRANCATG",
  "TRANFILE",
  "TRANTYPE",
  "XREFFILE",
]);

const WAVE_DEFINITIONS: Array<{
  number: number;
  title: string;
  objective: string;
  prerequisites: number[];
  moduleIds: string[];
  risk: "low" | "medium" | "high";
  programFilter?: (p: ProgramEntry) => boolean;
  jclFilter?: (j: JclEntry) => boolean;
}> = [
  {
    number: 1,
    title: "Foundation — data contracts and platform definitions",
    objective:
      "Extract VSAM record layouts, BMS screen maps, assembler utilities, and CICS resource definitions before any runtime migration.",
    prerequisites: [],
    moduleIds: ["base-copybooks", "base-bms", "base-asm", "base-csd", "samples", "scripts"],
    risk: "low",
    jclFilter: (j) => j.moduleId === "base-jcl" && VSAM_SETUP_JCL.has(j.name),
  },
  {
    number: 2,
    title: "Pilot — isolated MQ services and simple batch readers",
    objective:
      "Validate copybook mapping and middleware translation with leaf modules that have no inbound repo dependencies.",
    prerequisites: [1],
    moduleIds: ["ext-vsam-mq", "base-batch"],
    risk: "low",
    programFilter: (p) => p.pilotReady,
    jclFilter: (j) => j.pilotReady && ["READACCT", "READCARD", "READXREF", "READCUST", "WAITSTEP"].includes(j.name),
  },
  {
    number: 3,
    title: "Core batch pipeline",
    objective:
      "Migrate transaction posting, interest calculation, statement generation, and import/export after data contracts are stable.",
    prerequisites: [1, 2],
    moduleIds: ["base-jcl", "base-batch"],
    risk: "medium",
    programFilter: (p) => p.moduleId === "base-batch" && !p.pilotReady,
    jclFilter: (j) =>
      j.moduleId === "base-jcl" &&
      !["READACCT", "READCARD", "READXREF", "READCUST", "WAITSTEP"].includes(j.name) &&
      !VSAM_SETUP_JCL.has(j.name),
  },
  {
    number: 4,
    title: "Core online — CICS transactions and screens",
    objective:
      "Modernize sign-on, menus, and account/card/transaction screens; defer the largest monoliths until patterns are proven.",
    prerequisites: [1, 3],
    moduleIds: ["base-online"],
    risk: "high",
    programFilter: (p) => p.moduleId === "base-online" && p.complexity !== "high" && !DEFERRED_PROGRAMS.has(p.name),
  },
  {
    number: 5,
    title: "DB2 transaction type extension",
    objective:
      "Migrate embedded SQL programs and DB2 schema after core VSAM and online flows are validated.",
    prerequisites: [1, 4],
    moduleIds: ["ext-trntype-db2"],
    risk: "medium",
  },
  {
    number: 6,
    title: "IMS/DB2/MQ authorization extension",
    objective:
      "Tackle the triple-stack authorization module last, once MQ patterns and DB2 migration are established.",
    prerequisites: [1, 2, 5],
    moduleIds: ["ext-auth-ims-db2-mq"],
    risk: "high",
  },
];

function loadInventory(path: string): Inventory {
  if (!statSync(path, { throwIfNoEntry: false })?.isFile()) {
    console.error(`Inventory not found: ${path}`);
    console.error("Run the inventory agent first to produce inventory.json.");
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, "utf8")) as Inventory;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function buildWavePlan(inventory: Inventory): WavePlan {
  const moduleById = new Map(inventory.modules.map((m) => [m.id, m]));
  const assignedPrograms = new Set<string>();
  const assignedJcl = new Set<string>();
  const waves: Wave[] = [];

  for (const def of WAVE_DEFINITIONS) {
    const items: WaveItem[] = [];
    const technologies = new Set<string>();

    for (const moduleId of def.moduleIds) {
      const mod = moduleById.get(moduleId);
      if (!mod) continue;

      technologies.add(...mod.technologies);
      items.push({
        id: mod.id,
        name: mod.name,
        type: "module",
        path: mod.path,
        pilotReady: mod.pilotReady,
        rationale: `${mod.kind} module; outbound deps: ${mod.outboundModules.join(", ") || "none"}`,
      });
    }

    const programCandidates = inventory.programs.filter((p) => {
      if (assignedPrograms.has(p.name)) return false;
      if (DEFERRED_PROGRAMS.has(p.name)) return false;
      if (!def.moduleIds.includes(p.moduleId)) return false;
      return def.programFilter ? def.programFilter(p) : true;
    });

    for (const program of programCandidates.sort((a, b) => a.lines - b.lines)) {
      assignedPrograms.add(program.name);
      technologies.add(...program.technologies);
      items.push({
        id: program.name,
        name: program.name,
        type: "program",
        path: program.path,
        lines: program.lines,
        pilotReady: program.pilotReady,
        rationale: [
          program.kind,
          program.transaction ? `trans ${program.transaction}` : null,
          `${program.complexity} complexity`,
          program.dependencies.jclJobs.length > 0
            ? `jobs: ${program.dependencies.jclJobs.join(", ")}`
            : null,
        ]
          .filter(Boolean)
          .join("; "),
      });
    }

    const jclCandidates = inventory.jclJobs.filter((j) => {
      if (assignedJcl.has(j.name)) return false;
      if (def.jclFilter) return def.jclFilter(j);
      if (!def.moduleIds.includes(j.moduleId)) return false;
      return true;
    });

    for (const job of jclCandidates.sort((a, b) => a.name.localeCompare(b.name))) {
      assignedJcl.add(job.name);
      items.push({
        id: job.name,
        name: job.name,
        type: "jcl",
        path: job.path,
        pilotReady: job.pilotReady,
        rationale: job.programs.length > 0 ? `PGM=${job.programs.join(", ")}` : "utility job",
      });
    }

    if (def.number === 1) {
      const topCopybooks = inventory.copybooks
        .filter((c) => c.fanIn >= 5)
        .sort((a, b) => b.fanIn - a.fanIn)
        .slice(0, 10);
      if (topCopybooks.length > 0) {
        items.push({
          id: "high-fan-in-copybooks",
          name: "High fan-in copybooks",
          type: "copybook-group",
          pilotReady: true,
          rationale: topCopybooks.map((c) => `${c.name} (${c.fanIn})`).join(", "),
        });
      }
    }

    const wavePrograms = items.filter((i) => i.type === "program");
    const estimatedLines = wavePrograms.reduce((sum, i) => sum + (i.lines ?? 0), 0);

    waves.push({
      number: def.number,
      title: def.title,
      objective: def.objective,
      prerequisites: def.prerequisites,
      items,
      technologies: unique([...technologies]).sort(),
      estimatedPrograms: wavePrograms.length,
      estimatedLines,
      risk: def.risk,
    });
  }

  const deferred: WaveItem[] = inventory.programs
    .filter((p) => DEFERRED_PROGRAMS.has(p.name))
    .map((p) => ({
      id: p.name,
      name: p.name,
      type: "program" as const,
      path: p.path,
      lines: p.lines,
      pilotReady: false,
      rationale: `Deferred — ${p.lines} lines, ${p.complexity} complexity; decompose before migration`,
    }));

  const allWavePrograms = waves.flatMap((w) =>
    w.items.filter((i) => i.type === "program"),
  );
  const unassigned = inventory.programs.filter(
    (p) =>
      !assignedPrograms.has(p.name) &&
      !DEFERRED_PROGRAMS.has(p.name) &&
      !allWavePrograms.some((i) => i.id === p.name),
  );

  if (unassigned.length > 0) {
    const lastWave = waves[waves.length - 1];
    for (const program of unassigned) {
      lastWave.items.push({
        id: program.name,
        name: program.name,
        type: "program",
        path: program.path,
        lines: program.lines,
        pilotReady: program.pilotReady,
        rationale: "Assigned to final wave — extension dependency closure",
      });
      lastWave.estimatedPrograms += 1;
      lastWave.estimatedLines += program.lines;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    inventoryGeneratedAt: inventory.generatedAt,
    repository: inventory.repository,
    totalWaves: waves.length,
    waves,
    deferred,
    summary: {
      totalPrograms: inventory.summary.programs,
      totalLines: inventory.programs.reduce((sum, p) => sum + p.lines, 0),
      pilotReadyPrograms: inventory.programs.filter((p) => p.pilotReady).length,
    },
  };
}

function renderMarkdown(plan: WavePlan, inventory: Inventory): string {
  const lines: string[] = [
    "# CardDemo Modernization Wave Plan",
    "",
    `Generated: ${plan.generatedAt}`,
    "",
    "## Executive Summary",
    "",
    "This wave plan sequences CardDemo modernization from foundation artifacts through optional multi-stack extensions. Waves respect module dependencies identified in `inventory.json` and prioritize `pilot_ready` components for early validation.",
    "",
    "| Metric | Value |",
    "| --- | --- |",
    `| Repository | ${plan.repository} |`,
    `| Inventory snapshot | ${plan.inventoryGeneratedAt} |`,
    `| Total waves | ${plan.totalWaves} |`,
    `| COBOL programs | ${plan.summary.totalPrograms} |`,
    `| Total lines of COBOL | ${plan.summary.totalLines.toLocaleString()} |`,
    `| Pilot-ready programs | ${plan.summary.pilotReadyPrograms} |`,
    "",
    "## Wave Sequence Overview",
    "",
    "```",
    "Wave 1  Foundation (copybooks, BMS, asm, CSD, tooling)",
    "  │",
    "Wave 2  Pilot (MQ extension + simple batch readers)",
    "  │",
    "Wave 3  Core batch pipeline (posting, interest, statements)",
    "  │",
    "Wave 4  Core online (CICS screens, excluding monoliths)",
    "  │",
    "Wave 5  DB2 transaction type extension",
    "  │",
    "Wave 6  IMS/DB2/MQ authorization extension",
    "  │",
    "  └──► Deferred: COACTUPC, CBSTM03A (decompose first)",
    "```",
    "",
    "## Module Dependency Context",
    "",
    "| Module | Kind | Pilot ready | Outbound dependencies |",
    "| --- | --- | :---: | --- |",
    ...inventory.modules
      .sort((a, b) => a.priority - b.priority)
      .map(
        (m) =>
          `| ${m.name} | ${m.kind} | ${m.pilotReady ? "yes" : "no"} | ${m.outboundModules.join(", ") || "—"} |`,
      ),
    "",
  ];

  for (const wave of plan.waves) {
    lines.push(`## Wave ${wave.number}: ${wave.title}`);
    lines.push("");
    lines.push(`**Objective:** ${wave.objective}`);
    lines.push("");
    lines.push(
      `**Prerequisites:** ${wave.prerequisites.length > 0 ? wave.prerequisites.map((n) => `Wave ${n}`).join(", ") : "None"}`,
    );
    lines.push(`**Risk:** ${wave.risk}`);
    lines.push(
      `**Scope:** ${wave.estimatedPrograms} programs (${wave.estimatedLines.toLocaleString()} lines), ${wave.items.filter((i) => i.type === "jcl").length} JCL jobs`,
    );
    lines.push(`**Technologies:** ${wave.technologies.join(", ")}`);
    lines.push("");
    lines.push("| Item | Type | Lines | Pilot | Notes |");
    lines.push("| --- | --- | ---: | :---: | --- |");

    for (const item of wave.items) {
      lines.push(
        `| ${item.name} | ${item.type} | ${item.lines ?? "—"} | ${item.pilotReady ? "yes" : "no"} | ${item.rationale ?? ""} |`,
      );
    }
    lines.push("");
  }

  if (plan.deferred.length > 0) {
    lines.push("## Deferred Components");
    lines.push("");
    lines.push(
      "These high-complexity programs should be decomposed into smaller services before assignment to a migration wave.",
    );
    lines.push("");
    lines.push("| Program | Lines | Rationale |");
    lines.push("| --- | ---: | --- |");
    for (const item of plan.deferred) {
      lines.push(`| ${item.name} | ${item.lines ?? "—"} | ${item.rationale ?? ""} |`);
    }
    lines.push("");
  }

  lines.push("## System Dependencies by Wave");
  lines.push("");
  lines.push("| System | Required starting wave | Consumed by |");
  lines.push("| --- | ---: | --- |");

  const systemWave: Record<string, number> = {
    "system:cics-bms": 4,
    "system:lang-runtime": 2,
    "system:zos-util": 3,
    "system:ibm-mq": 2,
    "system:db2": 5,
    "system:ims-dli": 6,
  };

  for (const dep of inventory.systemDependencies) {
    lines.push(
      `| ${dep.id} | ${systemWave[dep.id] ?? "—"} | ${dep.consumedBy.join(", ")} |`,
    );
  }

  lines.push("");
  lines.push("## Success Criteria");
  lines.push("");
  lines.push("1. **Wave 1 complete** — All VSAM record layouts (`CV*.cpy`) documented in target schema; BMS maps catalogued.");
  lines.push("2. **Wave 2 complete** — `CODATE01` and `COACCT01` MQ request/response behavior replicated; batch readers produce equivalent output.");
  lines.push("3. **Wave 3 complete** — `POSTTRAN`/`CBTRN02C`, `INTCALC`/`CBACT04C`, and `CREASTMT` pipeline runs end-to-end on target platform.");
  lines.push("4. **Wave 4 complete** — CC00 sign-on through main menu and at least one account/card/transaction flow operational.");
  lines.push("5. **Wave 5 complete** — DB2 transaction type CRUD (CTTU, CTLI) and batch extract (`TRANEXTR`) validated.");
  lines.push("6. **Wave 6 complete** — Authorization MQ trigger, IMS browse, and DB2 fraud logging integrated.");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(
    "_Report generated by `scripts/plan-waves.ts`. Re-run with `npm run plan-waves` after updating `inventory.json`._",
  );

  return lines.join("\n");
}

function main(): void {
  const args = process.argv.slice(2);
  let inventoryPath = DEFAULT_INVENTORY;
  let outputPath = DEFAULT_OUTPUT;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--inventory" && args[i + 1]) {
      inventoryPath = resolve(args[++i]);
    } else if (args[i] === "--out" && args[i + 1]) {
      outputPath = resolve(args[++i]);
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log("Usage: plan-waves.ts [--inventory <path>] [--out <path>]");
      process.exit(0);
    }
  }

  const inventory = loadInventory(inventoryPath);
  const plan = buildWavePlan(inventory);
  const markdown = renderMarkdown(plan, inventory);
  writeFileSync(outputPath, markdown, "utf8");

  console.log(`Wave plan: ${plan.totalWaves} waves`);
  console.log(`Deferred: ${plan.deferred.length} programs`);
  for (const wave of plan.waves) {
    console.log(
      `  Wave ${wave.number}: ${wave.estimatedPrograms} programs, ${wave.estimatedLines} lines (${wave.risk} risk)`,
    );
  }
  console.log(`Report written to ${relative(REPO_ROOT, outputPath)}`);
}

main();
