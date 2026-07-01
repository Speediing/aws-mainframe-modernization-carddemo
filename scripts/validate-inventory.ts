#!/usr/bin/env node
/**
 * Validates inventory.json program entries against on-disk COBOL sources.
 *
 * Ensures each program name resolves to an existing .cbl file at the declared path.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, extname, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_INVENTORY = resolve(REPO_ROOT, "inventory.json");

interface ProgramEntry {
  name: string;
  path: string;
}

interface Inventory {
  programs: ProgramEntry[];
}

function loadInventory(path: string): Inventory {
  if (!statSync(path, { throwIfNoEntry: false })?.isFile()) {
    console.error(`Inventory not found: ${path}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, "utf8")) as Inventory;
}

function main(): void {
  const args = process.argv.slice(2);
  let inventoryPath = DEFAULT_INVENTORY;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--inventory" && args[i + 1]) {
      inventoryPath = resolve(args[++i]);
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log("Usage: validate-inventory.ts [--inventory <path>]");
      process.exit(0);
    }
  }

  const inventory = loadInventory(inventoryPath);
  const errors: string[] = [];

  for (const program of inventory.programs) {
    const absolutePath = resolve(REPO_ROOT, program.path);
    const extension = extname(program.path);

    if (extension.toLowerCase() !== ".cbl") {
      errors.push(`${program.name}: path must end with .cbl (got ${program.path})`);
      continue;
    }

    if (!existsSync(absolutePath)) {
      errors.push(`${program.name}: missing COBOL source at ${program.path}`);
      continue;
    }

    const fileStem = basename(program.path, extension);
    if (fileStem.toUpperCase() !== program.name.toUpperCase()) {
      errors.push(
        `${program.name}: path ${program.path} does not match program name (${fileStem})`,
      );
    }
  }

  if (errors.length > 0) {
    console.error(`Inventory validation failed (${errors.length} issue(s)):`);
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  console.log(`Validated ${inventory.programs.length} program(s) in inventory.json`);
}

main();
