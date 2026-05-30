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
