#!/usr/bin/env bash
# cc-mood-prompt — detect-signal.sh
# Event:   UserPromptSubmit (every prompt)
# Purpose: detect cc- prefix in prompt
#          read pre-resolved XML from cache
#          strip prefix from prompt
#          inject XML as additionalContext
# Output:  JSON with additionalContext if matched
#          silent exit 0 if no match or no cache

set -euo pipefail

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""')

# Fast path — no cc- prefix, pass through immediately
if [[ "$PROMPT" != cc-* ]]; then
  exit 0
fi

# No cache available — degrade gracefully
if [ -z "${CC_SIGNAL_CACHE:-}" ] || [ ! -f "$CC_SIGNAL_CACHE" ]; then
  exit 0
fi

SIGNAL_MAP=$(cat "$CC_SIGNAL_CACHE")

# Iterate over all known prefixes and check for exact match
# Prefix must be at start of prompt followed by space or end of string
while IFS= read -r PREFIX; do
  if [[ "$PROMPT" == "$PREFIX "* || "$PROMPT" == "$PREFIX" ]]; then

    CONTEXT=$(echo "$SIGNAL_MAP" | jq -r --arg p "$PREFIX" '.[$p] // ""')

    [ -z "$CONTEXT" ] && continue

    # Strip prefix and leading space from prompt
    CLEAN_PROMPT="${PROMPT#"$PREFIX"}"
    CLEAN_PROMPT="${CLEAN_PROMPT# }"

    # Output JSON with additionalContext
    jq -n \
      --arg context "$CONTEXT" \
      '{
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: $context
        }
      }'

    exit 0
  fi
done < <(echo "$SIGNAL_MAP" | jq -r 'keys[]')

# No prefix matched — pass through
exit 0
