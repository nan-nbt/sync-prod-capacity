#!/usr/bin/env node
// Common functions and variables for all Node scripts.
// Faithful port of scripts/bash/common.sh (spec-kit v0.11.8): feature state is
// resolved from explicit sources only (SPECIFY_FEATURE / SPECIFY_FEATURE_DIRECTORY /
// .specify/feature.json), NOT from the current git branch.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const scriptDir = path.dirname(fileURLToPath(import.meta.url));

export function git(args, options = {}) {
  return spawnSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options });
}

// Find repository root by searching upward for a .specify directory.
export function findSpecifyRoot(startDir = process.cwd()) {
  let dir;
  try {
    dir = fs.realpathSync(path.resolve(startDir));
  } catch {
    return null;
  }
  while (true) {
    if (fs.existsSync(path.join(dir, '.specify'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// Resolve an explicit SPECIFY_INIT_DIR project override (the directory that
// contains .specify/). Strict by design: must exist and contain .specify/.
// Throws on invalid input (mirrors the bash resolver returning 1).
export function resolveSpecifyInitDir() {
  const value = process.env.SPECIFY_INIT_DIR;
  let initRoot;
  try {
    initRoot = fs.realpathSync(path.resolve(value));
  } catch {
    throw new Error(`ERROR: SPECIFY_INIT_DIR does not point to an existing directory: ${value}`);
  }
  if (!fs.existsSync(path.join(initRoot, '.specify'))) {
    throw new Error(`ERROR: SPECIFY_INIT_DIR is not a Spec Kit project (no .specify/ directory): ${initRoot}`);
  }
  return initRoot;
}

// Get repository root, prioritizing .specify directory over git.
export function getRepoRoot() {
  if (process.env.SPECIFY_INIT_DIR) {
    return resolveSpecifyInitDir();
  }
  const specifyRoot = findSpecifyRoot();
  if (specifyRoot) return specifyRoot;
  return path.resolve(scriptDir, '../../..');
}

// Get current feature name from explicit state only.
export function getCurrentBranch() {
  if (process.env.SPECIFY_FEATURE) return process.env.SPECIFY_FEATURE;
  return '';
}

// Safely read .specify/feature.json's "feature_directory" value.
// Returns the raw value (possibly relative) or '' when missing/unparseable.
export function readFeatureJsonFeatureDirectory(repoRoot) {
  const fj = path.join(repoRoot, '.specify', 'feature.json');
  if (!fs.existsSync(fj)) return '';
  try {
    const data = JSON.parse(fs.readFileSync(fj, 'utf8'));
    const value = data && typeof data.feature_directory === 'string' ? data.feature_directory : '';
    return value || '';
  } catch {
    return '';
  }
}

// Persist a feature_directory value to .specify/feature.json.
// Writes only when missing or different. Accepts the raw (possibly relative) value.
export function persistFeatureJson(repoRoot, featureDirValue) {
  let value = featureDirValue;
  const prefix = `${repoRoot}${path.sep}`;
  if (value.startsWith(prefix)) {
    value = value.slice(prefix.length);
  }
  // Normalize Windows separators to POSIX for stored JSON consistency.
  value = value.split(path.sep).join('/');

  const current = readFeatureJsonFeatureDirectory(repoRoot);
  if (current === value) return;

  fs.mkdirSync(path.join(repoRoot, '.specify'), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, '.specify', 'feature.json'),
    `${JSON.stringify({ feature_directory: value })}\n`,
    'utf8',
  );
}

// Resolve all feature paths. Priority for the feature directory:
//   1. SPECIFY_FEATURE_DIRECTORY env var
//   2. .specify/feature.json "feature_directory"
//   3. Error (printed to stderr) — caller exits 1.
// Returns an object WITHOUT HAS_GIT (aligned with v0.11.8 contract).
export function getFeaturePaths() {
  const repoRoot = getRepoRoot();
  const currentBranch = getCurrentBranch();

  let featureDir;
  const envDir = process.env.SPECIFY_FEATURE_DIRECTORY;
  if (envDir) {
    featureDir = path.isAbsolute(envDir) ? envDir : path.join(repoRoot, envDir);
    persistFeatureJson(repoRoot, envDir);
  } else if (fs.existsSync(path.join(repoRoot, '.specify', 'feature.json'))) {
    const fd = readFeatureJsonFeatureDirectory(repoRoot);
    if (fd) {
      featureDir = path.isAbsolute(fd) ? fd : path.join(repoRoot, fd);
    } else {
      throw new Error('ERROR: Feature directory not found. Set SPECIFY_FEATURE_DIRECTORY or ensure .specify/feature.json contains feature_directory.');
    }
  } else {
    throw new Error('ERROR: Feature directory not found. Set SPECIFY_FEATURE_DIRECTORY or run the specify command to create .specify/feature.json.');
  }

  return {
    REPO_ROOT: repoRoot,
    CURRENT_BRANCH: currentBranch,
    FEATURE_DIR: featureDir,
    FEATURE_SPEC: path.join(featureDir, 'spec.md'),
    IMPL_PLAN: path.join(featureDir, 'plan.md'),
    TASKS: path.join(featureDir, 'tasks.md'),
    RESEARCH: path.join(featureDir, 'research.md'),
    DATA_MODEL: path.join(featureDir, 'data-model.md'),
    QUICKSTART: path.join(featureDir, 'quickstart.md'),
    CONTRACTS_DIR: path.join(featureDir, 'contracts'),
  };
}

let _invokeSeparatorCache = null;

// Read the invoke separator from .specify/integration.json (default ".").
export function getInvokeSeparator(repoRoot = getRepoRoot()) {
  if (_invokeSeparatorCache && _invokeSeparatorCache.repoRoot === repoRoot) {
    return _invokeSeparatorCache.value;
  }
  let separator = '.';
  const integrationJson = path.join(repoRoot, '.specify', 'integration.json');
  if (fs.existsSync(integrationJson)) {
    try {
      const state = JSON.parse(fs.readFileSync(integrationJson, 'utf8'));
      const key = state.default_integration || state.integration || '';
      const settings = state.integration_settings;
      if (typeof key === 'string' && settings && typeof settings === 'object') {
        const entry = settings[key];
        if (entry && (entry.invoke_separator === '.' || entry.invoke_separator === '-')) {
          separator = entry.invoke_separator;
        }
      }
    } catch {
      separator = '.';
    }
  }
  _invokeSeparatorCache = { repoRoot, value: separator };
  return separator;
}

// Format a speckit command name using the project's invoke separator.
export function formatSpeckitCommand(commandName, repoRoot = getRepoRoot()) {
  const separator = getInvokeSeparator(repoRoot);
  let name = String(commandName);
  if (name.startsWith('/')) name = name.slice(1);
  if (name.startsWith('speckit.')) name = name.slice('speckit.'.length);
  else if (name.startsWith('speckit-')) name = name.slice('speckit-'.length);
  name = name.split('.').join(separator);
  return `/speckit${separator}${name}`;
}

export function checkFile(filePath, description) {
  const ok = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  return `  ${ok ? '✓' : '✗'} ${description}`;
}

export function checkDir(dirPath, description) {
  const ok = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory() && fs.readdirSync(dirPath).length > 0;
  return `  ${ok ? '✓' : '✗'} ${description}`;
}

export function dirHasEntries(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory() && fs.readdirSync(dirPath).length > 0;
}

// Resolve a template name to a file path using the priority stack:
//   1. .specify/templates/overrides/
//   2. .specify/presets/<id>/templates/ (sorted by .registry priority)
//   3. .specify/extensions/<id>/templates/
//   4. .specify/templates/ (core)
// Returns the resolved path or null.
export function resolveTemplate(templateName, repoRoot) {
  const base = path.join(repoRoot, '.specify', 'templates');

  const override = path.join(base, 'overrides', `${templateName}.md`);
  if (fs.existsSync(override)) return override;

  const presetsDir = path.join(repoRoot, '.specify', 'presets');
  if (fs.existsSync(presetsDir)) {
    let presetIds = [];
    const registryFile = path.join(presetsDir, '.registry');
    if (fs.existsSync(registryFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
        const presets = data.presets || {};
        presetIds = Object.entries(presets)
          .filter(([, meta]) => !meta || typeof meta !== 'object' || meta.enabled !== false)
          .sort((a, b) => {
            const pa = (a[1] && typeof a[1] === 'object' && typeof a[1].priority === 'number') ? a[1].priority : 10;
            const pb = (b[1] && typeof b[1] === 'object' && typeof b[1].priority === 'number') ? b[1].priority : 10;
            return pa - pb;
          })
          .map(([id]) => id);
      } catch {
        presetIds = [];
      }
    }
    if (presetIds.length === 0) {
      // Fallback: unordered directory scan
      try {
        presetIds = fs.readdirSync(presetsDir, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name);
      } catch {
        presetIds = [];
      }
    }
    for (const id of presetIds) {
      const candidate = path.join(presetsDir, id, 'templates', `${templateName}.md`);
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  const extDir = path.join(repoRoot, '.specify', 'extensions');
  if (fs.existsSync(extDir)) {
    try {
      for (const entry of fs.readdirSync(extDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        const candidate = path.join(extDir, entry.name, 'templates', `${templateName}.md`);
        if (fs.existsSync(candidate)) return candidate;
      }
    } catch {
      // ignore
    }
  }

  const core = path.join(base, `${templateName}.md`);
  if (fs.existsSync(core)) return core;

  return null;
}
