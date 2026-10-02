#!/usr/bin/env node
// cc-mood-prompt — tests/run.mjs
// Black-box tests: runs the real hook scripts as subprocesses with mock
// payloads, exactly as Claude Code does (JSON on stdin, no extra env vars).
// Every run is sandboxed: TEMP/TMP/HOME point at a throwaway directory.
//
// Usage: node tests/run.mjs [--verbose]
// Pure Node.js: no external dependencies.

import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, cpSync, readdirSync, rmSync, utimesSync, statSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERBOSE = process.argv.includes('--verbose');
const SANDBOX = mkdtempSync(join(tmpdir(), 'ccmp-test-'));
const TMP = join(SANDBOX, 'tmp');
const HOME = join(SANDBOX, 'home');
mkdirSync(TMP); mkdirSync(HOME);

// Expected public surface: every name must keep resolving to its signal.
const SIGNALS = {
  frustrated: ['cc-nope', 'cc-:(', 'cc-reroll', 'cc-bruh', 'cc-mid'],
  critical: ['cc-urgent', 'cc-:x', 'cc-p0', 'cc-sev1', 'cc-sos', 'cc-fire', 'cc-911'],
  thinking: ['cc-deep', 'cc-:|', 'cc-deepdive', 'cc-bigbrain', 'cc-200iq'],
  precise: ['cc-short', 'cc-:>', 'cc-tldr', 'cc-bluf', 'cc-nofluff'],
  explore: ['cc-explore', 'cc-:~', 'cc-spitball', 'cc-whatif', 'cc-brainstorm'],
  teach: ['cc-explain', 'cc-:?', 'cc-eli5', 'cc-101', 'cc-huh'],
  confirm: ['cc-yes', 'cc-:)', 'cc-lgtm', 'cc-bet', 'cc-slay', 'cc-based'],
  ship: ['cc-ship', 'cc-:D', 'cc-mvp', 'cc-shipit', 'cc-yolo', 'cc-sendit'],
  audit: ['cc-audit', 'cc-:o', 'cc-smell', 'cc-redteam', 'cc-sus', 'cc-roast'],
  test: ['cc-test', 'cc-:T', 'cc-tdd', 'cc-qa', 'cc-breakit'],
};

// ─── HARNESS ──────────────────────────────────────────────────

let pass = 0;
const failures = [];
let section = '';
function group(name) { section = name; if (VERBOSE) console.log(`\n${name}`); }
function check(name, ok, detail = '') {
  if (ok) { pass++; if (VERBOSE) console.log(`  PASS ${name}`); return; }
  failures.push(`${section} › ${name}${detail ? `\n      -> ${detail}` : ''}`);
  if (VERBOSE) console.log(`  FAIL ${name}${detail ? `\n      -> ${detail}` : ''}`);
}

// Run one hook script the way Claude Code does. Inherited env is scrubbed
// of the v1.0 handoff variables so nothing can pass by accident.
function run(script, input, { root = ROOT, env = {} } = {}) {
  const base = { ...process.env, TEMP: TMP, TMP, TMPDIR: TMP, HOME, USERPROFILE: HOME };
  delete base.CC_SIGNAL_CACHE; delete base.CLAUDE_ENV_FILE;
  const r = spawnSync(process.execPath, [join(root, 'hooks', 'scripts', script)], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    env: { ...base, ...env }, encoding: 'utf8', timeout: 15000,
  });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
const stateFile = (sid) => join(TMP, `cc-mood-prompt-session-${sid}.json`);
const ctxOf = (out) => { try { return JSON.parse(out).hookSpecificOutput.additionalContext; } catch { return null; } };
const nameOf = (ctx) => ctx?.match(/<signal name="([^"]+)"/)?.[1] ?? null;

let sidN = 0;
// Start a session and return a detect() bound to it.
// An explicit `model: undefined` means "payload has no model field".
function session(opts = {}) {
  const { cwd = '', root = ROOT } = opts;
  const model = 'model' in opts ? opts.model : 'claude-sonnet-5-5';
  const sid = `s${sidN++}`;
  run('session-start.mjs', { session_id: sid, model, cwd, hook_event_name: 'SessionStart', source: 'startup' }, { root });
  const detect = (prompt, extra = {}) => ctxOf(run('detect-signal.mjs', { session_id: sid, cwd, prompt, ...extra }, { root }).out);
  return { sid, detect, which: (p) => nameOf(detect(p)) };
}

let dirN = 0;
// Projects are git repos by default, so the CLAUDE.md walk-up stops at the
// project root instead of climbing out of the sandbox into the real home.
function project(files = {}, { git = true } = {}) {
  const d = join(SANDBOX, `proj${dirN++}`);
  mkdirSync(d, { recursive: true });
  if (git) mkdirSync(join(d, '.git'));
  for (const [f, c] of Object.entries(files)) { mkdirSync(dirname(join(d, f)), { recursive: true }); writeFileSync(join(d, f), c); }
  return d;
}
// Copy of the plugin whose signals/ can be mutated per test.
function plugin(extraSignals = {}, { empty = false, noSignalsDir = false } = {}) {
  const d = join(SANDBOX, `plugin${dirN++}`);
  cpSync(join(ROOT, 'hooks'), join(d, 'hooks'), { recursive: true });
  if (!noSignalsDir) cpSync(join(ROOT, 'signals'), join(d, 'signals'), { recursive: true });
  if (empty) for (const f of readdirSync(join(d, 'signals'))) if (f !== 'README.md') rmSync(join(d, 'signals', f));
  for (const [f, c] of Object.entries(extraSignals)) writeFileSync(join(d, 'signals', f), c);
  return d;
}
const sigFile = (head, body) => `---\n${head}\n---\n\n${body}\n`;

const P0 = project();

// ═══ A. LIFECYCLE ═════════════════════════════════════════════
group('A. Lifecycle (exactly as Claude Code runs the hooks)');
{
  const sid = 'life1';
  const envFile = join(SANDBOX, 'claude-env'); writeFileSync(envFile, 'export KEEP=1\n');
  const s = run('session-start.mjs', { session_id: sid, model: 'claude-opus-5-5', cwd: P0, source: 'startup' }, { env: { CLAUDE_ENV_FILE: envFile } });
  check('session-start exits 0 silently', s.code === 0 && s.out === '' && s.err === '', JSON.stringify(s));
  check('state file holds only the model', JSON.stringify(JSON.parse(readFileSync(stateFile(sid), 'utf8'))) === '{"model":"claude-opus-5-5"}');
  check('CLAUDE_ENV_FILE left untouched (nothing leaks into the Bash tool)', readFileSync(envFile, 'utf8') === 'export KEEP=1\n');
  const d = run('detect-signal.mjs', { session_id: sid, cwd: P0, prompt: 'cc-urgent prod is down' });
  check('signal injected from the hook payload alone', nameOf(ctxOf(d.out)) === 'critical', JSON.stringify(d));
  check('opus session gets the opus block', ctxOf(run('detect-signal.mjs', { session_id: sid, prompt: 'cc-deep x' }).out)?.includes('ultrathink'));
  const e = run('session-end.mjs', { session_id: sid, reason: 'other' });
  check('session-end exits 0 silently', e.code === 0 && e.out === '' && e.err === '');
  check('session-end deletes the state file', !existsSync(stateFile(sid)));
  check('signals still work after state is gone ([default] block)', (() => { const c = ctxOf(run('detect-signal.mjs', { session_id: sid, prompt: 'cc-deep x' }).out); return nameOf(c) === 'thinking' && !c.includes('ultrathink'); })());

  // /clear = SessionEnd(old) then SessionStart(new id)
  run('session-start.mjs', { session_id: 'clr-old', model: 'claude-haiku-4-5' });
  run('session-end.mjs', { session_id: 'clr-old', reason: 'clear' });
  run('session-start.mjs', { session_id: 'clr-new', model: 'claude-haiku-4-5', source: 'clear' });
  check('/clear: old state removed, new state written', !existsSync(stateFile('clr-old')) && existsSync(stateFile('clr-new')));

  // resume/compact without `model` keeps the saved model
  run('session-start.mjs', { session_id: 'res', model: 'claude-opus-5-5', source: 'startup' });
  run('session-start.mjs', { session_id: 'res', source: 'compact' });
  check('resume/compact without model keeps the saved model', readFileSync(stateFile('res'), 'utf8').includes('opus'));
  run('session-start.mjs', { session_id: 'res', model: 'claude-haiku-4-5', source: 'resume' });
  check('resume with a new model updates it', readFileSync(stateFile('res'), 'utf8').includes('haiku'));

  // Never started (plugin installed mid-session)
  check('no SessionStart ever ran -> still injects [default]', nameOf(ctxOf(run('detect-signal.mjs', { session_id: 'never', prompt: 'cc-yolo' }).out)) === 'ship');
  check('output is valid hook JSON', (() => {
    const o = JSON.parse(run('detect-signal.mjs', { session_id: 'never', prompt: 'cc-yes' }).out);
    return o.hookSpecificOutput.hookEventName === 'UserPromptSubmit' && typeof o.hookSpecificOutput.additionalContext === 'string';
  })());
  check('injected context is one line with no leftover markers', (() => {
    const c = ctxOf(run('detect-signal.mjs', { session_id: 'never', prompt: 'cc-test', cwd: P0 }).out);
    return !/\n|  |CLAUDEMD_ADDITION|PROJECT_TYPE_ADDITION/.test(c);
  })());
}

// ═══ B. NAMES ═════════════════════════════════════════════════
group('B. Every signal name and alias');
{
  const { which } = session({ cwd: P0 });
  for (const [sig, names] of Object.entries(SIGNALS)) {
    for (const n of names) check(`${n} -> ${sig}`, which(`${n} do the thing`) === sig, `got ${which(`${n} do the thing`)}`);
  }
  const caseCases = [['cc-:X', 'critical'], ['CC-URGENT', 'critical'], ['Cc-Yolo', 'ship'], ['cc-:d', 'ship'], ['cc-:t', 'test'], ['CC-:O', 'audit'], ['CC-ELI5', 'teach']];
  for (const [n, sig] of caseCases) check(`case-insensitive ${n} -> ${sig}`, which(`${n} hi`) === sig);

  // Shipped signal files: names unique, all have [default], tag matches name
  const files = readdirSync(join(ROOT, 'signals')).filter((f) => f.endsWith('.md') && f !== 'README.md');
  const seen = new Map();
  for (const f of files) {
    const t = readFileSync(join(ROOT, 'signals', f), 'utf8');
    const head = t.split('---')[1];
    const name = head.match(/^name:\s*(.*)$/m)[1].trim();
    const names = [head.match(/^prefix:\s*(.*)$/m)[1], ...(head.match(/^aliases:\s*(.*)$/m)?.[1].split(',') ?? [])].map((s) => s.trim().toLowerCase());
    for (const n of names) {
      check(`${f}: ${n} claimed by one file only`, !seen.has(n), `also in ${seen.get(n)}`);
      seen.set(n, f);
    }
    check(`${f}: has a [default] block`, /^\[default\]\s*$/m.test(t));
    check(`${f}: every <signal> tag uses name="${name}"`, [...t.matchAll(/<signal name="([^"]*)"/g)].every((m) => m[1] === name));
  }
  check('total names = 54 (10 main + 44 aliases)', seen.size === Object.values(SIGNALS).flat().length, `got ${seen.size}`);
}

// ═══ C. MATCHING ══════════════════════════════════════════════
group('C. Where a signal is recognised');
{
  const { which } = session({ cwd: P0 });
  const cases = [
    // position
    ['start', 'cc-yolo add the login page', 'ship'],
    ['bare signal only', 'cc-yolo', 'ship'],
    ['middle', 'add the login cc-yolo page', 'ship'],
    ['end', 'add the login page cc-yolo', 'ship'],
    ['after newline', 'add the login page\ncc-yolo', 'ship'],
    ['followed by newline', 'cc-yolo\nadd it', 'ship'],
    ['CRLF', 'cc-yolo\r\nadd it', 'ship'],
    ['tab', 'cc-yolo\tadd it', 'ship'],
    ['leading spaces', '   cc-yolo add it', 'ship'],
    ['leading blank lines', '\n\ncc-yolo add it', 'ship'],
    // trailing punctuation
    ['followed by !', 'ship it cc-yolo!', 'ship'],
    ['followed by .', 'ship it cc-yolo.', 'ship'],
    ['followed by ,', 'cc-yolo, ship it', 'ship'],
    ['followed by ?', 'is this right cc-eli5?', 'teach'],
    ['followed by ...', 'hmm cc-sus...', 'audit'],
    ['emoticon + comma', 'nice cc-:), keep going', 'confirm'],
    ['emoticon that ends in ?', 'what is this cc-:?', 'teach'],
    ['emoticon that ends in ) at end', 'great work cc-:)', 'confirm'],
    // last wins
    ['two signals: last wins', 'cc-urgent fix login cc-ship', 'ship'],
    ['three signals: last wins', 'cc-:x cc-deep cc-tldr why', 'precise'],
    ['last is unknown: last KNOWN wins', 'cc-urgent fix cc-typo', 'critical'],
    ['emoticon then word: last wins', 'cc-:( cc-yes', 'confirm'],
    ['same signal twice', 'cc-yolo now cc-yolo', 'ship'],
    // not signals
    ['glued to a word', 'cc-yoloing all day', null],
    ['inside a path', 'edit signals/cc-test.md', null],
    ['file name with extension', 'open cc-test.md now', null],
    ['prefixed by a word char', 'xcc-yolo', null],
    ['in parentheses', '(cc-yolo)', null],
    ['in quotes', '"cc-yolo"', null],
    ['unknown signal only', 'cc-nonsense hi', null],
    ['bare cc-', 'cc- hi', null],
    ['no signal', 'hello world', null],
    ['inline code', 'what does `cc-sos` do', null],
    ['inline code + real signal after', 'what does `cc-sos` do cc-eli5', 'teach'],
    ['real signal + inline code after', 'cc-eli5 what does `cc-sos` do', 'teach'],
    ['fenced block', 'look:\n```\ncc-urgent\n```\nthoughts?', null],
    ['fenced block + real signal', 'cc-sus\n```js\nconst x = "cc-yolo"\n```', 'audit'],
    ['unclosed fence hides the rest', 'cc-sus\n```\ncc-yolo', 'audit'],
    ['tilde fence', '~~~\ncc-urgent\n~~~', null],
    ['unicode around', '日本語 cc-eli5 🙂', 'teach'],
  ];
  for (const [name, p, want] of cases) { const got = which(p); check(`${name}: ${JSON.stringify(p)} -> ${want}`, got === want, `got ${got}`); }
  const big = `${'log line '.repeat(200000)}cc-urgent`;
  check('signal at the end of a 1.8 MB prompt', which(big) === 'critical');
}

// ═══ D. BAD INPUT ═════════════════════════════════════════════
group('D. Bad input never errors');
{
  const inputs = [['empty stdin', ''], ['invalid JSON', '{nope'], ['JSON null', 'null'], ['JSON array', '[]'], ['JSON string', '"cc-yolo"'],
    ['number', '42'], ['prompt is a number', { prompt: 5 }], ['prompt missing', {}], ['session_id is an object', { session_id: { a: 1 }, prompt: 'cc-yolo' }],
    ['cwd is a number', { cwd: 5, prompt: 'cc-test' }], ['model is a number', { session_id: 'm', model: 5 }]];
  for (const script of ['session-start.mjs', 'detect-signal.mjs', 'session-end.mjs']) {
    for (const [n, inp] of inputs) {
      const r = run(script, inp);
      check(`${script}: ${n} -> exit 0, no stderr`, r.code === 0 && r.err === '', `code=${r.code} err=${r.err.slice(0, 160)}`);
    }
  }
  const noSig = plugin({}, { noSignalsDir: true });
  const r = run('detect-signal.mjs', { prompt: 'cc-yolo' }, { root: noSig });
  check('signals/ folder missing -> exit 0, silent', r.code === 0 && r.out === '' && r.err === '');
  const broken = plugin(); rmSync(join(broken, 'hooks', 'scripts', 'lib'), { recursive: true });
  for (const script of ['session-start.mjs', 'detect-signal.mjs', 'session-end.mjs']) {
    const b = run(script, { session_id: 'broken', model: 'x', prompt: 'cc-yolo' }, { root: broken });
    check(`broken install (lib/ missing): ${script} exits 0 silently`, b.code === 0 && b.out === '' && b.err === '', `code=${b.code} err=${b.err.slice(0, 160)}`);
  }
  const corrupt = 'corrupt'; writeFileSync(stateFile(corrupt), '{bad json');
  const r2 = run('detect-signal.mjs', { session_id: corrupt, prompt: 'cc-deep' });
  check('corrupt state file -> still injects [default]', nameOf(ctxOf(r2.out)) === 'thinking' && r2.err === '');
  mkdirSync(stateFile('isdir'));
  const r3 = run('session-start.mjs', { session_id: 'isdir', model: 'claude-opus-5-5' });
  check('state path unwritable -> exit 0, silent', r3.code === 0 && r3.err === '');
  const r4 = run('detect-signal.mjs', { session_id: 'isdir', prompt: 'cc-deep' });
  check('state path unreadable -> still injects [default]', nameOf(ctxOf(r4.out)) === 'thinking');
}

// ═══ E. SESSION ID ════════════════════════════════════════════
group('E. Session id safety');
{
  const before = new Set(readdirSync(TMP));
  run('session-start.mjs', { model: 'claude-opus-5-5' });
  check('missing session_id writes no shared file', readdirSync(TMP).every((f) => before.has(f)));
  check('missing session_id still injects [default]', nameOf(ctxOf(run('detect-signal.mjs', { prompt: 'cc-yolo' }).out)) === 'ship');
  mkdirSync(join(SANDBOX, 'escaped'));
  for (const sid of ['../escaped/pwn', '..\\escaped\\pwn', '/abs/pwn', 'a b', 'x'.repeat(129), '', 'ok/../../pwn']) {
    run('session-start.mjs', { session_id: sid, model: 'claude-opus-5-5' });
    check(`unsafe id ${JSON.stringify(sid.slice(0, 20))} writes nothing`, readdirSync(join(SANDBOX, 'escaped')).length === 0 && readdirSync(TMP).every((f) => before.has(f) || !f.includes('pwn')));
  }
  run('session-start.mjs', { session_id: '0b5e2f4a-1c2d-4e5f-8a9b-0c1d2e3f4a5b', model: 'claude-opus-5-5' });
  check('real UUID session id accepted', existsSync(stateFile('0b5e2f4a-1c2d-4e5f-8a9b-0c1d2e3f4a5b')));
  run('session-end.mjs', { session_id: '../escaped' });
  check('session-end with unsafe id deletes nothing', existsSync(join(SANDBOX, 'escaped')));
}

// ═══ F. MODEL ═════════════════════════════════════════════════
group('F. Model variant');
{
  const variant = (model) => {
    const c = session({ model, cwd: P0 }).detect('cc-deep x') ?? '';
    if (c.includes('ultrathink')) return 'opus';
    if (c.includes('two most important tradeoffs')) return 'haiku';
    if (c.includes('Challenge assumptions in the prompt')) return 'sonnet';
    return 'default';
  };
  const cases = [['claude-opus-5-5', 'opus'], ['claude-opus-4-8', 'opus'], ['claude-opus-4-8[1m]', 'opus'], ['claude-sonnet-5-5', 'sonnet'],
    ['us.anthropic.claude-sonnet-5-5-v1:0', 'sonnet'], ['claude-haiku-4-5-20251001', 'haiku'], ['opus', 'opus'], ['Claude Opus 5.5', 'opus'],
    ['CLAUDE-HAIKU-4-5', 'haiku'], [{ id: 'claude-opus-5-5', display_name: 'Opus 5.5' }, 'opus'], [{ display_name: 'Sonnet 5.5' }, 'sonnet'],
    ['claude-fable-5-1', 'default'], [undefined, 'default'], ['', 'default'], [null, 'default']];
  for (const [m, want] of cases) { const got = variant(m); check(`${JSON.stringify(m)} -> ${want}`, got === want, `got ${got}`); }
  check('haiku: cc-:~ resolves to exactly one <signal>', (() => { const c = session({ model: 'claude-haiku-4-5' }).detect('cc-:~ x'); return (c.match(/<signal /g) || []).length === 1 && !c.includes('ultrathink'); })());
  check('signals without variants use [default] on every model', ['claude-opus-5-5', 'claude-haiku-4-5', 'claude-sonnet-5-5'].every((m) => session({ model: m }).detect('cc-urgent x').includes('Critical and urgent')));
}

// ═══ G. PROJECT AWARENESS ═════════════════════════════════════
group('G. Project awareness');
{
  const ctx = (cwd, p) => session({ cwd }).detect(p) ?? "";
  const hasMd = (cwd) => ctx(cwd, 'cc-audit x').includes('Check against conventions');
  check('no CLAUDE.md -> addition dropped', !hasMd(project()));
  check('CLAUDE.md in cwd -> addition in audit', hasMd(project({ 'CLAUDE.md': '#' })));
  check('CLAUDE.md -> addition in teach', ctx(project({ 'CLAUDE.md': '#' }), 'cc-eli5 x').includes("own stack"));
  check('CLAUDE.md -> addition in test', ctx(project({ 'CLAUDE.md': '#' }), 'cc-tdd x').includes('Align test structure'));
  check('.claude/CLAUDE.md detected', hasMd(project({ '.claude/CLAUDE.md': '#' })));
  check('CLAUDE.local.md detected', hasMd(project({ 'CLAUDE.local.md': '#' })));
  const repo = project({ 'CLAUDE.md': '#', 'package.json': '{}', '.git/HEAD': 'ref' });
  const sub = join(repo, 'packages', 'api', 'src'); mkdirSync(sub, { recursive: true });
  check('subfolder of a repo finds root CLAUDE.md', hasMd(sub));
  check('subfolder of a Node repo gets Jest/Vitest guidance', ctx(sub, 'cc-test x').includes('Jest'));
  const mono = project({ '.git/HEAD': 'ref', 'package.json': '{}', 'svc/go.mod': '' });
  check('nearest manifest wins (Go service inside a Node monorepo)', ctx(join(mono, 'svc'), 'cc-test x').includes('Go testing'));
  const plainDir = project({ 'CLAUDE.md': '#', 'package.json': '{}' }, { git: false });
  const plainSub = join(plainDir, 'a', 'b'); mkdirSync(plainSub, { recursive: true });
  check('not a git repo: walks up to find CLAUDE.md', hasMd(plainSub));
  check('not a git repo: walks up to find package.json', ctx(plainSub, 'cc-test x').includes('Jest'));
  const outer = project({ 'CLAUDE.md': '#', 'inner/.git/HEAD': 'ref' });
  check('stops at the git root (CLAUDE.md above the repo is ignored)', !hasMd(join(outer, 'inner')));
  mkdirSync(join(HOME, '.claude'), { recursive: true }); writeFileSync(join(HOME, '.claude', 'CLAUDE.md'), '# user memory');
  const homeProj = join(HOME, 'code', 'app'); mkdirSync(homeProj, { recursive: true });
  check('~/.claude/CLAUDE.md (user memory) is not project instructions', !hasMd(homeProj));
  for (const [f, w] of [['package.json', 'Jest'], ['requirements.txt', 'pytest'], ['pyproject.toml', 'pytest'], ['setup.py', 'pytest'], ['setup.cfg', 'pytest'],
    ['Pipfile', 'pytest'], ['go.mod', 'Go testing'], ['Cargo.toml', 'Rust built-in'], ['pom.xml', 'JUnit'], ['build.gradle', 'JUnit'], ['build.gradle.kts', 'JUnit']]) {
    check(`${f} -> ${w}`, ctx(project({ [f]: '' }), 'cc-test x').includes(w));
  }
  check('package.json + pyproject.toml -> nodejs (documented precedence)', ctx(project({ 'package.json': '{}', 'pyproject.toml': '' }), 'cc-test x').includes('Jest'));
  check('unknown project -> generic guidance', ctx(project(), 'cc-test x').includes("appropriate for this project's testing framework"));
  check('no cwd in payload -> generic guidance, no crash', session().detect('cc-test x').includes("appropriate for this project's testing framework"));
  check('cwd that does not exist -> generic, no crash', ctx(join(SANDBOX, 'nope', 'gone'), 'cc-test x').includes("appropriate for this project's testing framework"));
}

// ═══ H. SIGNAL FILE PARSING ═══════════════════════════════════
group('H. Signal file parsing (custom signals)');
{
  const resolveWith = (files, prompt, { model = 'claude-sonnet-5-5', cwd = P0 } = {}) => session({ root: plugin(files), model, cwd }).detect(prompt);
  const z = (head, body) => ({ 'zz.md': sigFile(head, body) });
  const basic = 'prefix: cc-zed\nname: zed\nenabled: true';
  check('custom signal works with no code change', resolveWith(z(basic, '[default]\n<s>Z</s>'), 'cc-zed') === '<s>Z</s>');
  check('CRLF file', resolveWith({ 'zz.md': sigFile(basic, '[default]\n<s>Z</s>').replace(/\n/g, '\r\n') }, 'cc-zed') === '<s>Z</s>');
  check('UTF-8 BOM', resolveWith({ 'zz.md': `﻿${sigFile(basic, '[default]\n<s>Z</s>')}` }, 'cc-zed') === '<s>Z</s>');
  check('no blocks -> whole body', resolveWith(z(basic, '<s>BODY</s>'), 'cc-zed') === '<s>BODY</s>');
  check('quoted values', resolveWith(z('prefix: "cc-zed"\naliases: \'cc-zz\'\nname: "zed"', '<s>Q</s>'), 'cc-zz') === '<s>Q</s>');
  check('aliases as [list]', resolveWith(z('prefix: cc-zed\naliases: [cc-z1, "cc-z2"]', '<s>L</s>'), 'cc-z2') === '<s>L</s>');
  check('prefix-less file with only aliases', resolveWith(z('aliases: cc-only', '<s>A</s>'), 'cc-only') === '<s>A</s>');
  check('alias not starting with cc- is ignored', resolveWith(z('prefix: cc-zed\naliases: zed, yolo2', '<s>x</s>'), 'cc-yolo2 hi') === null);
  check('alias containing a space is ignored', resolveWith(z('prefix: cc-zed\naliases: cc-two words', '<s>x</s>'), 'cc-two words') === null);
  for (const v of ['false', 'False', 'FALSE', 'no', 'off', '0', '"false"']) {
    check(`enabled: ${v} disables every name`, resolveWith(z(`prefix: cc-zed\naliases: cc-z1\nenabled: ${v}`, '<s>x</s>'), 'cc-z1') === null);
  }
  check('enabled missing -> enabled', resolveWith(z('prefix: cc-zed', '<s>x</s>'), 'cc-zed') === '<s>x</s>');
  check('disabling a built-in removes all its names', (() => {
    const root = plugin(); const f = join(root, 'signals', 'cc-ship.md');
    writeFileSync(f, readFileSync(f, 'utf8').replace('enabled: true', 'enabled: false'));
    const s = session({ root });
    return s.which('cc-yolo') === null && s.which('cc-:D') === null && s.which('cc-urgent') === 'critical';
  })());
  check('"[default] " with trailing space is still a block', resolveWith(z(basic, '[default] \n<s>DEF</s>\n\n[opus]\n<s>OPUS</s>'), 'cc-zed', { model: 'claude-haiku-4-5' }) === '<s>DEF</s>');
  check('content line starting with "[" is kept', resolveWith(z(basic, '[default]\n<s>\none\n[IMPORTANT] two\nthree\n</s>'), 'cc-zed') === '<s> one [IMPORTANT] two three </s>');
  check('unknown [block] name is content', resolveWith(z(basic, '[default]\n<s>a\n[fable]\nb</s>'), 'cc-zed') === '<s>a [fable] b</s>');
  check('"---" inside the body is content', resolveWith(z(basic, '[default]\n<s>a\n---\nb</s>'), 'cc-zed') === '<s>a --- b</s>');
  check('"prefix:" in the body is not a name', resolveWith(z('name: zed', '[default]\nprefix: cc-fake\n<s>x</s>'), 'cc-fake') === null);
  check('file without frontmatter is ignored', resolveWith({ 'zz.md': 'prefix: cc-zed\n<s>x</s>' }, 'cc-zed') === null);
  check('empty [default] and no body -> no injection', resolveWith(z(basic, '[default]\n\n'), 'cc-zed') === null);
  check('only [opus] block on sonnet -> no injection (no wrong variant)', resolveWith(z(basic, '[opus]\n<s>O</s>'), 'cc-zed') === null);
  check('whitespace collapsed', resolveWith(z(basic, '<s>a\t\t  b\n\n c</s>'), 'cc-zed') === '<s>a b c</s>');
  check('duplicate name: earlier file keeps it, later file still gets its other names', (() => {
    const s = session({ root: plugin({ 'zz.md': sigFile('prefix: cc-yolo\naliases: cc-mine', '<s>MINE</s>') }) });
    return s.which('cc-yolo') === 'ship' && s.detect('cc-mine') === '<s>MINE</s>';
  })());
  const cmd = project({ 'CLAUDE.md': '#' });
  check('CLAUDEMD_ADDITION in a custom signal, CLAUDE.md present', resolveWith(z(basic, '<s>\nCLAUDEMD_ADDITION: Follow house rules.\n</s>'), 'cc-zed', { cwd: cmd }) === '<s> Follow house rules. </s>');
  check('CLAUDEMD_ADDITION in a custom signal, no CLAUDE.md', resolveWith(z(basic, '<s>\nCLAUDEMD_ADDITION: Follow house rules.\nkeep\n</s>'), 'cc-zed') === '<s> keep </s>');
  check('edited marker text in a built-in signal never leaks', (() => {
    const root = plugin(); const f = join(root, 'signals', 'cc-audit.md');
    writeFileSync(f, readFileSync(f, 'utf8').replace(/CLAUDEMD_ADDITION: .*/, 'CLAUDEMD_ADDITION: Use our lint rules.'));
    const c = session({ root, cwd: cmd }).detect('cc-audit');
    return c.includes('Use our lint rules.') && !c.includes('CLAUDEMD_ADDITION');
  })());
  check('PROJECT_TYPE_ADDITION in a custom signal', resolveWith(z(basic, '<s>PROJECT_TYPE_ADDITION</s>'), 'cc-zed', { cwd: project({ 'go.mod': '' }) }).includes('Go testing'));
  check('edits apply on the next prompt (no /clear)', (() => {
    const root = plugin(z(basic, '<s>v1</s>')); const s = session({ root });
    const a = s.detect('cc-zed'); writeFileSync(join(root, 'signals', 'zz.md'), sigFile(basic, '<s>v2</s>'));
    return a === '<s>v1</s>' && s.detect('cc-zed') === '<s>v2</s>';
  })());
  check('empty signals folder -> silent', session({ root: plugin({}, { empty: true }) }).detect('cc-yolo') === null);
  check('signals/README.md is never parsed as a signal', (() => {
    const root = plugin({ 'README.md': sigFile('prefix: cc-readme', '<s>R</s>') });
    return session({ root }).detect('cc-readme') === null;
  })());
}

// ═══ I. STALE FILE SWEEP ══════════════════════════════════════
group('I. Stale temp file cleanup');
{
  const old = Date.now() / 1000 - 8 * 86400;
  const mk = (name) => { const f = join(TMP, name); writeFileSync(f, '{}'); utimesSync(f, old, old); return f; };
  const v1 = mk('cc-mood-prompt-0b5e2f4a-old-v1-cache.json');
  const v11 = mk('cc-mood-prompt-session-old.json');
  const foreign = mk('someone-else.json');
  const fresh = join(TMP, 'cc-mood-prompt-session-fresh.json'); writeFileSync(fresh, '{}');
  const live = 'longlived'; run('session-start.mjs', { session_id: live, model: 'claude-opus-5-5' }); utimesSync(stateFile(live), old, old);
  run('session-start.mjs', { session_id: live, source: 'resume' });
  check('v1.0 leftover cache (>7 days) removed', !existsSync(v1));
  check('stale v1.1 state file (>7 days) removed', !existsSync(v11));
  check('recent state file kept', existsSync(fresh));
  check('other apps\' temp files untouched', existsSync(foreign));
  check('resume refreshes a long-lived session instead of sweeping it', existsSync(stateFile(live)) && statSync(stateFile(live)).mtimeMs > Date.now() - 60000 && readFileSync(stateFile(live), 'utf8').includes('opus'));
}

// ═══ J. SPEED ═════════════════════════════════════════════════
group('J. Speed (median of 9 runs vs bare node)');
{
  const time = (args, input) => {
    const ms = [];
    for (let i = 0; i < 9; i++) { const t = performance.now(); spawnSync(process.execPath, args, { input, env: { ...process.env, TEMP: TMP, TMP } }); ms.push(performance.now() - t); }
    return ms.sort((a, b) => a - b)[4];
  };
  const bare = time(['-e', ''], '');
  const plain = time([join(ROOT, 'hooks', 'scripts', 'detect-signal.mjs')], JSON.stringify({ prompt: 'refactor the auth module please' }));
  const hit = time([join(ROOT, 'hooks', 'scripts', 'detect-signal.mjs')], JSON.stringify({ prompt: 'cc-test add coverage', cwd: P0 }));
  const info = `bare ${bare.toFixed(0)}ms, normal prompt ${plain.toFixed(0)}ms, signal prompt ${hit.toFixed(0)}ms`;
  check(`normal prompt adds < 25 ms over bare node (${info})`, plain - bare < 25, info);
  check(`signal prompt adds < 40 ms over bare node (${info})`, hit - bare < 40, info);
  console.log(`  speed: ${info}`);
}

// ═══ K. DOCS ══════════════════════════════════════════════════
group('K. Docs and packaging');
{
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
  const sreadme = readFileSync(join(ROOT, 'signals', 'README.md'), 'utf8');
  for (const [sig, names] of Object.entries(SIGNALS)) {
    check(`README documents ${sig}: all ${names.length} names`, names.every((n) => readme.includes(n.replace('|', '\\|'))));
  }
  check('README does not claim the prefix is stripped', !/strips? (it|the prefix)/i.test(readme));
  check('README does not mention a signal cache', !/cache/i.test(readme));
  check('signals/README.md has no session-start.sh reference', !sreadme.includes('session-start.sh'));
  check('signals/README.md documents aliases', /aliases:/.test(sreadme));
  const version = JSON.parse(readFileSync(join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8')).version;
  check(`CHANGELOG has an entry for ${version}`, readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8').includes(`## ${version}`));
  check('PRIVACY.md does not describe the old signal cache', !/cache of pre-resolved/i.test(readFileSync(join(ROOT, 'PRIVACY.md'), 'utf8')));
  const hooks = JSON.parse(readFileSync(join(ROOT, 'hooks', 'hooks.json'), 'utf8')).hooks;
  check('hooks.json wires SessionStart, UserPromptSubmit, SessionEnd', ['SessionStart', 'UserPromptSubmit', 'SessionEnd'].every((e) => hooks[e]?.[0]?.hooks?.[0]?.command?.includes('${CLAUDE_PLUGIN_ROOT}')));
}

// ─── REPORT ───────────────────────────────────────────────────
rmSync(SANDBOX, { recursive: true, force: true });
console.log(`\n${pass} passed, ${failures.length} failed`);
for (const f of failures) console.log(`  FAIL ${f}`);
process.exit(failures.length ? 1 : 0);
