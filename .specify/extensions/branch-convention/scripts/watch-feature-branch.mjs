#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
let jsonMode = false;
let timeoutSeconds = 120;
let worker = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--json") {
    jsonMode = true;
  } else if (arg === "--timeout") {
    timeoutSeconds = Number.parseInt(args[i + 1] ?? "", 10);
    if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1) {
      fail("Error: --timeout requires an integer number of seconds");
    }
    i += 1;
  } else if (arg === "--worker") {
    worker = true;
  } else if (arg === "--help" || arg === "-h") {
    console.log("Usage: node watch-feature-branch.mjs [--json] [--timeout seconds]");
    process.exit(0);
  } else {
    fail(`Error: Unknown argument '${arg}'`);
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const stateDir = path.join(repoRoot, ".specify");
const specsDir = path.join(repoRoot, "specs");
const featureJson = path.join(stateDir, "feature.json");
const logFile = path.join(stateDir, "branch-convention-watch.log");
const createScript = path.join(scriptDir, "create-branch-from-feature.mjs");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readFeatureDir() {
  if (!existsSync(featureJson)) return "";
  try {
    const parsed = JSON.parse(readFileSync(featureJson, "utf8"));
    return typeof parsed.feature_directory === "string" ? parsed.feature_directory : "";
  } catch {
    const match = readFileSync(featureJson, "utf8").match(/"feature_directory"\s*:\s*"([^"]+)"/);
    return match?.[1] ?? "";
  }
}

function newestSpecDirSince(startMs) {
  if (!existsSync(specsDir)) return "";

  let newest = null;
  const visit = (dir, relativeDir) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const relativePath = relativeDir ? `${relativeDir}/${entry}` : entry;

      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (!stat.isDirectory()) continue;
      visit(fullPath, relativePath);

      const specFile = path.join(fullPath, "spec.md");
      if (!existsSync(specFile) || stat.mtimeMs < startMs) continue;
      if (!newest || stat.mtimeMs > newest.mtimeMs) {
        newest = { name: relativePath, mtimeMs: stat.mtimeMs };
      }
    }
  };

  try {
    visit(specsDir, "");
  } catch {
    return "";
  }

  return newest ? `specs/${newest.name}` : "";
}

async function runWorker() {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(logFile, "");
  const startMs = Date.now();
  const deadline = startMs + timeoutSeconds * 1000;

  while (Date.now() <= deadline) {
    const fromFeatureJson = readFeatureDir();
    if (fromFeatureJson && existsSync(path.join(repoRoot, fromFeatureJson))) {
      return createBranch(fromFeatureJson);
    }

    const newest = newestSpecDirSince(startMs);
    if (newest) {
      return createBranch(newest);
    }

    await sleep(1000);
  }

  writeFileSync(logFile, "Error: Timed out waiting for /speckit.specify to create a feature directory\n", { flag: "a" });
  process.exit(1);
}

function createBranch(featureDir) {
  const result = spawnSync(process.execPath, [createScript, "--json", "--feature-dir", featureDir], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  writeFileSync(logFile, result.stdout ?? "", { flag: "a" });
  writeFileSync(logFile, result.stderr ?? "", { flag: "a" });
  process.exit(result.status ?? 1);
}

if (worker) {
  await runWorker();
} else {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(logFile, "");

  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "--worker", "--timeout", String(timeoutSeconds)], {
    cwd: repoRoot,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();

  const result = {
    BRANCH_CONVENTION_WATCH_PID: child.pid,
    TIMEOUT_SECONDS: timeoutSeconds,
    LOG_FILE: ".specify/branch-convention-watch.log",
  };

  if (jsonMode) {
    console.log(JSON.stringify(result));
  } else {
    for (const [key, value] of Object.entries(result)) {
      console.log(`${key}: ${value}`);
    }
  }
}
