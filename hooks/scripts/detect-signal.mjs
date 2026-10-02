#!/usr/bin/env node
// cc-mood-prompt — detect-signal.mjs
// Event:   UserPromptSubmit (every prompt)
// Purpose: find the last cc- signal anywhere in the prompt, resolve that
//          one signal file for this session's model and project, and
//          inject it as additionalContext
// Output:  JSON with additionalContext if a signal matched
//          silent exit 0 if no match or bad input
//
// Runs on every prompt, so the common case stays minimal: if the raw
// payload has no "cc-" anywhere, exit before parsing JSON or loading the
// signal library. Only a possible signal pays for the rest.
//
// Pure Node.js: no external dependencies. Runs on Windows, macOS, Linux.

import { readFileSync } from 'node:fs';

async function main() {
  let raw = '';
  try { raw = readFileSync(0, 'utf8'); } catch { return; }
  if (!/cc-/i.test(raw)) return;

  let payload;
  try { payload = JSON.parse(raw); } catch { return; }
  if (!payload || typeof payload !== 'object') return;
  const prompt = typeof payload.prompt === 'string' ? payload.prompt : '';
  if (!/cc-/i.test(prompt)) return;

  const { loadSignalIndex, findSignal, resolveSignal, modelFamily, readSessionModel } = await import('./lib/signals.mjs');
  const sig = findSignal(prompt, loadSignalIndex());
  if (!sig) return;

  const context = resolveSignal(sig, {
    family: modelFamily(readSessionModel(payload.session_id)),
    cwd: typeof payload.cwd === 'string' ? payload.cwd : '',
  });
  if (!context) return;

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: context },
  }));
}

// A broken install (e.g. missing lib file) also lands here: no signal,
// prompt untouched.
main().catch(() => {}).finally(() => process.exit(0));
