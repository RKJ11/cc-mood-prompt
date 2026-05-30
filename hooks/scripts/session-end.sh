#!/usr/bin/env bash
# cc-mood-prompt — session-end.sh
# Event:   SessionEnd
# Purpose: clean up cache file from /tmp
# Output:  silent

set -euo pipefail

if [ -n "${CC_SIGNAL_CACHE:-}" ] && [ -f "$CC_SIGNAL_CACHE" ]; then
  rm -f "$CC_SIGNAL_CACHE"
fi

exit 0
