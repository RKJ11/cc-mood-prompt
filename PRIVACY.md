# Privacy Policy — cc-mood-prompt

_Last updated: 2026-05-31_

## Summary

**cc-mood-prompt does not collect, store, transmit, or share any personal
data.** Everything the plugin does happens locally on your own machine. There
are no servers, no analytics, no telemetry, and no network requests of any
kind.

## What the plugin does

cc-mood-prompt is a set of local Claude Code hooks written in pure Node.js. It:

1. Reads the signal definition files bundled with the plugin (`signals/*.md`).
2. At session start, builds a small cache of pre-resolved signal text and
   writes it to your operating system's temporary directory
   (e.g. `%TEMP%` on Windows, `/tmp` on macOS/Linux).
3. On each prompt you submit, checks whether the prompt begins with a known
   `cc-` signal and, if so, injects predefined behavioural context for Claude.
4. At session end, deletes the cache file it created.

## Data the plugin accesses

- **Your prompt text** is read locally by the `UserPromptSubmit` hook only to
  detect a leading `cc-` signal. It is never copied, logged, stored, or sent
  anywhere. It continues to Claude Code exactly as it normally would.
- **Local project signals** — the plugin checks whether a `CLAUDE.md` file and
  common project markers (e.g. `package.json`, `go.mod`) exist in your working
  directory, solely to tailor the injected instructions. It reads only whether
  these files exist and the project type they imply; their contents are not
  transmitted anywhere.
- **The session cache file** lives only in your local temp directory and is
  removed when the session ends.

## Data the plugin does NOT do

- Does not make any network or API calls.
- Does not use cookies, trackers, analytics, or telemetry.
- Does not collect personal information.
- Does not share, sell, or transmit any data to the author or any third party.

## Third parties

cc-mood-prompt has zero runtime dependencies and integrates with no third-party
services. It runs entirely within your local Claude Code environment.

## Changes to this policy

Any changes will be published in this file in the plugin's public repository:
<https://github.com/RKJ11/cc-mood-prompt/blob/main/PRIVACY.md>

## Contact

For questions about this policy, open an issue at
<https://github.com/RKJ11/cc-mood-prompt/issues>.
