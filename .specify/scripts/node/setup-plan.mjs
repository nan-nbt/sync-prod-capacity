#!/usr/bin/env node
// Faithful port of scripts/bash/setup-plan.sh (spec-kit v0.11.8).
import fs from 'node:fs';
import { getFeaturePaths, resolveTemplate } from './common.mjs';

let jsonMode = false;
for (const arg of process.argv.slice(2)) {
  if (arg === '--json') jsonMode = true;
  else if (arg === '--help' || arg === '-h') {
    console.log('Usage: setup-plan.mjs [--json]\n  --json    Output results in JSON format\n  --help    Show this help message');
    process.exit(0);
  }
  // Unknown args are ignored (mirrors bash: collected into ARGS, unused).
}

let paths;
try {
  paths = getFeaturePaths();
} catch (err) {
  console.error(err.message);
  console.error('ERROR: Failed to resolve feature paths');
  process.exit(1);
}

const { REPO_ROOT, CURRENT_BRANCH, FEATURE_DIR, FEATURE_SPEC, IMPL_PLAN } = paths;

fs.mkdirSync(FEATURE_DIR, { recursive: true });

const log = (msg) => { if (jsonMode) console.error(msg); else console.log(msg); };

if (fs.existsSync(IMPL_PLAN)) {
  log(`Plan already exists at ${IMPL_PLAN}, skipping template copy`);
} else {
  const template = resolveTemplate('plan-template', REPO_ROOT);
  if (template && fs.existsSync(template)) {
    fs.copyFileSync(template, IMPL_PLAN);
    log(`Copied plan template to ${IMPL_PLAN}`);
  } else {
    log('Warning: Plan template not found');
    fs.closeSync(fs.openSync(IMPL_PLAN, 'a'));
  }
}

if (jsonMode) {
  console.log(JSON.stringify({ FEATURE_SPEC, IMPL_PLAN, SPECS_DIR: FEATURE_DIR, BRANCH: CURRENT_BRANCH }));
} else {
  console.log(`FEATURE_SPEC: ${FEATURE_SPEC}`);
  console.log(`IMPL_PLAN: ${IMPL_PLAN}`);
  console.log(`SPECS_DIR: ${FEATURE_DIR}`);
  console.log(`BRANCH: ${CURRENT_BRANCH}`);
}
