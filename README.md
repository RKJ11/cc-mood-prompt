# cc-mood-prompt

> Signal your mood, shape Claude's response.

Prefix any Claude Code prompt with a signal.
Claude responds differently. No configuration.
No settings menu. No commands to remember.

## Requirements

The hooks are pure Bash and depend on two tools being on your `PATH`:

- **bash** — runs the hook scripts
- **jq** — parses the hook JSON and builds the signal cache

Platform support:

- **macOS / Linux** — works out of the box once `jq` is installed
  (`brew install jq`, `apt install jq`, `dnf install jq`, …).
- **Windows** — requires a POSIX shell (Git Bash or WSL) and `jq` on
  `PATH` (`winget install jqlang.jq`). The scripts strip carriage returns,
  so a CRLF-emitting `jq` build is handled.

If `jq` (or bash) is missing, the plugin degrades gracefully: every prompt
passes through to Claude unchanged — no errors, no broken session.

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
