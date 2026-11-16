#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
let jsonMode = false;
let createBranch = false;
let allowExisting = false;
let featureType = "";
let ticket = "";
let shortName = "";
const descriptionParts = [];

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--json") {
    jsonMode = true;
  } else if (arg === "--create-branch") {
    createBranch = true;
  } else if (arg === "--allow-existing-branch") {
    allowExisting = true;
  } else if (arg === "--type") {
    featureType = args[i + 1] ?? "";
    if (!featureType || featureType.startsWith("--")) fail("Error: --type requires a value");
    i += 1;
  } else if (arg === "--ticket") {
    ticket = args[i + 1] ?? "";
    if (!ticket || ticket.startsWith("--")) fail("Error: --ticket requires a value");
    i += 1;
  } else if (arg === "--short-name") {
    shortName = args[i + 1] ?? "";
    if (!shortName || shortName.startsWith("--")) fail("Error: --short-name requires a value");
    i += 1;
  } else if (arg === "--help" || arg === "-h") {
    console.log("Usage: node suggest-feature-name.mjs [--json] [--create-branch] [--allow-existing-branch] [--type feature|bugfix|hotfix|refactor|docs] [--ticket ID] [--short-name name] <feature description>");
    process.exit(0);
  } else {
    descriptionParts.push(arg);
  }
}

const featureDescription = descriptionParts.join(" ").trim();
if (!featureDescription) fail("Error: Feature description cannot be empty");

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const configFile = path.join(repoRoot, ".specify", "branch-convention.yml");
const specsDir = path.join(repoRoot, "specs");

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

    if (line.match(new RegExp(`^\\s+${escapeRegExp(parent)}:\\s*$`))) {
      nested = parent;
      continue;
    }
    if (nested === parent) {
      const match = line.match(new RegExp(`^\\s+${escapeRegExp(key)}:\\s*(.*)$`));
      if (match) return cleanYamlValue(match[1]);
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

function cleanName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function generateShortName(description) {
  const stopWords = new Set([
    "i", "a", "an", "the", "to", "for", "of", "in", "on", "at", "by", "with", "from",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do",
    "does", "did", "will", "would", "should", "could", "can", "may", "might", "must",
    "shall", "this", "that", "these", "those", "my", "your", "our", "their", "want",
    "need", "add", "get", "set", "build", "create", "make", "implement", "application",
    "app", "help", "me", "separate", "and", "or", "but", "within", "each", "main",
    "page", "never", "other",
  ]);
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !stopWords.has(word));

  if (words.length === 0) {
    return cleanName(description).split("-").filter(Boolean).slice(0, 3).join("-");
  }
  return words.slice(0, 4).join("-");
}

function formatDate(format) {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const yy = yyyy.slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return format.replaceAll("YYYY", yyyy).replaceAll("YY", yy).replaceAll("MM", mm).replaceAll("DD", dd);
}

function highestSeqFromName(name) {
  return Number.parseInt(name.match(/^(?:.*\/)?([0-9]+)-/)?.[1] ?? "0", 10);
}

function nextSequence() {
  let highest = 0;
  const branchList = git(["branch", "-a"]);
  if (branchList.status === 0) {
    for (const line of branchList.stdout.split(/\r?\n/)) {
      highest = Math.max(highest, highestSeqFromName(line.replace(/^[* ]+/, "").replace(/^remotes\/[^/]+\//, "")));
    }
  }
  if (existsSync(specsDir)) {
    for (const entry of readdirSync(specsDir)) {
      const fullPath = path.join(specsDir, entry);
      try {
        if (statSync(fullPath).isDirectory()) highest = Math.max(highest, highestSeqFromName(entry));
      } catch {
        // Ignore transient filesystem entries.
      }
    }
  }
  return highest + 1;
}

function renderPattern(pattern, values) {
  return pattern
    .replaceAll("{seq}", values.seq)
    .replaceAll("{kebab}", values.kebab)
    .replaceAll("{summary}", featureDescription)
    .replaceAll("{ticket}", values.ticket)
    .replaceAll("{date}", values.date)
    .replaceAll("{type}", values.type);
}

function truncateKebab(maxLength, value) {
  if (maxLength <= 0 || value.length <= maxLength) return value;
  const raw = value.slice(0, maxLength).replace(/-[^-]*$/, "").replace(/-+$/, "");
  return raw || value.slice(0, maxLength).replace(/-+$/, "");
}

const branchPattern = yamlScalar("convention", "branch_pattern", "{seq}-{kebab}");
const folderPattern = yamlScalar("convention", "folder_pattern", "{seq}-{kebab}");
const defaultType = yamlScalar("convention", "default_type", "feature");
const seqPadding = Number.parseInt(yamlScalar("convention", "seq_padding", "3"), 10);
const seqStart = Number.parseInt(yamlScalar("convention", "seq_start", "1"), 10);
const dateFormat = yamlScalar("convention", "date_format", "YYYYMMDD");
const maxLength = Number.parseInt(yamlScalar("convention", "max_length", "244"), 10);
const lowercase = yamlScalar("convention", "lowercase", "true") === "true";

featureType ||= defaultType;
const typePrefix = yamlNestedScalar("convention", "type_prefix", featureType, featureType);
let kebab = cleanName(shortName || generateShortName(featureDescription));
if (!kebab) fail(`Error: Could not derive a branch-safe name from '${featureDescription}'`);
if (branchPattern.includes("{ticket}") && !ticket) fail("Error: branch_pattern requires {ticket}; pass --ticket <ID>");

const seqNumber = Math.max(nextSequence(), seqStart);
const seq = String(seqNumber).padStart(seqPadding, "0");
const date = formatDate(dateFormat);
const renderValues = () => ({ seq, kebab, ticket, date, type: typePrefix });

let branchName = renderPattern(branchPattern, renderValues());
let folderName = renderPattern(folderPattern, renderValues());
if (lowercase) {
  branchName = branchName.toLowerCase();
  folderName = folderName.toLowerCase();
}

if (branchName.length > maxLength) {
  const placeholder = "__KEBAB__";
  const originalKebab = kebab;
  kebab = placeholder;
  let templateBranch = renderPattern(branchPattern, renderValues());
  if (lowercase) templateBranch = templateBranch.toLowerCase();
  const fixedLength = templateBranch.length - placeholder.length;
  kebab = truncateKebab(maxLength - fixedLength, originalKebab);
  if (!kebab) fail(`Error: Branch name '${branchName}' exceeds max_length=${maxLength} and cannot be truncated safely`);

  branchName = renderPattern(branchPattern, renderValues());
  folderName = renderPattern(folderPattern, renderValues());
  if (lowercase) {
    branchName = branchName.toLowerCase();
    folderName = folderName.toLowerCase();
  }
  if (branchName.length > maxLength) fail(`Error: Branch name '${branchName}' exceeds max_length=${maxLength} after truncation`);
}

let branchCreated = false;
if (createBranch) {
  const insideWorkTree = git(["rev-parse", "--is-inside-work-tree"]);
  if (insideWorkTree.status === 0) {
    const currentBranch = git(["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim();
    const branchExists = git(["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`]).status === 0;
    if (branchExists) {
      if (allowExisting && currentBranch !== branchName) {
        const checkout = git(["checkout", "-q", branchName]);
        if (checkout.status !== 0) fail((checkout.stderr || checkout.stdout || "").trim());
      } else if (!allowExisting && currentBranch !== branchName) {
        fail(`Error: Branch '${branchName}' already exists`);
      }
    } else if (currentBranch !== branchName) {
      const checkout = git(["checkout", "-q", "-b", branchName]);
      if (checkout.status !== 0) fail((checkout.stderr || checkout.stdout || "").trim());
      branchCreated = true;
    }
  } else {
    console.error(`[branch-convention] Warning: Git repository not detected; skipped branch creation for ${branchName}`);
  }
}

const result = {
  GIT_BRANCH_NAME: branchName,
  SPECIFY_FEATURE_DIRECTORY: `specs/${folderName}`,
  FEATURE_NUM: seq,
  FOLDER_NAME: folderName,
  BRANCH_PATTERN: branchPattern,
  FOLDER_PATTERN: folderPattern,
  BRANCH_CREATED: branchCreated,
};

if (jsonMode) {
  console.log(JSON.stringify(result));
} else {
  for (const [key, value] of Object.entries(result)) {
    console.log(`${key}=${value}`);
  }
}
