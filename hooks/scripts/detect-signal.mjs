#!/usr/bin/env node
// cc-mood-prompt — detect-signal.mjs
// Event:   UserPromptSubmit (every prompt)
// Purpose: detect cc- prefix in prompt
//          read pre-resolved XML from cache
//          inject XML as additionalContext
// Output:  JSON with additionalContext if matched
//          silent exit 0 if no match, no cache, or bad input
//
// Pure Node.js: no external dependencies. Runs on Windows, macOS, Linux.

import { readFileSync, existsSync } from 'node:fs';

function main() {
  let raw = '';
  try { raw = readFileSync(0, 'utf8'); } catch { return; }

  let payload;
  try { payload = JSON.parse(raw || '{}'); } catch { return; }

  const prompt = typeof payload.prompt === 'string' ? payload.prompt : '';

  // Fast path — no cc- prefix, pass through immediately
  if (!prompt.startsWith('cc-')) return;

  // No cache available — degrade gracefully
  const cache = process.env.CC_SIGNAL_CACHE;
  if (!cache || !existsSync(cache)) return;

  let map;
  try { map = JSON.parse(readFileSync(cache, 'utf8')); } catch { return; }
  if (!map || typeof map !== 'object') return;

  // Match a known prefix at the start of the prompt, followed by a space
  // or the end of the string.
  for (const prefix of Object.keys(map)) {
    if (prompt === prefix || prompt.startsWith(`${prefix} `)) {
      const context = map[prefix];
      if (!context) continue;

      const output = {
        hookSpecificOutput: {
          hookEventName: 'UserPromptSubmit',
          additionalContext: context,
        },
      };
      process.stdout.write(JSON.stringify(output));
      return;
    }
  }
  // No prefix matched — pass through
}

main();
process.exit(0);
