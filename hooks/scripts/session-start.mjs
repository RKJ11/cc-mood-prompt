#!/usr/bin/env node
// cc-mood-prompt — session-start.mjs
// Event:   SessionStart (startup, resume, clear, compact)
// Purpose: remember this session's model for detect-signal.mjs
//          (Claude Code sends `model` only to SessionStart), and sweep
//          temp files left behind by sessions that never reached SessionEnd
// Output:  silent — nothing written to stdout
//
// Signals are NOT resolved here: detect-signal.mjs resolves the one signal
// a prompt asks for, on demand, so signal edits apply on the next prompt.
//
// Pure Node.js: no external dependencies. Runs on Windows, macOS, Linux.

import { writeFileSync, readdirSync, statSync, rmSync, utimesSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

// Delete plugin temp files untouched for a week. SessionEnd does not run
// when a terminal is killed, so without this they would accumulate.
function sweepStale(keep, isPluginTempFile) {
  const dir = tmpdir();
  let names = [];
  try { names = readdirSync(dir).filter(isPluginTempFile); } catch { return; }
  const cutoff = Date.now() - STALE_MS;
  for (const name of names) {
    const file = join(dir, name);
    if (file === keep) continue;
    try { if (statSync(file).mtimeMs < cutoff) rmSync(file, { force: true }); } catch { /* ignore */ }
  }
}

async function main() {
  const { readPayload, sessionFile, modelId, isPluginTempFile } = await import('./lib/signals.mjs');
  const payload = readPayload();
  const file = sessionFile(payload.session_id);
  const model = modelId(payload.model);

  if (file) {
    try {
      if (model) writeFileSync(file, JSON.stringify({ model }), 'utf8');
      // Resume/compact may omit `model`: keep the saved one and refresh its
      // mtime so a long-lived session is never swept as stale.
      else if (existsSync(file)) utimesSync(file, new Date(), new Date());
    } catch { /* temp dir not writable — signals fall back to [default] */ }
  }
  sweepStale(file, isPluginTempFile);
}

// Any failure, including a broken install, must never break the session.
main().catch(() => {}).finally(() => process.exit(0));
