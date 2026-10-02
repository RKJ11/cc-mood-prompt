# cc-mood-prompt

> Signal your mood, shape Claude's response.

Drop a signal like `cc-urgent`, `cc-eli5` or `cc-roast` into any Claude
Code prompt and Claude changes how it responds. No configuration.
No settings menu. No commands to remember.

## Requirements

**No external dependencies.** The hooks are pure Node.js (`.mjs`) and use
only Node's built-in modules — no `bash`, `jq`, `awk` or `sed`.

- **Windows / macOS / Linux** — works out of the box. Claude Code runs on
  Node, so `node` is already available to the hooks; nothing to install.

If `node` is somehow unavailable, the plugin degrades gracefully: the hook
simply doesn't run and every prompt reaches Claude unchanged — no errors,
no broken session.

## Install

    /plugin marketplace add RKJ11/cc-mood-prompt
    /plugin install cc-mood-prompt@cc-mood-prompt

Then start a new session (or run `/clear`) so the hooks load.

## Usage

Put a signal anywhere in your prompt — start, middle or end:

    cc-urgent payments are failing in prod right now
    this is still wrong cc-nope
    cc-eli5 how does the event loop work
    roast this auth middleware cc-roast
    just wire up the forgot password flow cc-yolo
    cc-tldr what is the return type of Array.from

Every signal has a plain name, a few aliases, and its original emoticon.
They all do the same thing — use whichever you remember.

## Signals

| Signal | Names | What Claude does |
|--------|-------|------------------|
| frustrated | `cc-nope` `cc-reroll` `cc-bruh` `cc-mid` `cc-:(` | Drops the last approach and tries a different angle |
| critical | `cc-urgent` `cc-p0` `cc-sev1` `cc-sos` `cc-fire` `cc-911` `cc-:x` | Fastest path to a fix, action in line one |
| thinking | `cc-deep` `cc-deepdive` `cc-bigbrain` `cc-200iq` `cc-:\|` | Several angles, explicit trade-offs, recommendation last |
| precise | `cc-short` `cc-tldr` `cc-bluf` `cc-nofluff` `cc-:>` | One direct answer, nothing else |
| explore | `cc-explore` `cc-brainstorm` `cc-whatif` `cc-spitball` `cc-:~` | Wide range of options, no verdict |
| teach | `cc-explain` `cc-eli5` `cc-101` `cc-huh` `cc-:?` | Starts over simply: analogy, concept, example |
| confirm | `cc-yes` `cc-lgtm` `cc-bet` `cc-slay` `cc-based` `cc-:)` | Brief confirmation, keeps going |
| ship | `cc-ship` `cc-shipit` `cc-mvp` `cc-yolo` `cc-sendit` `cc-:D` | Simplest working solution, no gold-plating |
| audit | `cc-audit` `cc-sus` `cc-roast` `cc-smell` `cc-redteam` `cc-:o` | Adversarial review: assumes a bug and hunts it |
| test | `cc-test` `cc-tdd` `cc-qa` `cc-breakit` `cc-:T` | Test-first: happy path, edge cases, error cases |

### How signals are recognised

- **Anywhere in the prompt**, as a separate word. `cc-ship.` and
  `cc-eli5?` work; `signals/cc-test.md` or `cc-shipping` do not.
- **Case doesn't matter**: `cc-:X`, `CC-URGENT` and `cc-Yolo` all work.
- **The last signal wins.** `cc-urgent fix login cc-ship` uses *ship*.
  Unknown `cc-` words are skipped, so a typo never cancels a real signal.
- **Code is ignored.** A signal inside `backticks` or a code block is
  treated as text, so you can paste code or ask about a signal safely.
- The signal stays in your prompt; Claude also receives the signal's
  instructions as extra context.

## How it works

A UserPromptSubmit hook runs on every prompt. If the prompt contains no
`cc-`, it exits immediately. Otherwise it finds the last signal, reads
that one signal file, tailors it to your model and project, and adds it as
context for Claude.

A SessionStart hook records which model the session uses (Claude Code only
tells SessionStart hooks this), and a SessionEnd hook deletes that small
record. Nothing else is stored.

## Adaptive behaviour

- **Model-aware.** `cc-deep` and `cc-explore` have separate instructions
  for haiku, sonnet and opus.
- **Project-aware.** If your project has a `CLAUDE.md`, `CLAUDE.local.md`
  or `.claude/CLAUDE.md` (in the working folder or any parent up to the
  repo root), `cc-test`, `cc-audit` and `cc-explain` tell Claude to follow
  your project's conventions.
- **Stack-aware tests.** `cc-test` picks Jest/Vitest, pytest, Go testing,
  Rust tests or JUnit based on the nearest `package.json`, `pyproject.toml`,
  `requirements.txt`, `setup.py`, `go.mod`, `Cargo.toml`, `pom.xml` or
  `build.gradle(.kts)`.

## Customise signals

Each signal is a plain text file in `signals/` — edit its instructions,
add your own names under `aliases:`, or set `enabled: false`. Changes
apply on your next prompt; no restart needed. See `signals/README.md`.

If you installed from the marketplace, the files live in Claude Code's
plugin folder and are replaced when the plugin updates — keep a copy of
your edits.

## Add your own signals

Drop a new `.md` file in `signals/` following the format in
`signals/README.md`. It works on your next prompt.

## Phase 2

Phase 2 adds slash commands for deliberate session framing —
deep-analysis, quick-answer and isolated-review sessions — with model
and effort control.

## Known limitations

- Temperature not controllable via hook — Phase 2 scope
- Stop sequences not controllable via hook — Phase 2 scope
- Model cannot be switched per signal via hook — Phase 2 scope
- Signal influence fades in very long conversations — expected behaviour
- cc-deep and cc-explore activate ultrathink on opus only — sonnet and
  haiku use deeper instructions without extended thinking mode
- The model is read once at session start. After switching with /model,
  run /clear so signals use the new model's instructions
- In non-interactive runs (`claude -p`, SDK) Claude Code does not tell
  hooks the model, so signals use their [default] instructions
- One signal per prompt; combining signals is not supported yet

## License

MIT — github.com/RKJ11/cc-mood-prompt
