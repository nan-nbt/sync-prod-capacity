#!/usr/bin/env node
// update-agent-context.mjs
//
// Faithful port of extensions/agent-context/scripts/bash/update-agent-context.sh
// (spec-kit v0.11.8 fork layout). Refreshes the managed Spec Kit section in the
// coding agent's context file(s) (e.g. CLAUDE.md, .github/copilot-instructions.md,
// AGENTS.md).
//
// Reads `context_files` or `context_file`, plus `context_markers.{start,end}`, from
// the agent-context extension config:
//   .specify/extensions/agent-context/agent-context-config.yml
//
// Usage: update-agent-context.mjs [plan_path]
//
// When `plan_path` is omitted, the script picks the most recently modified
// `specs/*/plan.md` if any exist, otherwise emits the section without a
// concrete plan path.
//
// The extension config is a small, fixed-shape YAML document (a flat map plus
// one nested `context_markers` map and one string-list), so this uses a
// targeted line parser instead of pulling in a full YAML dependency.
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_START = '<!-- SPECKIT START -->';
const DEFAULT_END = '<!-- SPECKIT END -->';

const projectRoot = process.cwd();
const extConfigPath = path.join(projectRoot, '.specify', 'extensions', 'agent-context', 'agent-context-config.yml');

if (!fs.existsSync(extConfigPath)) {
  console.error(`agent-context: ${extConfigPath} not found; nothing to do.`);
  process.exit(0);
}

function unquote(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseAgentContextConfig(raw) {
  const lines = raw.split('\n');
  let contextFile = '';
  const contextFiles = [];
  let markerStart = '';
  let markerEnd = '';
  let inContextFiles = false;
  let inMarkers = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '');
    if (!line.trim()) continue;

    const topLevelMatch = /^([A-Za-z_][\w]*):\s*(.*)$/.exec(line);
    if (topLevelMatch) {
      const [, key, rest] = topLevelMatch;
      inContextFiles = false;
      inMarkers = false;
      if (key === 'context_file') {
        contextFile = unquote(rest);
      } else if (key === 'context_files') {
        if (rest.trim().startsWith('[')) {
          const inline = rest.trim().replace(/^\[/, '').replace(/\]$/, '');
          for (const item of inline.split(',')) {
            const value = unquote(item);
            if (value) contextFiles.push(value);
          }
        } else {
          inContextFiles = true;
        }
      } else if (key === 'context_markers') {
        inMarkers = true;
      }
      continue;
    }

    const listItemMatch = /^\s*-\s*(.+)$/.exec(rawLine);
    if (inContextFiles && listItemMatch) {
      const value = unquote(listItemMatch[1]);
      if (value) contextFiles.push(value);
      continue;
    }

    const nestedMatch = /^\s+(start|end):\s*(.*)$/.exec(rawLine);
    if (inMarkers && nestedMatch) {
      const value = unquote(nestedMatch[2]);
      if (nestedMatch[1] === 'start') markerStart = value;
      else markerEnd = value;
      continue;
    }
  }

  return { contextFile, contextFiles, markerStart, markerEnd };
}

let parsed;
try {
  parsed = parseAgentContextConfig(fs.readFileSync(extConfigPath, 'utf8'));
} catch (err) {
  console.error(`agent-context: unable to parse ${extConfigPath} (${err.message}); cannot update context.`);
  process.exit(2);
}

const caseInsensitive = process.platform === 'win32' || process.platform === 'cygwin';
const seen = new Set();
const contextFiles = [];
const rawFiles = parsed.contextFiles.length > 0 ? parsed.contextFiles : (parsed.contextFile ? [parsed.contextFile] : []);
for (const value of rawFiles) {
  const candidate = value.trim();
  if (!candidate) continue;
  const key = caseInsensitive ? candidate.toLowerCase() : candidate;
  if (seen.has(key)) continue;
  contextFiles.push(candidate);
  seen.add(key);
}

if (contextFiles.length === 0) {
  console.error('agent-context: context_files/context_file not set in extension config; nothing to do.');
  process.exit(0);
}

for (const contextFile of contextFiles) {
  if (path.isAbsolute(contextFile) || /^[A-Za-z]:/.test(contextFile)) {
    console.error(`agent-context: context files must be project-relative paths; got '${contextFile}'.`);
    process.exit(1);
  }
  if (contextFile.includes('\\')) {
    console.error(`agent-context: context files must not contain backslash separators; got '${contextFile}'.`);
    process.exit(1);
  }
  if (contextFile.split('/').includes('..')) {
    console.error(`agent-context: context files must not contain '..' path segments; got '${contextFile}'.`);
    process.exit(1);
  }
  const resolvedRoot = path.resolve(projectRoot);
  const resolvedTarget = path.resolve(resolvedRoot, contextFile);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    console.error(`agent-context: context file path resolves outside the project root; got '${contextFile}'.`);
    process.exit(1);
  }
}

const markerStart = parsed.markerStart || DEFAULT_START;
const markerEnd = parsed.markerEnd || DEFAULT_END;

let planPath = process.argv[2] || '';
if (!planPath) {
  const specsDir = path.join(projectRoot, 'specs');
  if (fs.existsSync(specsDir)) {
    const plans = fs.readdirSync(specsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(specsDir, entry.name, 'plan.md'))
      .filter((p) => fs.existsSync(p))
      .map((p) => ({ path: p, mtime: fs.statSync(p).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    if (plans.length > 0) {
      planPath = path.relative(projectRoot, plans[0].path);
    }
  }
}

const sectionLines = [
  markerStart,
  'For additional context about technologies to be used, project structure,',
  'shell commands, and other important information, read the current plan',
];
if (planPath) sectionLines.push(`at ${planPath}`);
sectionLines.push(markerEnd);
const section = `${sectionLines.join('\n')}\n`;

function applySection(ctxPath, sectionText) {
  let content = '';
  if (fs.existsSync(ctxPath)) {
    content = fs.readFileSync(ctxPath, 'utf8').replace(/^﻿/, '');
  }

  const s = content.indexOf(markerStart);
  const e = content.indexOf(markerEnd, s !== -1 ? s : 0);
  let newContent;
  if (s !== -1 && e !== -1 && e > s) {
    let endOfMarker = e + markerEnd.length;
    if (content[endOfMarker] === '\r') endOfMarker += 1;
    if (content[endOfMarker] === '\n') endOfMarker += 1;
    newContent = content.slice(0, s) + sectionText + content.slice(endOfMarker);
  } else if (s !== -1) {
    newContent = content.slice(0, s) + sectionText;
  } else if (e !== -1) {
    let endOfMarker = e + markerEnd.length;
    if (content[endOfMarker] === '\r') endOfMarker += 1;
    if (content[endOfMarker] === '\n') endOfMarker += 1;
    newContent = sectionText + content.slice(endOfMarker);
  } else if (content) {
    const withTrailingNewline = content.endsWith('\n') ? content : `${content}\n`;
    newContent = `${withTrailingNewline}\n${sectionText}`;
  } else {
    newContent = sectionText;
  }

  newContent = newContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  fs.writeFileSync(ctxPath, newContent, 'utf8');
}

for (const contextFile of contextFiles) {
  const ctxPath = path.join(projectRoot, contextFile);
  fs.mkdirSync(path.dirname(ctxPath), { recursive: true });
  applySection(ctxPath, section);
  console.error(`agent-context: updated ${contextFile}`);
}
