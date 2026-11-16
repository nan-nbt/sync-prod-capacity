#!/usr/bin/env node
// Faithful port of scripts/bash/create-new-feature.sh (spec-kit v0.11.8).
// Creates the feature directory + spec.md and persists .specify/feature.json.
// Branch creation itself is delegated to the branch-convention extension.
import fs from 'node:fs';
import path from 'node:path';
import { getRepoRoot, persistFeatureJson, resolveTemplate } from './common.mjs';

let jsonMode = false;
let dryRun = false;
let allowExisting = false;
let shortName = '';
let branchNumber = '';
let useTimestamp = false;
const descriptionParts = [];

function usage(stream = process.stdout) {
  stream.write('Usage: create-new-feature.mjs [--json] [--dry-run] [--allow-existing-branch] [--short-name <name>] [--number N] [--timestamp] <feature_description>\n');
}

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  switch (arg) {
    case '--json':
      jsonMode = true;
      break;
    case '--dry-run':
      dryRun = true;
      break;
    case '--allow-existing-branch':
      allowExisting = true;
      break;
    case '--short-name': {
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) { console.error('Error: --short-name requires a value'); process.exit(1); }
      i += 1;
      shortName = value;
      break;
    }
    case '--number': {
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) { console.error('Error: --number requires a value'); process.exit(1); }
      i += 1;
      branchNumber = value;
      break;
    }
    case '--timestamp':
      useTimestamp = true;
      break;
    case '--help':
    case '-h':
      usage();
      console.log('\nOptions:\n  --json              Output in JSON format\n  --dry-run           Compute feature name and paths without creating directories or files\n  --allow-existing-branch  Reuse an existing feature directory if it already exists\n  --short-name <name> Provide a custom short name (2-4 words) for the feature\n  --number N          Specify branch number manually (overrides auto-detection)\n  --timestamp         Use timestamp prefix (YYYYMMDD-HHMMSS) instead of sequential numbering\n  --help, -h          Show this help message');
      process.exit(0);
      break;
    default:
      descriptionParts.push(arg);
  }
}

let featureDescription = descriptionParts.join(' ').trim();
if (!featureDescription) {
  usage(process.stderr);
  process.exit(1);
}
featureDescription = featureDescription.replace(/^\s+|\s+$/g, '');
if (!featureDescription) {
  console.error('Error: Feature description cannot be empty or contain only whitespace');
  process.exit(1);
}

const STOP_WORDS = new Set(['i', 'a', 'an', 'the', 'to', 'for', 'of', 'in', 'on', 'at', 'by', 'with', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must', 'shall', 'this', 'that', 'these', 'those', 'my', 'your', 'our', 'their', 'want', 'need', 'add', 'get', 'set']);

function cleanBranchName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-/, '').replace(/-$/, '');
}

function generateBranchName(description) {
  const words = description.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
  const meaningful = [];
  for (const word of words) {
    if (STOP_WORDS.has(word)) continue;
    if (word.length >= 3) {
      meaningful.push(word);
    } else if (new RegExp(`\\b${word.toUpperCase()}\\b`).test(description)) {
      meaningful.push(word);
    }
  }
  if (meaningful.length > 0) {
    const maxWords = meaningful.length === 4 ? 4 : 3;
    return meaningful.slice(0, maxWords).join('-');
  }
  return cleanBranchName(description).split('-').filter(Boolean).slice(0, 3).join('-');
}

function getHighestFromSpecs(specsDir) {
  let highest = 0;
  if (!fs.existsSync(specsDir)) return highest;
  for (const entry of fs.readdirSync(specsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (/^[0-9]{3,}-/.test(name) && !/^[0-9]{8}-[0-9]{6}-/.test(name)) {
      const num = Number.parseInt(name.match(/^[0-9]+/)[0], 10);
      if (num > highest) highest = num;
    }
  }
  return highest;
}

function timestamp() {
  const now = new Date();
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
}

const repoRoot = getRepoRoot();
process.chdir(repoRoot);

const specsDir = path.join(repoRoot, 'specs');
if (!dryRun) fs.mkdirSync(specsDir, { recursive: true });

let branchSuffix = shortName ? cleanBranchName(shortName) : generateBranchName(featureDescription);

if (useTimestamp && branchNumber) {
  console.error('[specify] Warning: --number is ignored when --timestamp is used');
  branchNumber = '';
}

let featureNum;
if (useTimestamp) {
  featureNum = timestamp();
} else {
  if (!branchNumber) {
    branchNumber = String(getHighestFromSpecs(specsDir) + 1);
  }
  featureNum = String(Number.parseInt(branchNumber, 10)).padStart(3, '0');
}

let branchName = `${featureNum}-${branchSuffix}`;

const MAX_BRANCH_LENGTH = 244;
if (branchName.length > MAX_BRANCH_LENGTH) {
  const prefixLength = featureNum.length + 1;
  const maxSuffixLength = MAX_BRANCH_LENGTH - prefixLength;
  const truncatedSuffix = branchSuffix.slice(0, maxSuffixLength).replace(/-$/, '');
  const original = branchName;
  branchName = `${featureNum}-${truncatedSuffix}`;
  console.error("[specify] Warning: Branch name exceeded GitHub's 244-byte limit");
  console.error(`[specify] Original: ${original} (${original.length} bytes)`);
  console.error(`[specify] Truncated to: ${branchName} (${branchName.length} bytes)`);
}

const featureDir = path.join(specsDir, branchName);
const specFile = path.join(featureDir, 'spec.md');

if (!dryRun) {
  if (fs.existsSync(featureDir) && !allowExisting) {
    if (useTimestamp) {
      console.error(`Error: Feature directory '${featureDir}' already exists. Rerun to get a new timestamp or use a different --short-name.`);
    } else {
      console.error(`Error: Feature directory '${featureDir}' already exists. Please use a different feature name or specify a different number with --number.`);
    }
    process.exit(1);
  }

  fs.mkdirSync(featureDir, { recursive: true });

  if (!fs.existsSync(specFile)) {
    const template = resolveTemplate('spec-template', repoRoot);
    if (template && fs.existsSync(template)) {
      fs.copyFileSync(template, specFile);
    } else {
      console.error('Warning: Spec template not found; created empty spec file');
      fs.closeSync(fs.openSync(specFile, 'a'));
    }
  }

  persistFeatureJson(repoRoot, featureDir);

  process.stderr.write(`# To persist: export SPECIFY_FEATURE=${branchName}\n`);
  process.stderr.write(`#              export SPECIFY_FEATURE_DIRECTORY=${featureDir}\n`);
}

if (jsonMode) {
  const payload = { BRANCH_NAME: branchName, SPEC_FILE: specFile, FEATURE_NUM: featureNum };
  if (dryRun) payload.DRY_RUN = true;
  console.log(JSON.stringify(payload));
} else {
  console.log(`BRANCH_NAME: ${branchName}`);
  console.log(`SPEC_FILE: ${specFile}`);
  console.log(`FEATURE_NUM: ${featureNum}`);
  if (!dryRun) {
    console.log(`# To persist in your shell: export SPECIFY_FEATURE=${branchName}`);
    console.log(`#                           export SPECIFY_FEATURE_DIRECTORY=${featureDir}`);
  }
}
