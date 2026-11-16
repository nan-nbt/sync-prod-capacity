#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
let jsonMode = false;
let allowExisting = true;
let featureDirOverride = "";

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--json") {
    jsonMode = true;
  } else if (arg === "--feature-dir") {
    featureDirOverride = args[i + 1] ?? "";
    if (!featureDirOverride || featureDirOverride.startsWith("--")) {
      fail("Error: --feature-dir requires a value");
    }
    i += 1;
  } else if (arg === "--no-allow-existing") {
    allowExisting = false;
  } else if (arg === "--help" || arg === "-h") {
    console.log("Usage: node create-branch-from-feature.mjs [--json] [--feature-dir specs/NNN-name] [--no-allow-existing]");
    process.exit(0);
  } else {
    fail(`Error: Unknown argument '${arg}'`);
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const configFile = path.join(repoRoot, ".specify", "branch-convention.yml");
const featureJson = path.join(repoRoot, ".specify", "feature.json");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function git(args, options = {}) {
  return spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
    ...options,
  });
}

function yamlScalar(section, key, fallback) {
  if (!existsSync(configFile)) return fallback;

  let current = "";
  for (const rawLine of readFileSync(configFile, "utf8").split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, "");
    const top = line.match(/^([^#\s][^:]*):\s*$/);
    if (top) {
      current = top[1].trim();
      continue;
    }

    if (current === section) {
      const match = line.match(new RegExp(`^\\s+${escapeRegExp(key)}:\\s*(.*)$`));
      if (match) return cleanYamlValue(match[1]);
    }
  }

  return fallback;
}

function yamlNestedScalar(section, parent, key, fallback) {
  if (!existsSync(configFile)) return fallback;

  let current = "";
  let nested = "";
  for (const rawLine of readFileSync(configFile, "utf8").split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, "");
    const top = line.match(/^([^#\s][^:]*):\s*$/);
    if (top) {
      current = top[1].trim();
      nested = "";
      continue;
    }

    if (current !== section) continue;

    const parentMatch = line.match(new RegExp(`^\\s+${escapeRegExp(parent)}:\\s*$`));
    if (parentMatch) {
      nested = parent;
      continue;
    }

    if (nested === parent) {
      const valueMatch = line.match(new RegExp(`^\\s+${escapeRegExp(key)}:\\s*(.*)$`));
      if (valueMatch) return cleanYamlValue(valueMatch[1]);

      if (/^ {2}\S[^:]*:\s*/.test(line)) nested = "";
    }
  }

  return fallback;
}

function cleanYamlValue(value) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readFeatureDir() {
  if (featureDirOverride) return featureDirOverride;
  if (!existsSync(featureJson)) return "";

  try {
    const parsed = JSON.parse(readFileSync(featureJson, "utf8"));
    return typeof parsed.feature_directory === "string" ? parsed.feature_directory : "";
  } catch {
    const match = readFileSync(featureJson, "utf8").match(/"feature_directory"\s*:\s*"([^"]+)"/);
    return match?.[1] ?? "";
  }
}

function formatDate(format) {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const yy = yyyy.slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return format.replaceAll("YYYY", yyyy).replaceAll("YY", yy).replaceAll("MM", mm).replaceAll("DD", dd);
}

function renderPattern(pattern, values) {
  return pattern
    .replaceAll("{seq}", values.seq)
    .replaceAll("{kebab}", values.kebab)
    .replaceAll("{summary}", values.kebab)
    .replaceAll("{ticket}", values.ticket)
    .replaceAll("{date}", values.date)
    .replaceAll("{type}", values.type);
}

const branchPattern = yamlScalar("convention", "branch_pattern", "{seq}-{kebab}");
const defaultType = yamlScalar("convention", "default_type", "feature");
const dateFormat = yamlScalar("convention", "date_format", "YYYYMMDD");
const lowercase = yamlScalar("convention", "lowercase", "true") === "true";
const maxLength = Number.parseInt(yamlScalar("convention", "max_length", "244"), 10);
const typePrefix = yamlNestedScalar("convention", "type_prefix", defaultType, defaultType);
const seqPadding = Number.parseInt(yamlScalar("convention", "seq_padding", "3"), 10);
const seqStart = Number.parseInt(yamlScalar("convention", "seq_start", "1"), 10);

function collectSequenceNumbers(dir, numbers = []) {
  if (!existsSync(dir)) return numbers;

  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return numbers;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(/^([0-9]{1,})-/);
    if (match) numbers.push(Number.parseInt(match[1], 10));
    collectSequenceNumbers(path.join(dir, entry.name), numbers);
  }

  return numbers;
}

function nextSequence() {
  const specsDir = path.join(repoRoot, "specs");
  const highestSpec = Math.max(0, ...collectSequenceNumbers(specsDir));
  let highestBranch = 0;
  const branches = git(["branch", "-a"]);
  if (branches.status === 0) {
    for (const line of branches.stdout.split(/\r?\n/)) {
      const name = line.trim().replace(/^\*\s*/, "").replace(/^remotes\/[^/]+\//, "");
      const match = name.match(/(?:^|\/)([0-9]{1,})-[a-z0-9][a-z0-9-]*$/);
      if (match) highestBranch = Math.max(highestBranch, Number.parseInt(match[1], 10));
    }
  }

  return String(Math.max(highestSpec, highestBranch, seqStart - 1) + 1).padStart(seqPadding, "0");
}

function deriveFeatureParts(featureDir) {
  const normalized = featureDir.replace(/\\/g, "/").replace(/\/+$/, "");
  const folderName = path.basename(normalized);
  const parentName = path.basename(path.dirname(normalized));
  const folderMatch = folderName.match(/^([0-9]{1,})-(.+)$/);

  if (folderMatch) {
    return { seq: folderMatch[1], kebab: folderMatch[2], type: typePrefix };
  }

  if (branchPattern.includes("{seq}")) {
    return { seq: nextSequence(), kebab: folderName, type: parentName === "specs" ? typePrefix : parentName };
  }

  return { seq: "", kebab: folderName, type: parentName === "specs" ? typePrefix : parentName };
}

const featureDir = readFeatureDir();
if (!featureDir) fail("Error: .specify/feature.json does not contain feature_directory");

const { seq, kebab, type } = deriveFeatureParts(featureDir);

if (branchPattern.includes("{ticket}")) {
  fail("Error: branch_pattern requires {ticket}; cannot derive ticket from feature.json");
}

let branchName = renderPattern(branchPattern, {
  seq,
  kebab,
  ticket: "",
  date: formatDate(dateFormat),
  type,
});

if (lowercase) branchName = branchName.toLowerCase();
if (branchName.length > maxLength) {
  fail(`Error: Branch name '${branchName}' exceeds max_length=${maxLength}`);
}

let branchCreated = false;
let branchSwitched = false;
const insideWorkTree = git(["rev-parse", "--is-inside-work-tree"]);

if (insideWorkTree.status === 0) {
  const currentBranch = git(["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim();
  const branchExists = git(["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`]).status === 0;

  if (branchExists) {
    if (currentBranch !== branchName) {
      if (!allowExisting) fail(`Error: Branch '${branchName}' already exists`);
      const checkout = git(["checkout", "-q", branchName], { stdio: "pipe" });
      if (checkout.status !== 0) fail((checkout.stderr || checkout.stdout || "").trim());
      branchSwitched = true;
    }
  } else if (currentBranch !== branchName) {
    const checkout = git(["checkout", "-q", "-b", branchName], { stdio: "pipe" });
    if (checkout.status !== 0) {
      const branchCreatedByAnotherHook = git(["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`]).status === 0;
      if (!allowExisting || !branchCreatedByAnotherHook) {
        fail((checkout.stderr || checkout.stdout || "").trim());
      }

      const retryCheckout = git(["checkout", "-q", branchName], { stdio: "pipe" });
      if (retryCheckout.status !== 0) fail((retryCheckout.stderr || retryCheckout.stdout || "").trim());
      branchSwitched = true;
    } else {
      branchCreated = true;
    }
  }
} else {
  console.error(`[branch-convention] Warning: Git repository not detected; skipped branch creation for ${branchName}`);
}

const result = {
  BRANCH_NAME: branchName,
  FEATURE_DIR: featureDir,
  FEATURE_NUM: seq,
  BRANCH_CREATED: branchCreated,
  BRANCH_SWITCHED: branchSwitched,
};

if (jsonMode) {
  console.log(JSON.stringify(result));
} else {
  for (const [key, value] of Object.entries(result)) {
    console.log(`${key}: ${value}`);
  }
}
