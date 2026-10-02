#!/usr/bin/env node
// cc-mood-prompt — session-end.mjs
// Event:   SessionEnd
// Purpose: delete this session's state file from the temp dir
// Output:  silent
//
// Pure Node.js: no external dependencies. Runs on Windows, macOS, Linux.

import { rmSync } from 'node:fs';

// Any failure, including a broken install, must never break the session.
try {
  const { readPayload, sessionFile } = await import('./lib/signals.mjs');
  const file = sessionFile(readPayload().session_id);
  if (file) rmSync(file, { force: true });
} catch { /* ignore */ }

process.exit(0);
