# Changelog

## 1.1.0

### Fixed
- Signals never fired in live sessions. The cache path was handed to the
  prompt hook through CLAUDE_ENV_FILE, which only reaches Bash tool
  commands, not other hooks. Hooks now rely only on their own input.
- SessionEnd never deleted its file for the same reason; files from old
  sessions are now also swept after 7 days.
- An unquoted Windows path (backslashes stripped by bash) was leaked into
  every Bash tool command via CLAUDE_ENV_FILE. The plugin no longer writes
  to CLAUDE_ENV_FILE.
- A signal followed by a newline, tab or CRLF, or preceded by whitespace,
  was silently ignored.
- A `null` hook payload crashed the hooks with a stack trace.
- An unsafe or missing session_id could write outside the temp directory
  or share one file between sessions.
- CLAUDE.md and project type are now found from subfolders (walking up to
  the repo root); CLAUDE.local.md, setup.py, setup.cfg, Pipfile and
  build.gradle.kts are recognised; ~/.claude/CLAUDE.md is not mistaken
  for project instructions.
- CLAUDEMD_ADDITION and PROJECT_TYPE_ADDITION now work in any signal and
  with any marker text, instead of leaking into the injected context.
- Signal parsing: a block marker with trailing spaces no longer merges all
  model variants; content lines starting with "[" no longer cut a block
  short; UTF-8 BOM, quoted values and `enabled: False/no/off/0` handled;
  frontmatter is read only from the header.
- Model detection is case-insensitive and accepts an object form.
- Docs no longer claim the prefix is stripped from the prompt.

### Added
- Word names and aliases for every signal (`cc-urgent`, `cc-eli5`,
  `cc-roast`, `cc-yolo`, `cc-tldr` …); the emoticon names still work.
  Custom aliases via an `aliases:` frontmatter field.
- Signals can appear anywhere in the prompt; the last one wins. Signals
  inside backticks or code blocks are ignored.
- Signal names are case-insensitive (`cc-:X`, `CC-URGENT`).
- Signal edits apply on the next prompt — no /clear needed.
- `tests/run.mjs`: zero-dependency test suite (`node tests/run.mjs`).

### Changed
- No per-session signal cache: the prompt hook resolves the one signal it
  needs on demand. SessionStart only records the session's model.
- The injected tag is now `<signal name="critical">` (the signal's name)
  instead of the prefix that was typed.

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
