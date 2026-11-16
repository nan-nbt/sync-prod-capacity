#!/usr/bin/env node
// Faithful port of scripts/bash/check-prerequisites.sh (spec-kit v0.11.8).
import fs from 'node:fs';
import { getFeaturePaths, formatSpeckitCommand, checkFile, checkDir, dirHasEntries } from './common.mjs';

let jsonMode = false;
let requireTasks = false;
let includeTasks = false;
let pathsOnly = false;

for (const arg of process.argv.slice(2)) {
  switch (arg) {
    case '--json': jsonMode = true; break;
    case '--require-tasks': requireTasks = true; break;
    case '--include-tasks': includeTasks = true; break;
    case '--paths-only': pathsOnly = true; break;
    case '--help':
    case '-h':
      console.log(`Usage: check-prerequisites.mjs [OPTIONS]

Consolidated prerequisite checking for Spec-Driven Development workflow.

OPTIONS:
  --json              Output in JSON format
  --require-tasks     Require tasks.md to exist (for implementation phase)
  --include-tasks     Include tasks.md in AVAILABLE_DOCS list
  --paths-only        Only output path variables (no prerequisite validation)
  --help, -h          Show this help message`);
      process.exit(0);
      break;
    default:
      console.error(`ERROR: Unknown option '${arg}'. Use --help for usage information.`);
      process.exit(1);
  }
}

let paths;
try {
  paths = getFeaturePaths();
} catch (err) {
  console.error(err.message);
  console.error('ERROR: Failed to resolve feature paths');
  process.exit(1);
}

const { REPO_ROOT, CURRENT_BRANCH, FEATURE_DIR, FEATURE_SPEC, IMPL_PLAN, TASKS, RESEARCH, DATA_MODEL, QUICKSTART, CONTRACTS_DIR } = paths;

if (pathsOnly) {
  if (jsonMode) {
    console.log(JSON.stringify({ REPO_ROOT, BRANCH: CURRENT_BRANCH, FEATURE_DIR, FEATURE_SPEC, IMPL_PLAN, TASKS }));
  } else {
    console.log(`REPO_ROOT: ${REPO_ROOT}`);
    console.log(`BRANCH: ${CURRENT_BRANCH}`);
    console.log(`FEATURE_DIR: ${FEATURE_DIR}`);
    console.log(`FEATURE_SPEC: ${FEATURE_SPEC}`);
    console.log(`IMPL_PLAN: ${IMPL_PLAN}`);
    console.log(`TASKS: ${TASKS}`);
  }
  process.exit(0);
}

if (!fs.existsSync(FEATURE_DIR) || !fs.statSync(FEATURE_DIR).isDirectory()) {
  console.error(`ERROR: Feature directory not found: ${FEATURE_DIR}`);
  console.error(`Run ${formatSpeckitCommand('specify', REPO_ROOT)} first to create the feature structure.`);
  process.exit(1);
}

if (!fs.existsSync(IMPL_PLAN) || !fs.statSync(IMPL_PLAN).isFile()) {
  console.error(`ERROR: plan.md not found in ${FEATURE_DIR}`);
  console.error(`Run ${formatSpeckitCommand('plan', REPO_ROOT)} first to create the implementation plan.`);
  process.exit(1);
}

if (requireTasks && !(fs.existsSync(TASKS) && fs.statSync(TASKS).isFile())) {
  console.error(`ERROR: tasks.md not found in ${FEATURE_DIR}`);
  console.error(`Run ${formatSpeckitCommand('tasks', REPO_ROOT)} first to create the task list.`);
  process.exit(1);
}

const docs = [];
if (fs.existsSync(RESEARCH) && fs.statSync(RESEARCH).isFile()) docs.push('research.md');
if (fs.existsSync(DATA_MODEL) && fs.statSync(DATA_MODEL).isFile()) docs.push('data-model.md');
if (dirHasEntries(CONTRACTS_DIR)) docs.push('contracts/');
if (fs.existsSync(QUICKSTART) && fs.statSync(QUICKSTART).isFile()) docs.push('quickstart.md');
if (includeTasks && fs.existsSync(TASKS) && fs.statSync(TASKS).isFile()) docs.push('tasks.md');

if (jsonMode) {
  console.log(JSON.stringify({ FEATURE_DIR, AVAILABLE_DOCS: docs }));
} else {
  console.log(`FEATURE_DIR:${FEATURE_DIR}`);
  console.log('AVAILABLE_DOCS:');
  console.log(checkFile(RESEARCH, 'research.md'));
  console.log(checkFile(DATA_MODEL, 'data-model.md'));
  console.log(checkDir(CONTRACTS_DIR, 'contracts/'));
  console.log(checkFile(QUICKSTART, 'quickstart.md'));
  if (includeTasks) console.log(checkFile(TASKS, 'tasks.md'));
}
