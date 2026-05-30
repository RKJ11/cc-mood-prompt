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
