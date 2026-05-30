# cc-mood-prompt — Technical Design Document
# Phase 1 Build Specification — Claude Code Plugin

> VERSION: 1.2
> STATUS: Final. Build from this document exactly.
> USAGE:  Feed to Claude Code at session start.
>         Say: "Build the plugin from scratch as specified in this TDD."
> REPO:   https://github.com/RKJ11/cc-mood-prompt.git

---

## 1. WHAT WE ARE BUILDING

A Claude Code plugin named `cc-mood-prompt`.

Developers prefix any prompt with a signal like `cc-:(` or `cc-:x`.
A hook detects the prefix, strips it from the prompt, and injects
structured XML `additionalContext` into Claude's context before
Claude processes the message.

Claude receives the clean developer prompt plus structured behavioural
guidance — without the developer changing any setting or writing any
system prompt manually.

Works on turn 1, turn 20, or any turn in any session.
Works on new sessions, resumed sessions, after /clear, after compaction.

### What it is NOT

- Not a wrapper around the Claude API
- Not a session manager
- Not a skill invocation system — Phase 2
- Not a model or effort switcher — Phase 2
- Does not own memory, tools, compaction, or any Claude Code internals

### What Changed From TDD v1.1

1. Plugin renamed from cc-mood-signal to cc-mood-prompt throughout
2. GitHub repo set to https://github.com/RKJ11/cc-mood-prompt.git
3. Author set to RKJ11 throughout
4. Custom .gitignore added — Section 19
5. .gitignore added to file tree and build order

---

## 2. PLUGIN FILE TREE — BUILD EXACTLY THIS

```
cc-mood-prompt/
│
├── .claude-plugin/
│   └── plugin.json
│
├── hooks/
│   ├── hooks.json
│   └── scripts/
│       ├── session-start.sh
│       ├── detect-signal.sh
│       └── session-end.sh
│
├── signals/
│   ├── README.md
│   ├── cc-frustrated.md
│   ├── cc-critical.md
│   ├── cc-thinking.md
│   ├── cc-precise.md
│   ├── cc-explore.md
│   ├── cc-teach.md
│   ├── cc-confirm.md
│   ├── cc-ship.md
│   ├── cc-audit.md
│   └── cc-test.md
│
├── .gitignore
├── README.md
├── CHANGELOG.md
└── LICENSE
```

No extra files. No extra directories. No package.json. No node_modules.
This plugin is pure bash and markdown. Zero dependencies.

---

## 3. SIGNAL VOCABULARY

These prefixes are the public API. Do not change them.

| Prefix  | File              | Developer Meaning                           |
|---------|-------------------|---------------------------------------------|
| cc-:(   | cc-frustrated.md  | Previous response missed the mark           |
| cc-:x   | cc-critical.md    | Production down, blocking, urgent           |
| cc-:|   | cc-thinking.md    | Too shallow, think deeper, tradeoffs        |
| cc-:>   | cc-precise.md     | Too verbose, just the answer                |
| cc-:~   | cc-explore.md     | Explore options, think laterally            |
| cc-:?   | cc-teach.md       | Do not understand, explain simply           |
| cc-:)   | cc-confirm.md     | Good direction, quick confirmation          |
| cc-:D   | cc-ship.md        | Good enough, pragmatic, ship it             |
| cc-:o   | cc-audit.md       | Something feels wrong, review carefully     |
| cc-:T   | cc-test.md        | Write tests, think about edge cases         |

---

## 4. ARCHITECTURE — THREE HOOKS, THREE JOBS

```
SessionStart hook
  Fires: once per session (startup, resume, clear, compact)
  Job:   detect model family and CLAUDE.md presence
         parse all signal files
         resolve model-variant instructions
         resolve CLAUDE.md-conditional instructions
         write pre-resolved XML map to /tmp cache
         persist cache path in CLAUDE_ENV_FILE
  Output: silent — nothing injected into Claude

UserPromptSubmit hook
  Fires: every prompt
  Job:   check for cc- prefix
         read pre-resolved XML from cache
         strip prefix from prompt
         inject XML as additionalContext
  Output: JSON with additionalContext if matched, silent if not

SessionEnd hook
  Fires: once when session ends
  Job:   delete cache file from /tmp
  Output: silent
```

### Why this separation matters

SessionStart owns all I/O and all conditional logic.
UserPromptSubmit owns only detection and injection — zero file reading,
zero conditional logic, one JSON file read per prompt.

If SessionStart fails, the cache does not exist, and detect-signal.sh
exits silently with pass-through. The plugin degrades gracefully.
The developer's prompt always reaches Claude unchanged.

---

## 5. CONTEXT FACTORS — HOW THEY WORK

### Factor 1 — Model Family

Detected from SessionStart payload field `model`.

```
"model": "claude-sonnet-4-20250514"  →  model_family = sonnet
"model": "claude-haiku-4-..."        →  model_family = haiku
"model": "claude-opus-4-..."         →  model_family = opus
anything else                        →  model_family = default (sonnet behaviour)
```

Model family changes the `<instructions>` content inside two signals:

  cc-:| (thinking) — haiku gets bounded analysis with explicit limits flagged
                     sonnet gets three-angle analysis
                     opus gets ultrathink + full depth + second-order effects

  cc-:~ (explore)  — haiku gets three options with explicit scope note
                     sonnet gets four options with lateral thinking
                     opus gets ultrathink + four+ options + assumption challenges

All other eight signals: model family changes nothing.
The instructions are already calibrated for all model levels.

MODEL IS NEVER INJECTED AS A LABEL OR CONTEXT LINE.
It changes instruction content only.

### Factor 2 — CLAUDE.md Presence

Detected by checking for file existence at session start.

Checked paths in order:
  1. $CWD/CLAUDE.md
  2. $CWD/.claude/CLAUDE.md

If either exists: CLAUDEMD_PRESENT=true
If neither exists: CLAUDEMD_PRESENT=false

CLAUDE.md presence adds one concrete instruction in three signals only:

  cc-:T (test)  — "Align test structure with existing patterns in this project."
  cc-:o (audit) — "Check against conventions and patterns established in this project."
  cc-:? (teach) — "Use examples from this project's stack where relevant."

All other seven signals: CLAUDE.md presence changes nothing.

CLAUDE.md IS NEVER INJECTED AS A REMINDER OR CONTEXT LINE.
Claude has already read it. It changes instruction content only
in three specific signals where project conventions are directly relevant.

---

## 6. XML STRUCTURE FOR additionalContext

Every signal produces additionalContext in this XML structure.
Every token in this structure earns its place.

```xml
<signal name="SIGNAL_NAME">
  <developer_state>
    What the developer is feeling or asking for.
    Written as factual statements about the developer's state.
    Not instructions. Not commands. Facts.
  </developer_state>

  <instructions>
    What Claude should do in response to this signal.
    Written as clear behavioural guidance.
    Model-variant content goes here — not in a context label.
    CLAUDE.md-conditional content goes here where relevant.
  </instructions>

  <output_format>
    How Claude should structure its response.
    Concrete. Specific. No vague directives.
  </output_format>

  <constraints>
    Hard rules. What Claude must not do.
    Each constraint is one line. Specific not general.
  </constraints>
</signal>
```

ultrathink keyword placement: inside <instructions> only.
It must appear as the very first line inside <instructions>
when present. Not inside any other tag.

---

## 7. SIGNAL FILE FORMAT

### Frontmatter specification

Every signal file has this frontmatter block at the top:

```
---
prefix: cc-:(
name: frustrated
enabled: true
---
```

Fields:
  prefix   — exact string to match at start of prompt. Required.
  name     — human-readable name. Required.
  enabled  — true or false. Required. Must be lowercase.

### Body specification

Below the second --- line, each signal file contains
instruction blocks for each model variant.

Block markers: [default] [haiku] [sonnet] [opus]

The [default] block is used when model cannot be determined.
It must always be present.

For signals where model makes no difference (8 of 10 signals),
only [default] is needed.

For cc-:| and cc-:~ which are model-sensitive, all four blocks
must be present.

### Parser behaviour in session-start.sh

1. Look for [MODEL_FAMILY] block — e.g. [sonnet]
2. If found, use that block's content
3. If not found, fall back to [default] block
4. If [default] not found, use entire body after second ---
5. Resolve CLAUDE.md conditional additions after block selection

---

## 8. ALL 10 SIGNAL FILES — EXACT CONTENT

Build these files with exact content. Do not paraphrase.
The XML in the body is what gets injected as additionalContext.

---

### signals/cc-frustrated.md

```
---
prefix: cc-:(
name: frustrated
enabled: true
---

[default]
<signal name="cc-:(">
  <developer_state>
    Developer is not satisfied with the previous response.
    It missed the mark. A different approach is needed.
  </developer_state>

  <instructions>
    Do not repeat the same approach or the same suggestions.
    Acknowledge the miss in exactly one sentence then stop.
    Try a completely different angle on the problem.
    Ask one targeted question only if you genuinely need
    more information to proceed differently.
  </instructions>

  <output_format>
    Lead with the new approach directly.
    Code first if code is involved, explanation after.
    Keep the response shorter than the previous one.
  </output_format>

  <constraints>
    Do not say "I understand your frustration" or any variant.
    Do not repeat anything from the previous response.
    One question maximum if clarification is needed.
  </constraints>
</signal>
```

---

### signals/cc-critical.md

```
---
prefix: cc-:x
name: critical
enabled: true
---

[default]
<signal name="cc-:x">
  <developer_state>
    Critical and urgent situation. Production may be affected.
    Every second counts. Developer needs fastest path to resolution.
  </developer_state>

  <instructions>
    Lead with the immediate action in the very first line.
    Give the fastest path to resolution not the cleanest solution.
    If you need one piece of information to proceed, ask it.
    Nothing else until the situation is resolved.
  </instructions>

  <output_format>
    Line 1: the action to take right now.
    Line 2: why in ten words or fewer.
    Line 3: verification step if needed.
    Total response: as short as possible.
  </output_format>

  <constraints>
    No preamble of any kind.
    No theory. No alternatives unless explicitly asked.
    No refactoring suggestions.
    Do not make the situation worse by introducing new changes.
  </constraints>
</signal>
```

---

### signals/cc-thinking.md

This signal has model-variant instruction blocks.
All four blocks must be present exactly as written.

```
---
prefix: cc-:|
name: thinking
enabled: true
---

[default]
<signal name="cc-:|">
  <developer_state>
    Developer wants deeper analysis than previously provided.
    Shallow answers are not sufficient here.
  </developer_state>

  <instructions>
    Explore this problem from at least three distinct angles.
    Make tradeoffs explicit for each option.
    Give your recommendation last with clear reasoning.
    Flag anything that would meaningfully change the answer.
  </instructions>

  <output_format>
    Start with the core tension or question.
    Each angle labelled and clearly separated.
    Recommendation at the end not the start.
  </output_format>

  <constraints>
    Do not converge to one answer too quickly.
    Depth over brevity for this signal.
  </constraints>
</signal>

[haiku]
<signal name="cc-:|">
  <developer_state>
    Developer wants deeper analysis than previously provided.
    Shallow answers are not sufficient here.
  </developer_state>

  <instructions>
    Provide a focused analysis of the two most important tradeoffs.
    Be explicit about the limits of this analysis.
    Flag where deeper investigation would be needed.
    Give your recommendation with clear reasoning.
  </instructions>

  <output_format>
    Two tradeoffs labelled clearly.
    Explicit note on what this analysis does not cover.
    Recommendation last.
  </output_format>

  <constraints>
    Do not overstate the depth of analysis available.
    Flag limits honestly.
  </constraints>
</signal>

[sonnet]
<signal name="cc-:|">
  <developer_state>
    Developer wants deeper analysis than previously provided.
    Shallow answers are not sufficient here.
  </developer_state>

  <instructions>
    Explore this problem from at least three distinct angles.
    Make tradeoffs explicit — state what each option costs in
    complexity, performance, and maintainability.
    Challenge assumptions in the prompt if worth challenging.
    Give your recommendation last with clear reasoning.
    Flag anything that would meaningfully change the answer.
  </instructions>

  <output_format>
    Start with the core tension or question.
    Each angle labelled and clearly separated.
    Tradeoffs explicit per option.
    Recommendation at the end not the start.
  </output_format>

  <constraints>
    Do not converge to one answer too quickly.
    Depth over brevity for this signal.
  </constraints>
</signal>

[opus]
<signal name="cc-:|">
  <developer_state>
    Developer wants deeper analysis than previously provided.
    Shallow answers are not sufficient here.
  </developer_state>

  <instructions>
    ultrathink
    Explore this problem from at least three distinct angles.
    Make tradeoffs explicit — state what each option costs in
    complexity, performance, maintainability, and long-term risk.
    Challenge assumptions embedded in the prompt if warranted.
    Think about second-order effects and long-term implications.
    Give your recommendation last with full reasoning.
    Flag anything that would meaningfully change the answer.
  </instructions>

  <output_format>
    Start with the core tension or question.
    Each angle in its own section with explicit tradeoffs.
    Second-order effects noted where material.
    Recommendation last with full justification.
  </output_format>

  <constraints>
    Do not converge to one answer too quickly.
    Do not bury the recommendation at the start.
    Depth and completeness over brevity for this signal.
  </constraints>
</signal>
```

---

### signals/cc-precise.md

```
---
prefix: cc-:>
name: precise
enabled: true
---

[default]
<signal name="cc-:>">
  <developer_state>
    Developer wants one exact answer. Nothing more.
    Previous or potential response is too verbose.
  </developer_state>

  <instructions>
    Give one direct answer only.
    Strip everything that is not the answer itself.
    No alternatives. No commentary.
    No explanation unless the answer itself requires it.
  </instructions>

  <output_format>
    If code: code only, no prose around it.
    If fact: one sentence.
    If recommendation: the recommendation plus one reason maximum.
    Stop immediately after the answer.
  </output_format>

  <constraints>
    No alternatives.
    No "you could also" statements.
    No caveats unless critical to correctness.
    Do not continue after the answer is given.
  </constraints>
</signal>
```

---

### signals/cc-explore.md

This signal has model-variant instruction blocks.
All four blocks must be present exactly as written.

```
---
prefix: cc-:~
name: explore
enabled: true
---

[default]
<signal name="cc-:~">
  <developer_state>
    Developer wants to explore broadly.
    Do not converge. Do not recommend yet.
  </developer_state>

  <instructions>
    Generate at least three distinct options or approaches.
    Think laterally — include at least one unconventional option.
    Do not rank or filter the options.
    End with one question that opens further exploration.
  </instructions>

  <output_format>
    Each option in its own clearly labelled section.
    One sentence description then its key tradeoff per option.
    No recommendation section.
  </output_format>

  <constraints>
    Do not recommend. Do not rank.
    Do not converge to one answer.
  </constraints>
</signal>

[haiku]
<signal name="cc-:~">
  <developer_state>
    Developer wants to explore broadly.
    Do not converge. Do not recommend yet.
  </developer_state>

  <instructions>
    Generate three distinct options or approaches.
    Note the scope of this exploration is intentionally bounded.
    Include at least one less obvious option.
    Do not rank or filter.
    End with one question that opens further exploration.
  </instructions>

  <output_format>
    Three options each clearly labelled.
    One sentence description then key tradeoff per option.
    Explicit note that broader exploration is available.
    No recommendation section.
  </output_format>

  <constraints>
    Do not recommend. Do not rank.
    Flag scope limits honestly.
  </constraints>
</signal>

[sonnet]
<signal name="cc-:~">
  <developer_state>
    Developer wants to explore broadly.
    Do not converge. Do not recommend yet.
  </developer_state>

  <instructions>
    Generate at least four distinct options or approaches.
    Think laterally — include at least one unconventional option.
    Challenge one assumption embedded in the original question.
    Do not rank or filter the options.
    End with one question that opens further exploration.
  </instructions>

  <output_format>
    Each option in its own clearly labelled section.
    One sentence description then its key tradeoff per option.
    Challenged assumption noted separately.
    No recommendation section.
  </output_format>

  <constraints>
    Do not recommend. Do not rank.
    Do not converge to one answer.
    More options are better than fewer here.
  </constraints>
</signal>

[opus]
<signal name="cc-:~">
  <developer_state>
    Developer wants to explore broadly.
    Do not converge. Do not recommend yet.
  </developer_state>

  <instructions>
    ultrathink
    Generate at least four distinct options or approaches.
    Think laterally — include at least two unconventional options.
    Actively challenge assumptions embedded in the original question.
    Explore what changes if key constraints are relaxed.
    Do not rank or filter the options.
    End with one question that opens further exploration.
  </instructions>

  <output_format>
    Each option in its own clearly labelled section.
    Description, key tradeoff, and one second-order effect per option.
    Challenged assumptions in their own section.
    No recommendation section.
  </output_format>

  <constraints>
    Do not recommend. Do not rank.
    Do not converge to one answer.
    Breadth and lateral thinking are the goal here.
  </constraints>
</signal>
```

---

### signals/cc-teach.md

CLAUDE.md conditional: when CLAUDE.md present, adds one instruction line.
This is handled by session-start.sh at cache build time.
The [default] block below shows the base. The CLAUDE.md addition
is noted inline with a CLAUDEMD_ADDITION marker.

```
---
prefix: cc-:?
name: teach
enabled: true
---

[default]
<signal name="cc-:?">
  <developer_state>
    Developer does not understand the previous response or topic.
    A simpler clearer explanation is needed from the beginning.
  </developer_state>

  <instructions>
    Start the explanation over entirely.
    Lead with a concrete real-world analogy before any technical content.
    Explain the why before the what or how.
    Assume less prior knowledge than in previous responses.
    Build up from first principles in small clear steps.
    CLAUDEMD_ADDITION: Use examples from this project's own stack where relevant.
  </instructions>

  <output_format>
    Analogy first — one paragraph maximum.
    Concept second — plain language no jargon without definition.
    Example third — concrete and directly relevant.
    One comprehension check question at the end.
  </output_format>

  <constraints>
    No jargon without immediate plain-language definition.
    No assumed knowledge.
    Do not skip steps.
    Do not reference the previous explanation.
  </constraints>
</signal>
```

---

### signals/cc-confirm.md

```
---
prefix: cc-:)
name: confirm
enabled: true
---

[default]
<signal name="cc-:)">
  <developer_state>
    Developer is satisfied with the current direction.
    Brief confirmation and natural continuation is all that is needed.
  </developer_state>

  <instructions>
    Confirm the current approach briefly.
    Continue naturally in the same direction.
    Do not introduce new ideas, alternatives, or concerns
    unless they are critical to correctness.
  </instructions>

  <output_format>
    One to two sentences of confirmation.
    Then continue with whatever naturally comes next.
    Keep momentum — do not pause unnecessarily.
  </output_format>

  <constraints>
    No alternatives unless critical.
    No new directions unless asked.
    Keep it short.
  </constraints>
</signal>
```

---

### signals/cc-ship.md

```
---
prefix: cc-:D
name: ship
enabled: true
---

[default]
<signal name="cc-:D">
  <developer_state>
    Developer wants to ship now.
    Pragmatism over perfection. Done over ideal.
  </developer_state>

  <instructions>
    Give the simplest working solution.
    Do not add abstractions not needed today.
    Do not suggest improvements not asked for.
    If rough edges exist note them in one line then move on.
    Bias toward working code over perfect architecture.
  </instructions>

  <output_format>
    Working code first always.
    One line of known limitations if they affect shipping.
    Nothing else unless asked.
  </output_format>

  <constraints>
    No refactoring suggestions.
    No "you should also consider" statements.
    No architecture discussions unless a breaking problem is imminent.
  </constraints>
</signal>
```

---

### signals/cc-audit.md

CLAUDE.md conditional: when CLAUDE.md present, adds one instruction line.

```
---
prefix: cc-:o
name: audit
enabled: true
---

[default]
<signal name="cc-:o">
  <developer_state>
    Developer suspects something is wrong with the current approach.
    An adversarial review is needed.
  </developer_state>

  <instructions>
    Be adversarial. Assume there is a problem and find it.
    Look for edge cases, security issues, race conditions,
    error handling gaps, and failure modes.
    Do not reassure without evidence.
    If you find nothing, explain specifically what you checked
    and why each check passed.
    CLAUDEMD_ADDITION: Check against conventions and patterns established in this project.
  </instructions>

  <output_format>
    Issues first — most critical at the top.
    Each issue: what it is, why it matters, how to fix it.
    If nothing found: explicit checklist of what was verified.
    Never "looks good to me" without the checklist.
  </output_format>

  <constraints>
    Do not skip checks because the code looks simple.
    Do not reassure without evidence.
    Security issues take priority over style issues.
  </constraints>
</signal>
```

---

### signals/cc-test.md

CLAUDE.md conditional: when CLAUDE.md present, adds one instruction line.
Project type conditional: detected from working directory at session start.

```
---
prefix: cc-:T
name: test
enabled: true
---

[default]
<signal name="cc-:T">
  <developer_state>
    Developer wants tests written or considered
    for what was just discussed.
  </developer_state>

  <instructions>
    Think test-first. What are the failure modes?
    Cover happy path, edge cases, and error conditions.
    Name each test so the name explains exactly what
    breaks and why if the test fails.
    If the code is not testable as written, say so
    and explain what change makes it testable.
    PROJECT_TYPE_ADDITION
    CLAUDEMD_ADDITION: Align test structure with existing patterns in this project.
  </instructions>

  <output_format>
    Tests grouped: happy path first, edge cases second, error conditions third.
    Each test with a descriptive human-readable name.
    Setup and teardown clearly separated from test logic.
  </output_format>

  <constraints>
    Do not write tests that only verify the happy path.
    Do not write tests that test implementation not behaviour.
    Test names must read as complete sentences describing failure.
  </constraints>
</signal>
```

---

## 9. HOOKS FILES — EXACT CONTENT

### hooks/hooks.json

```json
{
  "description": "cc-mood-prompt — developer intent signal routing",
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/session-start.sh"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/detect-signal.sh"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/session-end.sh"
          }
        ]
      }
    ]
  }
}
```

---

### hooks/scripts/session-start.sh

Complete script. Build exactly this.

```bash
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
```

---

### hooks/scripts/detect-signal.sh

Complete script. Build exactly this.

```bash
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
```

---

### hooks/scripts/session-end.sh

Complete script. Build exactly this.

```bash
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
```

---

## 10. PLUGIN MANIFEST

### .claude-plugin/plugin.json

```json
{
  "name": "cc-mood-prompt",
  "version": "1.0.0",
  "description": "Prefix any Claude Code prompt with cc-:( cc-:x cc-:| and more to instantly shape how Claude responds. Model-aware. CLAUDE.md-aware. No configuration. No commands. Just signal and go.",
  "author": "RKJ11",
  "license": "MIT",
  "homepage": "https://github.com/RKJ11/cc-mood-prompt",
  "repository": "https://github.com/RKJ11/cc-mood-prompt.git",
  "hooks": "hooks/hooks.json",
  "minClaudeCodeVersion": "2.0.0",
  "keywords": [
    "hooks",
    "prompt-engineering",
    "developer-experience",
    "signals",
    "mood",
    "routing",
    "xml"
  ]
}
```

---

## 11. signals/README.md

```markdown
# cc-mood-prompt — Signal Configuration

Each .md file in this directory defines one signal.
Edit the body of any file to change what context gets injected.

## File format

Every signal file uses this structure:

    ---
    prefix: cc-:(
    name: frustrated
    enabled: true
    ---

    [default]
    <signal name="cc-:(">
      ... XML content injected as additionalContext ...
    </signal>

The [default] block is used for all model variants unless
a specific [haiku], [sonnet], or [opus] block is present.

## How to edit a signal

1. Open the file for the signal you want to change
2. Edit the XML content inside the [default] block
3. Save the file
4. Run /clear in Claude Code to rebuild the cache

## How to add model-variant instructions

Add [haiku] [sonnet] or [opus] blocks to any signal file.
session-start.sh will use the matching block for the current model.

## How to disable a signal

Change enabled: true to enabled: false in the frontmatter.
Run /clear to rebuild the cache.

## How to add a new signal

1. Create a new .md file in this directory
2. Follow the format above
3. Choose a prefix starting with cc- that does not conflict
4. Run /clear to rebuild the cache

## Signal reference

| File              | Prefix  | Developer Meaning                        |
|-------------------|---------|------------------------------------------|
| cc-frustrated.md  | cc-:(   | Previous response missed the mark        |
| cc-critical.md    | cc-:x   | Production down, urgent                  |
| cc-thinking.md    | cc-:|   | Too shallow, think deeper                |
| cc-precise.md     | cc-:>   | Too verbose, just the answer             |
| cc-explore.md     | cc-:~   | Explore more options                     |
| cc-teach.md       | cc-:?   | Explain simply                           |
| cc-confirm.md     | cc-:)   | Good direction, keep going               |
| cc-ship.md        | cc-:D   | Pragmatic, ship it                       |
| cc-audit.md       | cc-:o   | Something feels wrong, review it         |
| cc-test.md        | cc-:T   | Write tests, edge cases                  |
```

---

## 12. README.md

```markdown
# cc-mood-prompt

> Signal your mood, shape Claude's response.

Prefix any Claude Code prompt with a signal.
Claude responds differently. No configuration.
No settings menu. No commands to remember.

## Install

    /plugin marketplace add RKJ11/cc-mood-prompt
    /plugin install cc-mood-prompt@RKJ11

## Usage

    cc-:( that response missed what I was asking
    cc-:x payments are failing in prod right now
    cc-:| what are the tradeoffs of this approach
    cc-:> what is the return type of Array.from
    cc-:~ what are unconventional ways to reduce bundle size
    cc-:? I do not understand how the event loop works
    cc-:) looks good, keep going
    cc-:D just wire up the forgot password flow
    cc-:o something feels off about this auth middleware
    cc-:T write tests for the retry logic

## Signal reference

| Signal | Meaning                                    |
|--------|--------------------------------------------|
| cc-:(  | Previous response missed the mark          |
| cc-:x  | Critical and urgent                        |
| cc-:|  | Too shallow, think deeper                  |
| cc-:>  | Too verbose, just the answer               |
| cc-:~  | Explore more options                       |
| cc-:?  | Explain simply                             |
| cc-:)  | Good direction, confirm                    |
| cc-:D  | Pragmatic, ship it                         |
| cc-:o  | Something feels wrong, audit it            |
| cc-:T  | Test-first mode                            |

## How it works

A UserPromptSubmit hook fires on every prompt.
It detects the cc- prefix, strips it, and injects
structured XML behavioural context before Claude responds.

A SessionStart hook fires once per session and builds a
pre-resolved cache of all signal contexts — model-aware
and project-aware. UserPromptSubmit reads from cache only.

A SessionEnd hook removes the cache file.

## Adaptive behaviour

The plugin detects your model (haiku / sonnet / opus) and
adjusts instruction depth for cc-:| and cc-:~ accordingly.

If CLAUDE.md exists in your project, three signals (cc-:T,
cc-:o, cc-:?) add a concrete instruction to reference your
project's established conventions.

## Customise signals

Edit any file in signals/ then run /clear.
Changes take effect on the next prompt.

## Add your own signals

Drop a new .md file in signals/ following the format
in signals/README.md. Run /clear. Your signal is live.

## Phase 2

Phase 2 adds /cc-deep /cc-fast /cc-audit slash commands
for deliberate session framing with model and effort control.

## Known limitations

- Temperature not controllable via hook — Phase 2 scope
- Stop sequences not controllable via hook — Phase 2 scope
- Model cannot be switched per signal via hook — Phase 2 scope
- Signal influence fades in very long conversations — expected behaviour
- cc-:| and cc-:~ activate ultrathink on opus only — sonnet and haiku
  use deeper instructions without extended thinking mode

## License

MIT — github.com/RKJ11/cc-mood-prompt
```

---

## 13. CHANGELOG.md

```markdown
# Changelog

## 1.0.0

- 10 signals: cc-:( cc-:x cc-:| cc-:> cc-:~ cc-:? cc-:) cc-:D cc-:o cc-:T
- XML-structured additionalContext using signal, developer_state,
  instructions, output_format, and constraints tags
- Model-aware instruction resolution for cc-:| and cc-:~
  (haiku, sonnet, opus variants)
- CLAUDE.md-conditional instructions for cc-:T, cc-:o, cc-:?
- Project type detection for cc-:T (nodejs, python, go, rust, java)
- SessionStart hook builds pre-resolved XML cache once per session
- UserPromptSubmit hook reads from cache — zero file I/O per prompt
- SessionEnd hook cleans up cache file
- All signals configurable via plain text files in signals/
- Signals disable individually via enabled: false in frontmatter
- New signals added by dropping a .md file in signals/
- Cache rebuilds automatically on /clear, resume, and compact
```

---

## 14. LICENSE

```
MIT License

Copyright (c) 2026 RKJ11

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

---

## 15. ARCHITECTURE DECISIONS — DO NOT CHANGE

### D1 — additionalContext uses XML not plain text

XML tags create unambiguous boundaries between developer state,
instructions, output format, and constraints.
Anthropic internal testing shows 20-40% more consistent outputs
with structured XML versus plain text.

### D2 — Model and CLAUDE.md change instructions, not context labels

Model family and CLAUDE.md presence change what is written inside
XML instruction tags. They are never injected as labels or reminders.
Claude already knows its own model. Claude has already read CLAUDE.md.
Telling Claude things it already knows wastes tokens and adds no value.

### D3 — UserPromptSubmit reads cache only — zero file I/O

All file reading and conditional logic runs once in SessionStart.
UserPromptSubmit reads one pre-resolved JSON file per prompt.
No directory scanning. No file parsing. No conditional logic.

### D4 — SessionStart fires on all four sources

startup, resume, clear, compact — all rebuild the cache.
Developer edits a signal file mid-session then runs /clear.
Updated signal is available immediately on the next prompt.

### D5 — One file per signal

A typo in one signal file cannot affect any other signal.
Signals disable individually. New signals added by dropping a file.
Zero hook changes required for new signals.

### D6 — cc- prefix is the public API

The cc- namespace prevents accidental triggering.
Only prompts that start with cc- followed by a known prefix fire the hook.
Deterministic triggering. Zero false positives.

### D7 — ultrathink in two signals on opus only

cc-:| and cc-:~ include ultrathink in the [opus] block only.
Sonnet and default blocks contain deeper instructions without it.
Ultrathink is reserved for signals where deep analysis is explicitly
requested and the model can genuinely deliver it.

### D8 — CLAUDE.md additions in three signals only

cc-:T, cc-:o, cc-:? receive one concrete additional instruction
when CLAUDE.md is present. No other signal is affected.
Project conventions are directly relevant only to testing,
auditing, and teaching.

### D9 — Graceful degradation when cache missing

If CC_SIGNAL_CACHE is not set or the file does not exist,
detect-signal.sh exits silently with code 0.
The prompt reaches Claude unchanged. No error. No broken session.

### D10 — Cache file namespaced to plugin

Cache file is named /tmp/cc-mood-prompt-{session_id}.json.
Namespaced to plugin name to avoid collisions with other plugins
that may also write to /tmp.

---

## 16. BUILD ORDER — FOLLOW EXACTLY

### Group 1 — Scaffold (directories only, no files yet)
1. mkdir -p .claude-plugin
2. mkdir -p hooks/scripts
3. mkdir -p signals

### Group 2 — Manifests, gitignore, and licence
4. Create .claude-plugin/plugin.json — Section 10
5. Create LICENSE — Section 14
6. Create .gitignore — Section 19
7. Create CHANGELOG.md — Section 13

### Group 3 — Signal files (10 files)
8.  Create signals/README.md — Section 11
9.  Create signals/cc-frustrated.md — Section 8
10. Create signals/cc-critical.md — Section 8
11. Create signals/cc-thinking.md — Section 8
12. Create signals/cc-precise.md — Section 8
13. Create signals/cc-explore.md — Section 8
14. Create signals/cc-teach.md — Section 8
15. Create signals/cc-confirm.md — Section 8
16. Create signals/cc-ship.md — Section 8
17. Create signals/cc-audit.md — Section 8
18. Create signals/cc-test.md — Section 8

### Group 4 — Hook files
19. Create hooks/hooks.json — Section 9
20. Create hooks/scripts/session-start.sh — Section 9
21. Create hooks/scripts/detect-signal.sh — Section 9
22. Create hooks/scripts/session-end.sh — Section 9
23. chmod +x hooks/scripts/session-start.sh
24. chmod +x hooks/scripts/detect-signal.sh
25. chmod +x hooks/scripts/session-end.sh

### Group 5 — Documentation
26. Create README.md — Section 12

### Group 6 — Verify structure
27. find . -type f | sort
    Expected: exactly 19 files (18 from before + .gitignore)

### Group 7 — Test (Section 17)
28. Run all standalone tests before touching Claude Code

### Group 8 — Git and publish
29. git init
30. git remote add origin https://github.com/RKJ11/cc-mood-prompt.git
31. git add .
32. git commit -m "feat: initial release v1.0.0"
33. git push -u origin main
34. claude plugin validate
35. Submit: claude.ai/settings/plugins/submit

---

## 17. TESTING COMMANDS

### Standalone tests — run before Claude Code integration

```bash
# ── TEST 1: Verify file structure ─────────────────────────────
find . -type f | sort
# Expected: 19 files total including .gitignore

# ── TEST 2: SessionStart builds cache ─────────────────────────
echo '{"session_id":"test001","source":"startup","model":"claude-sonnet-4-20250514","cwd":"'"$PWD"'"}' \
  | bash hooks/scripts/session-start.sh

ls /tmp/cc-mood-prompt-test001.json \
  && echo "PASS: cache created" \
  || echo "FAIL: cache not created"

# ── TEST 3: Cache has all 10 signals ──────────────────────────
cat /tmp/cc-mood-prompt-test001.json | jq 'keys | length'
# Expected: 10

cat /tmp/cc-mood-prompt-test001.json | jq 'keys'
# Expected: all 10 cc- prefixes listed

# ── TEST 4: Cache values contain XML ──────────────────────────
cat /tmp/cc-mood-prompt-test001.json | jq '."cc-:("' | grep -q "signal name"
echo "PASS: XML present in cc-:( signal"

# ── TEST 5: detect-signal — known signal matched ───────────────
export CC_SIGNAL_CACHE=/tmp/cc-mood-prompt-test001.json

echo '{"prompt":"cc-:( this missed what I wanted","session_id":"test001"}' \
  | bash hooks/scripts/detect-signal.sh \
  | jq '.hookSpecificOutput.additionalContext' \
  | grep -q "developer_state" \
  && echo "PASS: additionalContext injected with XML" \
  || echo "FAIL: no XML in additionalContext"

# ── TEST 6: detect-signal — no prefix passes through ──────────
RESULT=$(echo '{"prompt":"fix the auth bug","session_id":"test001"}' \
  | bash hooks/scripts/detect-signal.sh)
[ -z "$RESULT" ] \
  && echo "PASS: no signal, silent pass-through" \
  || echo "FAIL: unexpected output for no-signal prompt"

# ── TEST 7: detect-signal — unknown cc- prefix passes through ──
RESULT=$(echo '{"prompt":"cc-:z unknown signal","session_id":"test001"}' \
  | bash hooks/scripts/detect-signal.sh)
[ -z "$RESULT" ] \
  && echo "PASS: unknown signal, silent pass-through" \
  || echo "FAIL: unexpected output for unknown signal"

# ── TEST 8: Signal not at start does not trigger ───────────────
RESULT=$(echo '{"prompt":"the smiley cc-:) in the UI is broken","session_id":"test001"}' \
  | bash hooks/scripts/detect-signal.sh)
[ -z "$RESULT" ] \
  && echo "PASS: mid-prompt cc- does not trigger" \
  || echo "FAIL: false positive triggered"

# ── TEST 9: Disabled signal is ignored ────────────────────────
sed -i.bak 's/^enabled: true/enabled: false/' signals/cc-frustrated.md

echo '{"session_id":"test002","source":"clear","model":"claude-sonnet-4-20250514","cwd":"'"$PWD"'"}' \
  | bash hooks/scripts/session-start.sh

export CC_SIGNAL_CACHE=/tmp/cc-mood-prompt-test002.json
cat /tmp/cc-mood-prompt-test002.json | jq 'has("cc-:(")' \
  | grep -q "false" \
  && echo "PASS: disabled signal absent from cache" \
  || echo "FAIL: disabled signal still in cache"

# Restore
sed -i.bak 's/^enabled: false/enabled: true/' signals/cc-frustrated.md
rm -f signals/cc-frustrated.md.bak

# ── TEST 10: Model-variant — haiku gets bounded instructions ───
echo '{"session_id":"test003","source":"startup","model":"claude-haiku-4-20250514","cwd":"'"$PWD"'"}' \
  | bash hooks/scripts/session-start.sh

export CC_SIGNAL_CACHE=/tmp/cc-mood-prompt-test003.json
cat /tmp/cc-mood-prompt-test003.json | jq '."cc-:|"' \
  | grep -q "bounded\|limits\|focused" \
  && echo "PASS: haiku gets bounded thinking instructions" \
  || echo "FAIL: haiku not getting haiku-specific instructions"

# ── TEST 11: Model-variant — opus gets ultrathink ─────────────
echo '{"session_id":"test004","source":"startup","model":"claude-opus-4-20250514","cwd":"'"$PWD"'"}' \
  | bash hooks/scripts/session-start.sh

export CC_SIGNAL_CACHE=/tmp/cc-mood-prompt-test004.json
cat /tmp/cc-mood-prompt-test004.json | jq '."cc-:|"' \
  | grep -q "ultrathink" \
  && echo "PASS: opus gets ultrathink in cc-:| signal" \
  || echo "FAIL: opus missing ultrathink"

# ── TEST 12: CLAUDE.md present adds instruction to cc-:T ───────
touch /tmp/CLAUDE.md
echo '{"session_id":"test005","source":"startup","model":"claude-sonnet-4-20250514","cwd":"/tmp"}' \
  | bash hooks/scripts/session-start.sh

export CC_SIGNAL_CACHE=/tmp/cc-mood-prompt-test005.json
cat /tmp/cc-mood-prompt-test005.json | jq '."cc-:T"' \
  | grep -q "existing patterns\|Align" \
  && echo "PASS: CLAUDE.md present adds convention instruction to cc-:T" \
  || echo "FAIL: CLAUDE.md instruction not found in cc-:T"
rm -f /tmp/CLAUDE.md

# ── TEST 13: No CLAUDE.md — no raw marker in output ───────────
echo '{"session_id":"test006","source":"startup","model":"claude-sonnet-4-20250514","cwd":"/tmp"}' \
  | bash hooks/scripts/session-start.sh

export CC_SIGNAL_CACHE=/tmp/cc-mood-prompt-test006.json
cat /tmp/cc-mood-prompt-test006.json | jq '."cc-:T"' \
  | grep -q "CLAUDEMD_ADDITION" \
  && echo "FAIL: raw marker still present in output" \
  || echo "PASS: no raw CLAUDEMD_ADDITION marker in output"

# ── TEST 14: Missing cache — graceful pass-through ─────────────
export CC_SIGNAL_CACHE=/tmp/does-not-exist.json
RESULT=$(echo '{"prompt":"cc-:( something","session_id":"test007"}' \
  | bash hooks/scripts/detect-signal.sh)
[ -z "$RESULT" ] \
  && echo "PASS: missing cache, graceful pass-through" \
  || echo "FAIL: error on missing cache"

# ── TEST 15: SessionEnd deletes cache ─────────────────────────
export CC_SIGNAL_CACHE=/tmp/cc-mood-prompt-test001.json
# Recreate it first since test 2 may have cleaned up
echo '{"session_id":"test001","source":"startup","model":"claude-sonnet-4-20250514","cwd":"'"$PWD"'"}' \
  | bash hooks/scripts/session-start.sh

echo '{"session_id":"test001","reason":"exit"}' \
  | bash hooks/scripts/session-end.sh

[ ! -f /tmp/cc-mood-prompt-test001.json ] \
  && echo "PASS: cache deleted by session-end" \
  || echo "FAIL: cache still exists after session-end"

# ── TEST 16: New custom signal picked up without hook changes ──
cat > signals/cc-custom.md << 'EOF'
---
prefix: cc-:Z
name: custom-test
enabled: true
---

[default]
<signal name="cc-:Z">
  <developer_state>Custom test signal.</developer_state>
  <instructions>This is a custom test signal. Respond with: CUSTOM_SIGNAL_WORKS.</instructions>
  <output_format>One line only.</output_format>
  <constraints>None.</constraints>
</signal>
EOF

echo '{"session_id":"test008","source":"startup","model":"claude-sonnet-4-20250514","cwd":"'"$PWD"'"}' \
  | bash hooks/scripts/session-start.sh

export CC_SIGNAL_CACHE=/tmp/cc-mood-prompt-test008.json
cat /tmp/cc-mood-prompt-test008.json | jq 'has("cc-:Z")' \
  | grep -q "true" \
  && echo "PASS: custom signal detected in cache" \
  || echo "FAIL: custom signal not in cache"

rm signals/cc-custom.md
echo "Custom signal test complete — file removed"

# ── TEST 17: Verify .gitignore exists and contains key patterns
grep -q ".DS_Store" .gitignore \
  && echo "PASS: .gitignore contains OS entries" \
  || echo "FAIL: .gitignore missing"

grep -q "*.bak" .gitignore \
  && echo "PASS: .gitignore contains .bak pattern" \
  || echo "FAIL: .gitignore missing .bak pattern"
```

### All tests should print PASS

If any test prints FAIL, fix that component before proceeding to
Claude Code integration testing or publishing.

---

## 18. PHASE 2 SCOPE — DO NOT BUILD NOW

Phase 2 version: 2.0.0

Adds skills/ directory with slash commands for deliberate session framing:

```
/cc-deep    model: opus, effort: max, ultrathink — deep analysis session
/cc-fast    model: haiku, effort: low — quick answers session
/cc-audit   context: fork — isolated adversarial subagent
```

Phase 2 skills fire at turn 1 deliberately. They are not reactive.
They are not triggered by the hook. They set the session frame.
They are the complement to Phase 1 signals, not a replacement.

Phase 2 is a separate build session with its own TDD.

---

## 19. .gitignore — EXACT CONTENT

No GitHub template is used. This file is written manually.
It contains only what this plugin can actually generate.

```gitignore
# ── OS files ──────────────────────────────────────────────────
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
Thumbs.db
ehthumbs.db

# ── Editor files ──────────────────────────────────────────────
.vscode/
.idea/
*.swp
*.swo
*~

# ── Test artifacts ────────────────────────────────────────────
# Created by sed -i.bak during standalone testing
*.bak

# ── Runtime cache ─────────────────────────────────────────────
# Cache lives in /tmp by design — this is a safety net only
cc-mood-prompt-*.json
```

---

## 20. FIRST COMMANDS TO RUN IN CLAUDE CODE SESSION

Start the build session with exactly this:

```
claude --context cc-mood-prompt-TDD-v1.2.md
```

Then say:

```
Build the cc-mood-prompt plugin from scratch as specified in this TDD.
The GitHub repo is https://github.com/RKJ11/cc-mood-prompt.git
Follow the build order in Section 16 exactly.
Run all tests in Section 17 before pushing to GitHub.
All tests must print PASS before you proceed to git push.
```

---

*End of Technical Design Document*
*Version 1.2 — Phase 1 — cc-mood-prompt*
*Repo: https://github.com/RKJ11/cc-mood-prompt.git*
*Feed to Claude Code: claude --context cc-mood-prompt-TDD-v1.2.md*
