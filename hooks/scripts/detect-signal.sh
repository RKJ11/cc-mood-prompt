#!/usr/bin/env bash
# cc-mood-prompt — detect-signal.sh
# Event:   UserPromptSubmit (every prompt)
# Purpose: detect cc- prefix in prompt
#          read pre-resolved XML from cache
#          strip prefix from prompt
#          inject XML as additionalContext
# Output:  JSON with additionalContext if matched
#          silent exit 0 if no match, no cache, or jq unavailable

set -euo pipefail

# Graceful degradation: if jq is not installed, pass the prompt through
# unchanged instead of erroring. The developer's prompt always reaches Claude.
command -v jq >/dev/null 2>&1 || exit 0

INPUT=$(cat)
# tr -d '\r' guards against jq builds that emit CRLF (e.g. native jq.exe on
# Windows); a stray trailing CR would otherwise break prefix matching.
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""' | tr -d '\r')

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

    CONTEXT=$(echo "$SIGNAL_MAP" | jq -r --arg p "$PREFIX" '.[$p] // ""' | tr -d '\r')

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
done < <(echo "$SIGNAL_MAP" | jq -r 'keys[]' | tr -d '\r')

# No prefix matched — pass through
exit 0
