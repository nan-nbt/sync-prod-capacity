#!/usr/bin/env node
// Faithful port of scripts/bash/setup-tasks.sh (spec-kit v0.11.8).
import fs from 'node:fs';
import { getFeaturePaths, formatSpeckitCommand, resolveTemplate, checkFile, checkDir, dirHasEntries } from './common.mjs';

let jsonMode = false;
for (const arg of process.argv.slice(2)) {
  if (arg === '--json') jsonMode = true;
  else if (arg === '--help' || arg === '-h') {
    console.log('Usage: setup-tasks.mjs [--json]\n  --json    Output results in JSON format\n  --help    Show this help message');
    process.exit(0);
  } else { console.error(`ERROR: Unknown option '${arg}'`); process.exit(1); }
}

let paths;
try {
  paths = getFeaturePaths();
} catch (err) {
  console.error(err.message);
  console.error('ERROR: Failed to resolve feature paths');
  process.exit(1);
}

const { REPO_ROOT, FEATURE_DIR, FEATURE_SPEC, IMPL_PLAN, RESEARCH, DATA_MODEL, QUICKSTART, CONTRACTS_DIR } = paths;

if (!fs.existsSync(IMPL_PLAN) || !fs.statSync(IMPL_PLAN).isFile()) {
  console.error(`ERROR: plan.md not found in ${FEATURE_DIR}`);
  console.error(`Run ${formatSpeckitCommand('plan', REPO_ROOT)} first to create the implementation plan.`);
  process.exit(1);
}
if (!fs.existsSync(FEATURE_SPEC) || !fs.statSync(FEATURE_SPEC).isFile()) {
  console.error(`ERROR: spec.md not found in ${FEATURE_DIR}`);
  console.error(`Run ${formatSpeckitCommand('specify', REPO_ROOT)} first to create the feature structure.`);
  process.exit(1);
}

const docs = [];
if (fs.existsSync(RESEARCH) && fs.statSync(RESEARCH).isFile()) docs.push('research.md');
if (fs.existsSync(DATA_MODEL) && fs.statSync(DATA_MODEL).isFile()) docs.push('data-model.md');
if (dirHasEntries(CONTRACTS_DIR)) docs.push('contracts/');
if (fs.existsSync(QUICKSTART) && fs.statSync(QUICKSTART).isFile()) docs.push('quickstart.md');

const tasksTemplate = resolveTemplate('tasks-template', REPO_ROOT);
if (!tasksTemplate || !fs.existsSync(tasksTemplate)) {
  console.error(`ERROR: Could not resolve required tasks-template from the template override stack for ${REPO_ROOT}`);
  console.error("Template 'tasks-template' was not found in any supported location (overrides, presets, extensions, or shared core). Add an override at .specify/templates/overrides/tasks-template.md, or run 'specify init' / reinstall shared infra to restore the core .specify/templates/tasks-template.md template.");
  process.exit(1);
}

if (jsonMode) {
  console.log(JSON.stringify({ FEATURE_DIR, AVAILABLE_DOCS: docs, TASKS_TEMPLATE: tasksTemplate }));
} else {
  console.log(`FEATURE_DIR: ${FEATURE_DIR}`);
  console.log(`TASKS_TEMPLATE: ${tasksTemplate}`);
  console.log('AVAILABLE_DOCS:');
  console.log(checkFile(RESEARCH, 'research.md'));
  console.log(checkFile(DATA_MODEL, 'data-model.md'));
  console.log(checkDir(CONTRACTS_DIR, 'contracts/'));
  console.log(checkFile(QUICKSTART, 'quickstart.md'));
}
