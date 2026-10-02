# cc-mood-prompt — Signal Configuration

Each .md file in this directory defines one signal.
Edit the body of any file to change what context gets injected.
Changes apply on your next prompt — no restart or /clear needed.

## File format

Every signal file uses this structure:

    ---
    prefix: cc-urgent
    aliases: cc-:x, cc-sos, cc-p0
    name: critical
    enabled: true
    ---

    [default]
    <signal name="critical">
      ... XML content injected as additionalContext ...
    </signal>

- `prefix` — the signal's main name, shown in the docs.
- `aliases` — other names, comma-separated (`[a, b]` also works).
  Every name triggers the same signal.
- `name` — the signal's identity; use it in the `<signal name="...">` tag.
- `enabled` — `false` (or `no` / `off` / `0`) disables every name.

Names must start with `cc-`, contain no spaces, and are case-insensitive.
If two files claim the same name, the file that sorts first keeps it.

## Model variants

The [default] block is used for all models unless a specific
[haiku], [sonnet] or [opus] block is present. Always include [default].
Only those four `[name]` lines are block markers; any other line starting
with `[` is ordinary content.

## Placeholders

These work in any signal:

- `CLAUDEMD_ADDITION: <text>` — when the project has a CLAUDE.md,
  CLAUDE.local.md or .claude/CLAUDE.md, the line becomes `<text>`;
  otherwise the whole line is removed.
- `PROJECT_TYPE_ADDITION` — replaced with testing guidance for the
  detected stack (Node, Python, Go, Rust, Java), or generic guidance.

## How to add a new signal

1. Create a new .md file in this directory
2. Follow the format above
3. Pick names starting with cc- that no other signal uses
4. Use it in your next prompt

## Signal reference

| File              | Name       | Main name    | Aliases                                        |
|-------------------|------------|--------------|------------------------------------------------|
| cc-frustrated.md  | frustrated | cc-nope      | cc-:( cc-reroll cc-bruh cc-mid                 |
| cc-critical.md    | critical   | cc-urgent    | cc-:x cc-p0 cc-sev1 cc-sos cc-fire cc-911      |
| cc-thinking.md    | thinking   | cc-deep      | cc-:\| cc-deepdive cc-bigbrain cc-200iq        |
| cc-precise.md     | precise    | cc-short     | cc-:> cc-tldr cc-bluf cc-nofluff               |
| cc-explore.md     | explore    | cc-explore   | cc-:~ cc-spitball cc-whatif cc-brainstorm      |
| cc-teach.md       | teach      | cc-explain   | cc-:? cc-eli5 cc-101 cc-huh                    |
| cc-confirm.md     | confirm    | cc-yes       | cc-:) cc-lgtm cc-bet cc-slay cc-based          |
| cc-ship.md        | ship       | cc-ship      | cc-:D cc-mvp cc-shipit cc-yolo cc-sendit       |
| cc-audit.md       | audit      | cc-audit     | cc-:o cc-smell cc-redteam cc-sus cc-roast      |
| cc-test.md        | test       | cc-test      | cc-:T cc-tdd cc-qa cc-breakit                  |
