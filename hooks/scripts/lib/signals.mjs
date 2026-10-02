// cc-mood-prompt — lib/signals.mjs
// Shared logic for all three hooks: session state, signal-file parsing,
// prompt scanning and on-demand resolution.
//
// Pure Node.js: built-in modules only. Runs on Windows, macOS and Linux.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir, homedir } from 'node:os';

export const SIGNALS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'signals');

const MODEL_FAMILIES = ['haiku', 'sonnet', 'opus'];
const BLOCK_NAMES = new Set(['default', ...MODEL_FAMILIES]);
const SESSION_PREFIX = 'cc-mood-prompt-session-';

const TEST_GUIDANCE = {
  nodejs: 'Write tests using Jest or Vitest conventions. Use describe/it blocks. Mock external dependencies with vi.mock or jest.mock.',
  python: 'Write tests using pytest conventions. Use fixtures for setup. Mock with pytest-mock or unittest.mock.',
  go: 'Write tests using Go testing package. Use table-driven tests where appropriate.',
  rust: 'Write tests using Rust built-in test framework. Use #[cfg(test)] module. Mock with mockall where needed.',
  java: 'Write tests using JUnit 5 conventions. Use @BeforeEach for setup. Mock with Mockito.',
};
const GENERIC_TEST_GUIDANCE = "Write tests appropriate for this project's testing framework.";

// Manifest files per project type. Checked in this order within one
// directory; the nearest directory with any manifest wins.
const MANIFESTS = [
  ['nodejs', ['package.json']],
  ['python', ['pyproject.toml', 'requirements.txt', 'setup.py', 'setup.cfg', 'Pipfile']],
  ['go', ['go.mod']],
  ['rust', ['Cargo.toml']],
  ['java', ['pom.xml', 'build.gradle', 'build.gradle.kts']],
];

// ─── HOOK I/O ─────────────────────────────────────────────────

// Read the hook payload from stdin. Anything that is not a JSON object
// (empty, malformed, null, array) becomes {} so callers never crash.
export function readPayload() {
  try {
    const p = JSON.parse(readFileSync(0, 'utf8') || '{}');
    return p && typeof p === 'object' && !Array.isArray(p) ? p : {};
  } catch {
    return {};
  }
}

// ─── SESSION STATE ────────────────────────────────────────────

// Path of the per-session state file (it holds only the model id, which
// Claude Code sends to SessionStart but not to UserPromptSubmit).
// Returns null for a missing or unsafe session_id so a crafted id can
// never point outside the temp dir or collide with another session.
export function sessionFile(sessionId) {
  if (typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(sessionId)) return null;
  return join(tmpdir(), `${SESSION_PREFIX}${sessionId}.json`);
}

// True for every temp file this plugin has ever written, including the
// v1.0 signal caches (cc-mood-prompt-<id>.json), so stale ones can be swept.
export function isPluginTempFile(name) {
  return name.startsWith('cc-mood-prompt-') && name.endsWith('.json');
}

// Read the model saved at SessionStart. Missing or unreadable state just
// means "no model known", which resolves to the [default] block.
export function readSessionModel(sessionId) {
  const file = sessionFile(sessionId);
  if (!file) return '';
  try { return String(JSON.parse(readFileSync(file, 'utf8')).model ?? ''); } catch { return ''; }
}

// Normalise the payload's model (a string today, possibly an object
// with id/display_name) to a plain string, or '' when absent.
export function modelId(model) {
  if (typeof model === 'string') return model;
  if (model && typeof model === 'object') return [model.id, model.display_name].filter((v) => typeof v === 'string').join(' ');
  return '';
}

// Map a model id to the signal block it should use. Case-insensitive,
// so ids, Bedrock ids and display names all resolve.
export function modelFamily(model) {
  const s = modelId(model).toLowerCase();
  return MODEL_FAMILIES.find((f) => s.includes(f)) || 'default';
}

// ─── SIGNAL FILES ─────────────────────────────────────────────

function unquote(v) {
  const s = String(v ?? '').trim();
  return s.replace(/^(['"])(.*)\1$/, '$2').trim();
}

// Split a frontmatter list: "a, b" or "[a, b]", items optionally quoted.
function splitList(v) {
  const s = String(v ?? '').trim().replace(/^\[(.*)\]$/, '$1');
  return s ? s.split(',').map(unquote).filter(Boolean) : [];
}

// Parse one signal file into { name, enabled, names, blocks, body }.
// Frontmatter is read only from the leading --- fence. Block markers are
// recognised only for known names ([default]/[haiku]/[sonnet]/[opus]),
// so content lines that happen to start with "[" stay content.
// Returns null when the file has no usable frontmatter or no cc- name.
export function parseSignal(text) {
  const lines = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  if (lines[0].trim() !== '---') return null;
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end === -1) return null;

  const meta = {};
  for (const l of lines.slice(1, end)) {
    const m = l.match(/^([A-Za-z_]+)\s*:\s*(.*)$/);
    if (m) meta[m[1].toLowerCase()] = m[2];
  }

  // Names are case-insensitive; anything not starting with cc- could
  // never be typed as a signal, so it is dropped.
  const names = [unquote(meta.prefix), ...splitList(meta.aliases)]
    .map((n) => n.toLowerCase())
    .filter((n) => n.startsWith('cc-') && n.length > 3 && !/\s/.test(n));
  if (names.length === 0) return null;

  const blocks = {};
  const body = [];
  let current = null;
  for (const l of lines.slice(end + 1)) {
    const b = l.trim().match(/^\[([A-Za-z]+)\]$/);
    if (b && BLOCK_NAMES.has(b[1].toLowerCase())) {
      current = b[1].toLowerCase();
      blocks[current] = blocks[current] || [];
      continue;
    }
    (current ? blocks[current] : body).push(l);
  }

  return {
    name: unquote(meta.name),
    enabled: !/^(false|no|off|0)$/i.test(unquote(meta.enabled)),
    names: [...new Set(names)],
    blocks: Object.fromEntries(Object.entries(blocks).map(([k, v]) => [k, v.join('\n')])),
    body: body.join('\n'),
  };
}

// Load every enabled signal and index it by each of its names.
// Files are read in sorted order and the first file to claim a name keeps
// it, so a duplicate name never silently overrides an earlier signal.
export function loadSignalIndex(dir = SIGNALS_DIR) {
  const index = new Map();
  let files = [];
  try { files = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md').sort(); } catch { return index; }
  for (const file of files) {
    let sig;
    try { sig = parseSignal(readFileSync(join(dir, file), 'utf8')); } catch { continue; }
    if (!sig || !sig.enabled) continue;
    sig.file = file;
    for (const n of sig.names) if (!index.has(n)) index.set(n, sig);
  }
  return index;
}

// ─── PROMPT SCANNING ──────────────────────────────────────────

// Blank out fenced code blocks and inline code spans, so a signal that is
// quoted or pasted (e.g. "what does `cc-:x` do?") never triggers.
function stripCode(s) {
  return s
    .replace(/```[\s\S]*?(?:```|$)/g, ' ')
    .replace(/~~~[\s\S]*?(?:~~~|$)/g, ' ')
    .replace(/`[^`\n]*`/g, ' ');
}

// Find the signal the prompt asks for: the LAST standalone cc- token that
// names a known signal. A token must start the prompt or follow whitespace,
// so paths like signals/cc-test.md never match; trailing sentence
// punctuation is tolerated ("ship it cc-yolo!"). Unknown cc- tokens are
// skipped rather than cancelling an earlier valid signal.
export function findSignal(prompt, index) {
  if (typeof prompt !== 'string' || !/cc-/i.test(prompt)) return null;
  let found = null;
  for (const m of stripCode(prompt).matchAll(/(?<=^|\s)cc-\S+/gi)) {
    let tok = m[0].toLowerCase();
    while (tok) {
      if (index.has(tok)) { found = index.get(tok); break; }
      if (!/[.,!?;:]$/.test(tok)) break;
      tok = tok.slice(0, -1);
    }
  }
  return found;
}

// ─── RESOLUTION ───────────────────────────────────────────────

// Walk up from cwd and return the first directory where test(dir) holds.
// Stops at the repo root (a dir containing .git) and never inspects the
// home directory itself, so ~/.claude/CLAUDE.md (user-level memory) is not
// mistaken for project instructions.
function findUp(cwd, test) {
  if (!cwd) return null;
  const home = resolve(homedir());
  let dir = resolve(cwd);
  for (;;) {
    if (dir === home) return null;
    if (test(dir)) return dir;
    if (existsSync(join(dir, '.git'))) return null;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function hasProjectInstructions(cwd) {
  return !!findUp(cwd, (d) => ['CLAUDE.md', 'CLAUDE.local.md', join('.claude', 'CLAUDE.md')].some((f) => existsSync(join(d, f))));
}

function projectType(cwd) {
  let type = 'unknown';
  findUp(cwd, (d) => {
    const hit = MANIFESTS.find(([, files]) => files.some((f) => existsSync(join(d, f))));
    if (hit) type = hit[0];
    return !!hit;
  });
  return type;
}

// Collapse all whitespace to single spaces, so the injected context is
// one compact line regardless of how the signal file is formatted.
function collapse(s) {
  return s.replace(/\s+/g, ' ').trim();
}

// Turn a parsed signal into the final additionalContext text: pick the
// model block (falling back to [default], then to text before any block),
// then fill the CLAUDEMD_ADDITION / PROJECT_TYPE_ADDITION placeholders.
// The filesystem is only touched when a placeholder is actually present.
export function resolveSignal(sig, { family = 'default', cwd = '' } = {}) {
  const pick = [sig.blocks[family], sig.blocks.default, sig.body].find((c) => c && c.trim());
  if (!pick) return '';
  let content = pick;

  if (content.includes('CLAUDEMD_ADDITION:')) {
    const keep = hasProjectInstructions(cwd);
    content = content
      .split('\n')
      .flatMap((l) => (l.includes('CLAUDEMD_ADDITION:') ? (keep ? [l.replace(/CLAUDEMD_ADDITION:\s*/g, '')] : []) : [l]))
      .join('\n');
  }
  if (content.includes('PROJECT_TYPE_ADDITION')) {
    content = content.split('PROJECT_TYPE_ADDITION').join(TEST_GUIDANCE[projectType(cwd)] || GENERIC_TEST_GUIDANCE);
  }
  return collapse(content);
}
