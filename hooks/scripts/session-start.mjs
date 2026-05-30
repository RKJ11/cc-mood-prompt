#!/usr/bin/env node
// cc-mood-prompt — session-start.mjs
// Event:   SessionStart (startup, resume, clear, compact)
// Purpose: detect model family and CLAUDE.md presence
//          parse all signal files
//          resolve model-variant and CLAUDE.md-conditional instructions
//          write pre-resolved XML signal map to a temp cache
//          persist cache path via CLAUDE_ENV_FILE
// Output:  silent — nothing written to stdout
//
// Pure Node.js: no external dependencies (no bash, jq, awk or sed).
// Runs identically on Windows, macOS and Linux.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

// ─── HELPERS ──────────────────────────────────────────────────

// Mirror of awk extract_block: return the lines that follow a [block]
// marker, up to the next line that starts with "[" (or end of file).
function extractBlock(lines, block) {
  const target = `[${block}]`;
  let inSection = false;
  const out = [];
  for (const line of lines) {
    if (line.startsWith('[')) {
      if (line === target) { inSection = true; continue; }
      if (inSection) break;
      continue;
    }
    if (inSection) out.push(line);
  }
  return out.join('\n');
}

// Mirror of awk extract_default_body: everything after the 2nd "---"
// that does not start with "[".
function extractDefaultBody(lines) {
  let n = 0;
  const out = [];
  for (const line of lines) {
    if (line === '---') { n++; continue; }
    if (n >= 2 && !line.startsWith('[')) out.push(line);
  }
  return out.join('\n');
}

// Resolve a CLAUDEMD_ADDITION marker: substitute it when CLAUDE.md is
// present, otherwise drop any line that still carries the marker.
function resolveClaudemd(lines, markerFull, addition) {
  if (addition) {
    return lines.map((l) => l.split(markerFull).join(addition));
  }
  return lines.filter((l) => !l.includes('CLAUDEMD_ADDITION:'));
}

// Collapse all whitespace (spaces, tabs, newlines) to single spaces,
// matching the original bash pipeline (tr -s / newline join / squeeze).
function collapse(content) {
  return content
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' '))
    .join(' ')
    .replace(/ +/g, ' ')
    .trim();
}

function firstField(lines, key) {
  const re = new RegExp(`^${key}:\\s*(.*)$`);
  for (const l of lines) {
    const m = l.match(re);
    if (m) return m[1].trim();
  }
  return '';
}

// ─── MAIN ─────────────────────────────────────────────────────

function main() {
  let raw = '';
  try { raw = readFileSync(0, 'utf8'); } catch { raw = ''; }

  let payload = {};
  try { payload = JSON.parse(raw || '{}'); } catch { payload = {}; }

  const sessionId = String(payload.session_id ?? 'unknown');
  const model = String(payload.model ?? 'unknown');
  const cwd = String(payload.cwd ?? '');

  const here = dirname(fileURLToPath(import.meta.url));
  const pluginRoot = join(here, '..', '..');
  const signalsDir = join(pluginRoot, 'signals');
  const cacheFile = join(tmpdir(), `cc-mood-prompt-${sessionId}.json`);

  // ─── DETECT MODEL FAMILY ───────────────────────────────────
  let modelFamily = 'default';
  if (model.includes('haiku')) modelFamily = 'haiku';
  else if (model.includes('opus')) modelFamily = 'opus';
  else if (model.includes('sonnet')) modelFamily = 'sonnet';

  // ─── DETECT CLAUDE.MD PRESENCE ─────────────────────────────
  const claudemdPresent = !!cwd &&
    (existsSync(join(cwd, 'CLAUDE.md')) || existsSync(join(cwd, '.claude', 'CLAUDE.md')));

  // ─── DETECT PROJECT TYPE (for cc-:T test signal) ───────────
  let projectType = 'unknown';
  if (cwd) {
    if (existsSync(join(cwd, 'package.json'))) projectType = 'nodejs';
    else if (existsSync(join(cwd, 'requirements.txt')) || existsSync(join(cwd, 'pyproject.toml'))) projectType = 'python';
    else if (existsSync(join(cwd, 'go.mod'))) projectType = 'go';
    else if (existsSync(join(cwd, 'Cargo.toml'))) projectType = 'rust';
    else if (existsSync(join(cwd, 'pom.xml')) || existsSync(join(cwd, 'build.gradle'))) projectType = 'java';
  }

  const projectTypeLine = {
    nodejs: 'Write tests using Jest or Vitest conventions. Use describe/it blocks. Mock external dependencies with vi.mock or jest.mock.',
    python: 'Write tests using pytest conventions. Use fixtures for setup. Mock with pytest-mock or unittest.mock.',
    go: 'Write tests using Go testing package. Use table-driven tests where appropriate.',
    rust: 'Write tests using Rust built-in test framework. Use #[cfg(test)] module. Mock with mockall where needed.',
    java: 'Write tests using JUnit 5 conventions. Use @BeforeEach for setup. Mock with Mockito.',
  }[projectType] || "Write tests appropriate for this project's testing framework.";

  const teachAddition = claudemdPresent ? "Use examples from this project's own stack where relevant." : '';
  const auditAddition = claudemdPresent ? 'Check against conventions and patterns established in this project.' : '';
  const testAddition = claudemdPresent ? 'Align test structure with existing patterns in this project.' : '';

  // ─── BUILD SIGNAL MAP ──────────────────────────────────────
  const signalMap = {};
  let files = [];
  try { files = readdirSync(signalsDir).filter((f) => f.endsWith('.md')).sort(); } catch { files = []; }

  for (const file of files) {
    if (file === 'README.md') continue;
    const filePath = join(signalsDir, file);

    let text = '';
    try { text = readFileSync(filePath, 'utf8'); } catch { continue; }
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

    const prefix = firstField(lines, 'prefix');
    const enabled = firstField(lines, 'enabled');

    if (enabled === 'false') continue;
    if (!prefix) continue;

    let content = extractBlock(lines, modelFamily);
    if (!content) content = extractBlock(lines, 'default');
    if (!content) content = extractDefaultBody(lines);
    if (!content) continue;

    let contentLines = content.split('\n');

    if (prefix === 'cc-:?') {
      contentLines = resolveClaudemd(
        contentLines,
        "CLAUDEMD_ADDITION: Use examples from this project's own stack where relevant.",
        teachAddition,
      );
    } else if (prefix === 'cc-:o') {
      contentLines = resolveClaudemd(
        contentLines,
        'CLAUDEMD_ADDITION: Check against conventions and patterns established in this project.',
        auditAddition,
      );
    } else if (prefix === 'cc-:T') {
      contentLines = contentLines.map((l) => l.split('PROJECT_TYPE_ADDITION').join(projectTypeLine));
      contentLines = resolveClaudemd(
        contentLines,
        'CLAUDEMD_ADDITION: Align test structure with existing patterns in this project.',
        testAddition,
      );
    }

    signalMap[prefix] = collapse(contentLines.join('\n'));
  }

  // ─── WRITE CACHE ───────────────────────────────────────────
  try {
    writeFileSync(cacheFile, `${JSON.stringify(signalMap, null, 2)}\n`, 'utf8');
  } catch { /* if the temp dir is not writable, degrade silently */ }

  // ─── PERSIST CACHE PATH TO SESSION ENVIRONMENT ─────────────
  const envFile = process.env.CLAUDE_ENV_FILE;
  if (envFile) {
    try {
      let existing = '';
      try { existing = readFileSync(envFile, 'utf8'); } catch { existing = ''; }
      const kept = existing
        .split('\n')
        .filter((l) => l.length > 0 && !l.startsWith('CC_SIGNAL_CACHE='));
      kept.push(`CC_SIGNAL_CACHE=${cacheFile}`);
      writeFileSync(envFile, `${kept.join('\n')}\n`, 'utf8');
    } catch { /* ignore */ }
  }
}

main();
process.exit(0);
