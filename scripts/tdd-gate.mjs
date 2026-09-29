#!/usr/bin/env node
// Детерміновані гейти TDD-циклу (урок 7.7). Одна команда = один exit code:
// координатор /tdd не парсить вивід vitest і не склеює `cmd; echo $?` (dontAsk таке ріже).
//
//   node scripts/tdd-gate.mjs preflight <STORY>            чисте дерево, story-файл, baseline, стан для resume
//   node scripts/tdd-gate.mjs red       <STORY>            test(<STORY>) + tsc зелений + vitest червоний лише у тестах цього коміту
//   node scripts/tdd-gate.mjs green     <STORY>            feat(<STORY>) + tsc/vitest зелені + тести не змінені після RED
//   node scripts/tdd-gate.mjs refactor  <STORY>            refactor(<STORY>) або no-op + ті самі перевірки
//   node scripts/tdd-gate.mjs stats     <STORY> [BASE]     рядки тестів / реалізації від BASE (типово — батько test(<STORY>)) до HEAD
//
// Тестовий контракт = src/**/*.test.ts і src/**/testing/** (тести колоковані з кодом).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';

const TEST_PATHSPEC = [':(glob)src/**/*.test.ts', ':(glob)src/**/testing/**'];
const [phase, story, base] = process.argv.slice(2);

const root = run('git', ['rev-parse', '--show-toplevel']).out.trim();
process.chdir(root);

function run(cmd, args, opts = {}) {
  // shell лише для npx/tsc.cmd на Windows: інакше cmd.exe склеює аргументи без екранування (pathspec :(glob)…).
  const shell = process.platform === 'win32' && cmd !== 'git';
  const r = shell
    ? spawnSync([cmd, ...args].join(' '), { encoding: 'utf8', shell: true, ...opts })
    : spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return { code: r.status ?? 1, out: (r.stdout ?? '') + (r.stderr ?? '') };
}
function git(...args) {
  return run('git', args).out.trim();
}
function fail(msg) {
  console.log(`GATE FAIL [${phase} ${story}]: ${msg}`);
  process.exit(1);
}
function pass(msg) {
  console.log(`GATE PASS [${phase} ${story}]: ${msg}`);
  process.exit(0);
}
function storyFile(id) {
  const features = join(root, 'docs', 'features');
  for (const f of readdirSync(features)) {
    const dir = join(features, f, 'tasks');
    if (!existsSync(dir)) continue;
    const hit = readdirSync(dir).find((n) => n.startsWith(`${id}-`) && n.endsWith('.md'));
    if (hit) return relative(root, join(dir, hit)).split(sep).join('/');
  }
  return null;
}
function subject() {
  return git('log', '-1', '--pretty=%s');
}
function treeClean() {
  return git('status', '--porcelain') === '';
}
function redSha(id) {
  const line = git('log', '--format=%H %s', '-n', '50')
    .split('\n')
    .find((l) => l.slice(41).startsWith(`test(${id})`));
  return line ? line.slice(0, 40) : null;
}
function tsc() {
  return run(join('node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc'), ['--noEmit']);
}
function vitest() {
  const out = join(mkdtempSync(join(tmpdir(), 'tdd-gate-')), 'vitest.json');
  const r = run('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${out}`]);
  if (!existsSync(out)) return { code: r.code, failed: [], passed: 0, raw: r.out };
  const json = JSON.parse(readFileSync(out, 'utf8'));
  const failed = [];
  let passed = 0;
  for (const file of json.testResults) {
    const rel = relative(root, file.name).split(sep).join('/');
    if (file.assertionResults.length === 0 && file.status === 'failed') failed.push({ file: rel, title: '(файл не завантажився)' });
    for (const a of file.assertionResults) {
      if (a.status === 'passed') passed++;
      else if (a.status === 'failed') failed.push({ file: rel, title: a.fullName ?? a.title });
    }
  }
  return { code: r.code, failed, passed, raw: r.out };
}
function testsChangedSince(sha) {
  return git('diff', '--name-only', sha, 'HEAD', '--', ...TEST_PATHSPEC);
}
function numstat(from, pathspec) {
  const rows = git('diff', '--numstat', from, 'HEAD', '--', ...pathspec).split('\n').filter(Boolean);
  return rows.reduce((sum, r) => sum + (Number(r.split('\t')[0]) || 0), 0);
}

if (!phase || !story) fail('usage: tdd-gate.mjs <preflight|red|green|refactor|stats> <STORY> [BASE]');
const sf = storyFile(story);
if (!sf) fail(`story-файл docs/features/*/tasks/${story}-*.md не знайдено`);

switch (phase) {
  case 'preflight': {
    if (!treeClean()) fail('робоче дерево не чисте — закоміть або сховай зміни перед /tdd');
    const s = subject();
    const resume = s.startsWith(`test(${story})`) ? 'GREEN' : 'RED';
    console.log(`STORY_FILE: ${sf}`);
    console.log(`BASELINE: ${git('rev-parse', 'HEAD')}`);
    console.log(`RESUME_FROM: ${resume}`);
    pass(resume === 'GREEN' ? 'останній коміт — RED цієї story, продовжуємо з GREEN' : 'старт з RED');
  }
  case 'red': {
    const s = subject();
    if (!s.startsWith(`test(${story})`)) fail(`тема коміту не починається з test(${story}): "${s}"`);
    if (!treeClean()) fail('після RED-коміту лишились незакомічені зміни');
    const t = tsc();
    if (t.code !== 0) fail(`tsc червоний — тести або заглушки не компілюються (це помилка підготовки, не RED):\n${t.out.slice(0, 1500)}`);
    const v = vitest();
    if (v.code === 0) fail('vitest зелений після RED — тести не перевіряють нову поведінку');
    const touched = new Set(git('diff', '--name-only', 'HEAD~1', 'HEAD').split('\n'));
    const foreign = v.failed.filter((f) => !touched.has(f.file));
    if (foreign.length) fail(`падають тести поза RED-комітом (зламано наявну поведінку):\n${foreign.map((f) => `  ${f.file} :: ${f.title}`).join('\n')}`);
    const unloaded = v.failed.filter((f) => f.title === '(файл не завантажився)');
    if (unloaded.length) fail(`тестовий файл не завантажився (помилка підготовки):\n${unloaded.map((f) => `  ${f.file}`).join('\n')}`);
    console.log(v.failed.map((f) => `  RED  ${f.file} :: ${f.title}`).join('\n'));
    pass(`${v.failed.length} червоних, ${v.passed} зелених; тести +${numstat('HEAD~1', TEST_PATHSPEC)} рядків`);
  }
  case 'green':
  case 'refactor': {
    const red = redSha(story);
    if (!red) fail(`у історії немає коміту test(${story}) — GREEN без зафіксованого RED`);
    const s = subject();
    const noop = phase === 'refactor' && s.startsWith(`feat(${story})`);
    const want = phase === 'green' ? `feat(${story})` : `refactor(${story})`;
    if (!noop && !s.startsWith(want)) fail(`тема коміту не починається з ${want}: "${s}"`);
    if (!treeClean()) fail('лишились незакомічені зміни');
    const changed = testsChangedSince(red);
    if (changed) fail(`тестовий контракт змінено після RED ${red.slice(0, 7)}:\n${changed}`);
    const t = tsc();
    if (t.code !== 0) fail(`tsc червоний:\n${t.out.slice(0, 1500)}`);
    const v = vitest();
    if (v.code !== 0) fail(`vitest червоний:\n${v.failed.map((f) => `  ${f.file} :: ${f.title}`).join('\n')}`);
    pass(`${noop ? 'REFACTOR no-op (коміту немає), ' : ''}${v.passed} зелених; тести не змінені з ${red.slice(0, 7)}`);
  }
  case 'stats': {
    // Не baseline pre-flight: при resume після --review-tests він уже дорівнює RED і ховає тести.
    const red = redSha(story);
    const from = base ?? (red ? `${red}~1` : null);
    if (!from) fail(`немає test(${story}) в історії і BASE не передано`);
    const tests = numstat(from, TEST_PATHSPEC);
    const impl = numstat(from, [':(glob)src/**/*.ts', ...TEST_PATHSPEC.map((p) => p.replace(':(glob)', ':(exclude,glob)'))]);
    console.log(`TESTS_ADDED: ${tests}`);
    console.log(`IMPL_ADDED: ${impl}`);
    console.log(`RATIO: ${impl ? (tests / impl).toFixed(2) : 'n/a'}`);
    process.exit(0);
  }
  default:
    fail(`невідома фаза ${phase}`);
}
