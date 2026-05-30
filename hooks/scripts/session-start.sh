#!/usr/bin/env bash
# cc-mood-prompt — session-start.sh
# Event:   SessionStart (startup, resume, clear, compact)
# Purpose: detect model family and CLAUDE.md presence
#          parse all signal files
#          resolve model-variant and CLAUDE.md-conditional instructions
#          write pre-resolved XML signal map to /tmp cache
#          persist cache path via CLAUDE_ENV_FILE
# Output:  silent — nothing written to stdout

set -euo pipefail

# ─── READ PAYLOAD ─────────────────────────────────────────────
INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
MODEL=$(echo "$INPUT"     | jq -r '.model // "unknown"')
CWD=$(echo "$INPUT"       | jq -r '.cwd // ""')

PLUGIN_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SIGNALS_DIR="$PLUGIN_ROOT/signals"
CACHE_FILE="/tmp/cc-mood-prompt-${SESSION_ID}.json"

# ─── DETECT MODEL FAMILY ──────────────────────────────────────
if [[ "$MODEL" == *"haiku"* ]]; then
  MODEL_FAMILY="haiku"
elif [[ "$MODEL" == *"opus"* ]]; then
  MODEL_FAMILY="opus"
elif [[ "$MODEL" == *"sonnet"* ]]; then
  MODEL_FAMILY="sonnet"
else
  MODEL_FAMILY="default"
fi

# ─── DETECT CLAUDE.MD PRESENCE ────────────────────────────────
CLAUDEMD_PRESENT=false
if [ -f "$CWD/CLAUDE.md" ] || [ -f "$CWD/.claude/CLAUDE.md" ]; then
  CLAUDEMD_PRESENT=true
fi

# ─── DETECT PROJECT TYPE (for cc-:T test signal) ──────────────
PROJECT_TYPE="unknown"
if [ -f "$CWD/package.json" ]; then
  PROJECT_TYPE="nodejs"
elif [ -f "$CWD/requirements.txt" ] || [ -f "$CWD/pyproject.toml" ]; then
  PROJECT_TYPE="python"
elif [ -f "$CWD/go.mod" ]; then
  PROJECT_TYPE="go"
elif [ -f "$CWD/Cargo.toml" ]; then
  PROJECT_TYPE="rust"
elif [ -f "$CWD/pom.xml" ] || [ -f "$CWD/build.gradle" ]; then
  PROJECT_TYPE="java"
fi

# ─── PROJECT TYPE INSTRUCTION LINE ────────────────────────────
case "$PROJECT_TYPE" in
  nodejs)
    PROJECT_TYPE_LINE="Write tests using Jest or Vitest conventions. Use describe/it blocks. Mock external dependencies with vi.mock or jest.mock."
    ;;
  python)
    PROJECT_TYPE_LINE="Write tests using pytest conventions. Use fixtures for setup. Mock with pytest-mock or unittest.mock."
    ;;
  go)
    PROJECT_TYPE_LINE="Write tests using Go testing package. Use table-driven tests where appropriate."
    ;;
  rust)
    PROJECT_TYPE_LINE="Write tests using Rust built-in test framework. Use #[cfg(test)] module. Mock with mockall where needed."
    ;;
  java)
    PROJECT_TYPE_LINE="Write tests using JUnit 5 conventions. Use @BeforeEach for setup. Mock with Mockito."
    ;;
  *)
    PROJECT_TYPE_LINE="Write tests appropriate for this project's testing framework."
    ;;
esac

# ─── CLAUDEMD ADDITION LINES ──────────────────────────────────
# These are added to three specific signals only when CLAUDE.md exists.
# They are empty strings when CLAUDE.md is absent.
if [ "$CLAUDEMD_PRESENT" = "true" ]; then
  TEACH_ADDITION="Use examples from this project's own stack where relevant."
  AUDIT_ADDITION="Check against conventions and patterns established in this project."
  TEST_ADDITION="Align test structure with existing patterns in this project."
else
  TEACH_ADDITION=""
  AUDIT_ADDITION=""
  TEST_ADDITION=""
fi

# ─── HELPER: EXTRACT BLOCK FROM SIGNAL FILE ───────────────────
# Arguments: $1 = file path, $2 = block name e.g. "sonnet"
# Returns: content of the named block, or empty string if not found
extract_block() {
  local file="$1"
  local block="$2"
  awk \
    -v target="[$block]" \
    'BEGIN{in_section=0}
     /^\[/{
       if($0 == target) { in_section=1; next }
       else if(in_section) { exit }
       else { in_section=0 }
     }
     in_section { print }' \
    "$file" 2>/dev/null
}

# ─── HELPER: EXTRACT BODY AFTER SECOND --- ────────────────────
extract_default_body() {
  local file="$1"
  awk 'BEGIN{n=0} /^---$/{n++; next} n>=2 && !/^\[/{print}' "$file" 2>/dev/null
}

# ─── BUILD SIGNAL MAP ─────────────────────────────────────────
SIGNAL_MAP="{}"
shopt -s nullglob

for SIGNAL_FILE in "$SIGNALS_DIR"/*.md; do
  [[ "$(basename "$SIGNAL_FILE")" == "README.md" ]] && continue
  [ -f "$SIGNAL_FILE" ] || continue

  # Read frontmatter
  PREFIX=$(grep  "^prefix:"  "$SIGNAL_FILE" 2>/dev/null | head -1 | sed 's/^prefix: *//')
  ENABLED=$(grep "^enabled:" "$SIGNAL_FILE" 2>/dev/null | head -1 | sed 's/^enabled: *//')
  NAME=$(grep    "^name:"    "$SIGNAL_FILE" 2>/dev/null | head -1 | sed 's/^name: *//')

  [ "$ENABLED" = "false" ] && continue
  [ -z "$PREFIX" ]         && continue

  # Try model-family block first, then default, then full body
  CONTENT=""
  CONTENT=$(extract_block "$SIGNAL_FILE" "$MODEL_FAMILY")

  if [ -z "$CONTENT" ]; then
    CONTENT=$(extract_block "$SIGNAL_FILE" "default")
  fi

  if [ -z "$CONTENT" ]; then
    CONTENT=$(extract_default_body "$SIGNAL_FILE")
  fi

  [ -z "$CONTENT" ] && continue

  # ─── RESOLVE CLAUDEMD_ADDITION MARKERS ──────────────────────
  # cc-:? teach signal
  if [[ "$PREFIX" == "cc-:?" ]]; then
    if [ -n "$TEACH_ADDITION" ]; then
      CONTENT=$(echo "$CONTENT" | sed \
        "s|CLAUDEMD_ADDITION: Use examples from this project's own stack where relevant.|$TEACH_ADDITION|g")
    else
      CONTENT=$(echo "$CONTENT" | grep -v "CLAUDEMD_ADDITION:" || true)
    fi
  fi

  # cc-:o audit signal
  if [[ "$PREFIX" == "cc-:o" ]]; then
    if [ -n "$AUDIT_ADDITION" ]; then
      CONTENT=$(echo "$CONTENT" | sed \
        "s|CLAUDEMD_ADDITION: Check against conventions and patterns established in this project.|$AUDIT_ADDITION|g")
    else
      CONTENT=$(echo "$CONTENT" | grep -v "CLAUDEMD_ADDITION:" || true)
    fi
  fi

  # cc-:T test signal
  if [[ "$PREFIX" == "cc-:T" ]]; then
    # Resolve PROJECT_TYPE_ADDITION marker
    CONTENT=$(echo "$CONTENT" | sed "s|PROJECT_TYPE_ADDITION|$PROJECT_TYPE_LINE|g")
    # Resolve CLAUDEMD_ADDITION marker
    if [ -n "$TEST_ADDITION" ]; then
      CONTENT=$(echo "$CONTENT" | sed \
        "s|CLAUDEMD_ADDITION: Align test structure with existing patterns in this project.|$TEST_ADDITION|g")
    else
      CONTENT=$(echo "$CONTENT" | grep -v "CLAUDEMD_ADDITION:" || true)
    fi
  fi

  # ─── STORE IN MAP ───────────────────────────────────────────
  # Collapse multiline to single escaped string for JSON storage
  ESCAPED_CONTENT=$(echo "$CONTENT" | \
    tr -s ' \t' ' '  | \
    sed ':a;N;$!ba;s/\n/ /g' | \
    sed 's/  */ /g')

  SIGNAL_MAP=$(echo "$SIGNAL_MAP" | jq \
    --arg prefix  "$PREFIX" \
    --arg content "$ESCAPED_CONTENT" \
    '. + {($prefix): $content}')
done

# ─── WRITE CACHE ──────────────────────────────────────────────
echo "$SIGNAL_MAP" > "$CACHE_FILE"

# ─── PERSIST CACHE PATH TO SESSION ENVIRONMENT ────────────────
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  grep -v "^CC_SIGNAL_CACHE=" "$CLAUDE_ENV_FILE" \
    > "${CLAUDE_ENV_FILE}.tmp" 2>/dev/null || true
  mv "${CLAUDE_ENV_FILE}.tmp" "$CLAUDE_ENV_FILE" 2>/dev/null || true
  echo "CC_SIGNAL_CACHE=$CACHE_FILE" >> "$CLAUDE_ENV_FILE"
fi

# Silent exit — nothing written to stdout
exit 0
