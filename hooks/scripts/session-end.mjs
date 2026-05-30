#!/usr/bin/env node
// cc-mood-prompt — session-end.mjs
// Event:   SessionEnd
// Purpose: clean up cache file from the temp dir
// Output:  silent
//
// Pure Node.js: no external dependencies. Runs on Windows, macOS, Linux.

import { existsSync, rmSync } from 'node:fs';

const cache = process.env.CC_SIGNAL_CACHE;
if (cache && existsSync(cache)) {
  try { rmSync(cache, { force: true }); } catch { /* ignore */ }
}

process.exit(0);
