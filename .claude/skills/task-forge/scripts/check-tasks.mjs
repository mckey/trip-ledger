#!/usr/bin/env node
// task-forge gate checker: 8 структурних гейтів з лекції 6.7 + мої G9–G13 + перевірки епіку E1–E9.
// Usage: node .claude/skills/task-forge/scripts/check-tasks.mjs <slug> [--story <ID>] [--json] [--emit] [--check]
//   --story <ID>  лише одна story (епічні перевірки пропускаються)
//   --emit        спершу згенерувати tasks.json з frontmatter, потім перевірити
//   --check       явний режим «лише перевірка» (те саме, що без прапорців)
// Exit 0 — усе зелене; 1 — є провалені гейти; 2 — помилка запуску.
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';

const USAGE = 'usage: check-tasks.mjs <slug> [--story <ID>] [--json] [--emit] [--check]';
const FLAGS = new Set(['--story', '--json', '--emit', '--check']);
const argv = process.argv.slice(2);
let slug = null;
let onlyStory = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    if (!FLAGS.has(a)) {
      console.error(`unknown flag ${a}\n${USAGE}`);
      process.exit(2);
    }
    if (a === '--story') {
      onlyStory = argv[++i];
      if (!onlyStory || onlyStory.startsWith('--')) {
        console.error(`--story needs an ID\n${USAGE}`);
        process.exit(2);
      }
    }
  } else if (!slug) slug = a;
  else {
    console.error(`unexpected argument ${a}\n${USAGE}`);
    process.exit(2);
  }
}
const asJson = argv.includes('--json');
if (!slug) {
  console.error(USAGE);
  process.exit(2);
}

const root = process.cwd();
const featureDir = join(root, 'docs', 'features', slug);
const tasksDir = join(featureDir, 'tasks');
if (!existsSync(tasksDir)) {
  console.error(`no ${tasksDir}`);
  process.exit(2);
}

const MAX_TOKENS = 5000;
// Лекція: ~4500 токенів ≈ 20 KB — це про латиницю. Для кирилиці рахуємо щільніше:
// ASCII — 4 символи на токен, решта — 2.
const estimateTokens = (text) => {
  let ascii = 0;
  let other = 0;
  for (const ch of text) (ch.codePointAt(0) < 128 ? ascii++ : other++);
  return Math.ceil(ascii / 4 + other / 2);
};
const REQUIRED = [
  'id', 'title', 'epic', 'project', 'bc', 'layer', 'wave', 'priority', 'estimate',
  'blocks', 'blocked_by', 'external_blocked_by', 'status', 'owner', 'context_budget',
  'prd_refs', 'sad_refs', 'data_refs', 'openapi_ops', 'adr_refs', 'files', 'created',
];
const ENUMS = {
  bc: ['trips', 'expenses', 'shared', 'http', 'cross'],
  layer: ['migration', 'domain', 'application', 'infrastructure', 'presentation', 'wiring', 'e2e', 'docs'],
  status: ['todo', 'wip', 'done', 'blocked'],
  priority: ['Must', 'Should', 'Could'],
  estimate: ['S', 'M', 'L'],
};
// Префікс ID ↔ bc / layer (SKILL.md «ID з bounded context»)
const PREFIX = {
  SHR: (fm) => fm.bc === 'shared',
  MIG: (fm) => fm.layer === 'migration',
  TRP: (fm) => fm.bc === 'trips',
  EXP: (fm) => fm.bc === 'expenses',
  X: (fm) => fm.bc === 'cross' && fm.layer !== 'migration' && fm.layer !== 'docs',
  HTTP: (fm) => fm.bc === 'http' && ['presentation', 'wiring'].includes(fm.layer),
  E2E: (fm) => fm.layer === 'e2e',
  DOC: (fm) => fm.layer === 'docs',
};
const SECTIONS = ['Місце в послідовності', 'Why', 'Linked artifacts', 'Acceptance criteria', 'Checklist', 'Edge cases', 'Definition of Done'];
const ALLOWED_FENCES = new Set(['text', 'bash', 'sh', 'console']);

// --- tiny frontmatter parser: `key: value`, `key: [a, "b, c"]`; `#`-коментар лише поза лапками ---
function stripComment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '#' && i > 0 && /\s/.test(line[i - 1])) return line.slice(0, i).trimEnd();
  }
  return line;
}
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return { fm: null, body: text };
  const fm = {};
  for (const raw of m[1].split(/\r?\n/)) {
    const kv = stripComment(raw).match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, val] = kv;
    if (val.startsWith('[')) {
      const inner = val.replace(/^\[|\]$/g, '').trim();
      fm[key] = [...inner.matchAll(/"([^"]*)"|'([^']*)'|([^,\s][^,]*)/g)]
        .map((x) => (x[1] ?? x[2] ?? x[3]).trim())
        .filter(Boolean);
    } else {
      fm[key] = unq(val.trim());
    }
  }
  return { fm, body: text.slice(m[0].length) };
}
const unq = (s) => s.replace(/^["']|["']$/g, '');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasToken = (text, tok) => new RegExp(`(?<![\\w-])${esc(tok)}(?![\\w])`).test(text);

// --- GitHub heading slugger: кирилиця лишається, пунктуація геть, пробіл → - ---
function headingText(h) {
  return h
    .replace(/\s+#+\s*$/, '') // closing ATX
    .split(/(`[^`]*`)/)
    .map((part) => (part.startsWith('`') ? part : part.replace(/<[^>]+>/g, '')))
    .join('')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
}
function slugsOf(md) {
  const seen = new Map();
  const out = new Set();
  let fence = null;
  for (const line of md.split(/\r?\n/)) {
    const f = line.match(/^(```|~~~)/);
    if (f) { fence = fence === f[1] ? null : fence ?? f[1]; continue; }
    if (fence) continue;
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (!h) continue;
    const s = headingText(h[1]).trim().toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}\p{Pc}\- ]/gu, '')
      .replace(/ /g, '-');
    const n = seen.get(s) ?? 0;
    seen.set(s, n + 1);
    out.add(n ? `${s}-${n}` : s);
  }
  return out;
}

const cache = new Map();
const read = (p) => {
  if (!cache.has(p)) cache.set(p, existsSync(p) ? readFileSync(p, 'utf8') : null);
  return cache.get(p);
};
const listDir = (d, re) => (existsSync(d) ? readdirSync(d).filter((f) => re.test(f)).map((f) => join(d, f)) : []);

const prd = read(join(featureDir, 'PRD.md')) ?? '';
const sad = read(join(featureDir, 'sad.md')) ?? '';
const openapi = read(join(featureDir, 'contracts', 'openapi.yaml')) ?? '';
const syncReport = read(join(featureDir, 'contracts', 'api-sync-report.md')) ?? '';
const prdAcs = new Set([...prd.matchAll(/^###\s+(AC-[0-9]+[a-z]?)\b/gm)].map((m) => m[1]));
const sad6 = (() => {
  const a = sad.indexOf('\n## 6.');
  const b = sad.indexOf('\n## 7.');
  return a >= 0 ? sad.slice(a, b > a ? b : undefined) : '';
})();
// мітки flows §6: «**Critical flow N:» і «### <heading>» усередині §6
const flowLabels = new Set([
  ...[...sad6.matchAll(/^\*\*(Critical flow \d+)\b/gm)].map((m) => m[1]),
  ...[...sad6.matchAll(/^###\s+(.+)$/gm)].map((m) => m[1].trim()),
]);
const sad6Anchors = new Set(['6-runtime-view', ...slugsOf(sad6.replace(/^## 6\..*$/m, ''))]);
const ops = new Set([...openapi.matchAll(/operationId:\s*([A-Za-z0-9_]+)/g)].map((m) => m[1]));
// components.schemas: ім'я → текст блоку (до наступної схеми або наступної секції components)
const schemaBlocks = (() => {
  const out = new Map();
  const i = openapi.search(/^ {2}schemas:\s*$/m);
  if (i < 0) return out;
  const rest = openapi.slice(i).split(/\r?\n/).slice(1);
  let name = null;
  for (const line of rest) {
    if (/^ {0,2}\S/.test(line)) break; // `  responses:` тощо — кінець schemas
    const m = line.match(/^ {4}([A-Za-z][A-Za-z0-9]+):\s*$/);
    if (m) { name = m[1]; out.set(name, ''); continue; }
    if (name) out.set(name, out.get(name) + line + '\n');
  }
  return out;
})();
const schemas = new Set(schemaBlocks.keys());
// поле — лише ключ рівно на рівні properties + 2 пробіли (не вкладені `type:` / `description:`)
const hasField = (schema, field) => {
  const lines = (schemaBlocks.get(schema) ?? '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const p = lines[i].match(/^(\s+)properties:\s*$/);
    if (!p) continue;
    const ind = p[1].length;
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (!l.trim()) continue;
      const lead = l.match(/^\s*/)[0].length;
      if (lead <= ind) break;
      if (lead === ind + 2 && l.trim().startsWith(`${field}:`)) return true;
    }
  }
  return false;
};
const knownCodes = new Set([...(openapi + '\n' + syncReport).matchAll(/(?<![\w.])((?:trips|expenses|shared|http)\.[a-z_]+)(?![\w.])/g)].map((m) => m[1]));

// --- upstream lines for G10 (inline copy detection) ---
const norm = (l) => l.replace(/^[\s>*|-]+/, '').replace(/\s+/g, ' ').trim();
const upstreamTexts = [
  'PRD.md', 'sad.md', 'data-model.md', 'contracts/openapi.yaml', 'contracts/api-sync-report.md', 'CONTEXT.md',
].map((f) => read(join(featureDir, f)))
  .concat(listDir(join(featureDir, 'adr'), /\.md$/).map(read))
  .concat(listDir(join(featureDir, 'migrations'), /\.sql$/).map(read))
  .filter(Boolean);
const upstreamLines = new Set(upstreamTexts.flatMap((t) => t.split(/\r?\n/).map(norm).filter((l) => l.length >= 30)));

// --- load stories ---
const storyFiles = readdirSync(tasksDir).filter((f) => f.endsWith('.md') && !f.startsWith('_') && f !== 'tracker.md');
const stories = storyFiles.map((f) => {
  const text = readFileSync(join(tasksDir, f), 'utf8');
  const { fm, body } = parseFrontmatter(text);
  return { file: f, text, fm: fm ?? {}, body, hasFm: !!fm };
});
const byId = new Map(stories.map((s) => [s.fm.id, s]));
if (onlyStory && !byId.has(onlyStory)) {
  console.error(`no story ${onlyStory} in ${slug}`);
  process.exit(2);
}

function externalIds(extSlug) {
  const j = read(join(root, 'docs', 'features', extSlug, 'tasks', 'tasks.json'));
  if (!j) return null;
  try { return new Set(JSON.parse(j).tasks.map((t) => t.id)); } catch { return null; }
}
function section(body, title) {
  const re = new RegExp(`^## ${esc(title)}[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm');
  return body.match(re)?.[1] ?? '';
}
const isNone = (v) => /^none\b/i.test(v);

function checkLink(fromFile, target) {
  const [p, anchor] = target.split('#');
  if (/^[a-z]+:/i.test(p)) return null;
  const abs = p ? resolve(dirname(fromFile), p) : fromFile;
  if (!existsSync(abs)) return `missing file ${p}`;
  if (anchor && abs.endsWith('.md')) {
    let a;
    try { a = decodeURIComponent(anchor); } catch { return `bad anchor encoding #${anchor}`; }
    if (!slugsOf(read(abs)).has(a)) return `missing anchor #${anchor} in ${p}`;
  }
  return null;
}

function gates(s) {
  const r = [];
  const fm = s.fm;
  const add = (id, ok, msg) => r.push({ gate: id, ok, msg });
  const abs = join(tasksDir, s.file);
  const prdRefs = fm.prd_refs ?? [];

  // G1 sequence: кожен sad_refs — точна мітка flow з §6; ≥ 1 лінк на якір §6
  const sadRefs = fm.sad_refs ?? [];
  const badFlows = sadRefs.filter((f) => !flowLabels.has(f));
  const sadLinks = [...s.body.matchAll(/\]\(\.\.\/sad\.md#([^)]+)\)/g)].map((m) => m[1]);
  const sad6Links = sadLinks.filter((a) => sad6Anchors.has(a));
  add('G1 sequence', sadRefs.length > 0 && !badFlows.length && sad6Links.length > 0,
    !sadRefs.length ? 'sad_refs empty' : badFlows.length ? `not a §6 flow label: ${badFlows.join('; ')}` : !sad6Links.length ? 'no link to a §6 anchor of ../sad.md' : 'ok');

  // G2 data delta
  const dr = fm.data_refs ?? [];
  const badData = dr.filter((d) => !isNone(d) && checkLink(abs, d.startsWith('../') ? d : `../${d}`));
  add('G2 data delta', dr.length > 0 && !badData.length,
    !dr.length ? 'data_refs empty (use "none: <reason>")' : badData.length ? `unresolved: ${badData.join(', ')}` : 'ok');

  // G3 API ref (operationId, не YAML)
  const oo = fm.openapi_ops ?? [];
  const badOps = oo.filter((o) => !isNone(o) && !ops.has(o));
  add('G3 API ref', oo.length > 0 && !badOps.length,
    !oo.length ? 'openapi_ops empty (use "none: <reason>")' : badOps.length ? `unknown operationId: ${badOps.join(', ')}` : 'ok');

  // G4 ≥ 2 AC у GWT; AC-id у рядку ∈ prd_refs; prd_refs ∈ PRD §5
  const gwt = section(s.body, 'Acceptance criteria').split(/\r?\n/)
    .filter((l) => /^- \[[ x]\] \*\*/.test(l) && /\bGiven\b.*\bwhen\b.*\bthen\b/i.test(l));
  const lineAcs = gwt.flatMap((l) => (l.split('**')[1] ?? '').match(/AC-[0-9]+[a-z]?(?![\w-])/g) ?? []);
  const strayAcs = [...new Set(lineAcs.filter((a) => !prdRefs.includes(a)))];
  const withRef = gwt.filter((l) => /AC-[0-9]+[a-z]?(?![\w-])/.test(l.split('**')[1] ?? ''));
  const unknownPrd = prdRefs.filter((a) => !prdAcs.has(a));
  add('G4 AC GWT', withRef.length >= 2 && !strayAcs.length && !unknownPrd.length,
    unknownPrd.length ? `prd_refs not in PRD §5: ${unknownPrd.join(', ')}`
      : strayAcs.length ? `GWT cites AC not in prd_refs: ${strayAcs.join(', ')}` : `${withRef.length} GWT with AC ref`);

  // G5 ≥ 3 atomic checklist steps
  const steps = section(s.body, 'Checklist').split(/\r?\n/).filter((l) => /^- \[[ x]\] Step \d+/.test(l));
  add('G5 checklist', steps.length >= 3, `${steps.length} steps`);

  // G6 context budget
  const tokens = estimateTokens(s.text);
  const declared = Number(String(fm.context_budget ?? '').replace(/[^0-9]/g, ''));
  add('G6 budget', tokens <= MAX_TOKENS && declared > 0 && declared <= MAX_TOKENS && declared >= tokens,
    `~${tokens} tokens (declared ${fm.context_budget ?? '—'})`);

  // G7 graph: id існують, симетрія, хвиля = 1 + max(блокерів), зовнішні id резолвляться
  const g7 = [];
  for (const b of fm.blocked_by ?? []) {
    const d = byId.get(b);
    if (!d) g7.push(`blocked_by ${b} not in epic`);
    else if (!(d.fm.blocks ?? []).includes(fm.id)) g7.push(`${b}.blocks lacks ${fm.id}`);
  }
  for (const b of fm.blocks ?? []) {
    const d = byId.get(b);
    if (!d) g7.push(`blocks ${b} not in epic`);
    else if (!(d.fm.blocked_by ?? []).includes(fm.id)) g7.push(`${b}.blocked_by lacks ${fm.id}`);
  }
  const expectWave = 1 + Math.max(0, ...(fm.blocked_by ?? []).map((b) => Number(byId.get(b)?.fm.wave ?? 0)));
  if (Number(fm.wave) !== expectWave) g7.push(`wave ${fm.wave} ≠ 1 + max(blockers) = ${expectWave}`);
  for (const e of fm.external_blocked_by ?? []) {
    const [es, eid] = e.split(':');
    const ids = es && eid ? externalIds(es) : null;
    if (!ids) g7.push(`external ${e}: no docs/features/${es}/tasks/tasks.json`);
    else if (!ids.has(eid)) g7.push(`external ${e}: id not in ${es}`);
  }
  add('G7 graph', !g7.length, g7.join('; ') || 'ok');

  // G8 complete frontmatter + обов'язкові секції + префікс ID
  const missing = REQUIRED.filter((k) => !(k in fm) || fm[k] === '');
  const badEnum = Object.entries(ENUMS).filter(([k, v]) => k in fm && !v.includes(fm[k])).map(([k]) => `${k}=${fm[k]}`);
  const fileIdOk = s.file.startsWith(`${fm.id}-`);
  const prefix = String(fm.id ?? '').replace(/-\d+$/, '');
  const prefixOk = PREFIX[prefix]?.(fm) ?? false;
  const noSection = SECTIONS.filter((t) => !section(s.body, t).trim());
  const edgeTable = /^\|.+\|/m.test(section(s.body, 'Edge cases'));
  add('G8 frontmatter', s.hasFm && !missing.length && !badEnum.length && fm.epic === slug && fileIdOk && prefixOk && !noSection.length && edgeTable,
    [missing.length && `missing: ${missing.join(', ')}`, badEnum.length && `bad enum: ${badEnum.join(', ')}`,
      fm.epic !== slug && `epic≠${slug}`, !fileIdOk && 'file name ≠ <id>-…', !prefixOk && `prefix ${prefix} ≠ bc/layer`,
      noSection.length && `empty sections: ${noSection.join(', ')}`, !edgeTable && 'Edge cases without table'].filter(Boolean).join('; ') || 'ok');

  // G9 кожен відносний лінк — файл існує і якір є
  const badLinks = [...s.body.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => [m[1], checkLink(abs, m[1])]).filter(([, e]) => e);
  add('G9 links resolve', !badLinks.length, badLinks.map(([l, e]) => `${l}: ${e}`).join('; ') || 'ok');

  // G10 без копій: фенси лише text/bash/sh/console; жодного рядка ≥ 30 символів дослівно з upstream
  const fences = [...s.body.matchAll(/^(?:```|~~~)(\S*)/gm)].map((m) => m[1] || '(untagged)')
    .filter((t, i) => i % 2 === 0 && !ALLOWED_FENCES.has(t));
  const copied = s.body.split(/\r?\n/).map(norm).filter((l) => l.length >= 30 && upstreamLines.has(l));
  add('G10 no inline copy', !fences.length && !copied.length,
    [fences.length && `fences: ${fences.join(',')}`, copied.length && `verbatim: «${copied[0].slice(0, 60)}…»`].filter(Boolean).join('; ') || 'ok');

  // G11 DoD свій: ≥ 1 пункт з AC цієї story або з її файлом (межі слова)
  const dod = section(s.body, 'Definition of Done').split(/\r?\n/).filter((l) => /^- \[[ x]\]/.test(l));
  const ownTokens = [...prdRefs, ...(fm.files ?? []).filter((f) => !f.endsWith('/')).map((f) => basename(f))];
  const specific = dod.filter((l) => ownTokens.some((t) => hasToken(l, t)));
  add('G11 DoD specific', dod.length >= 2 && specific.length >= 1, `${specific.length}/${dod.length} specific`);

  // G12 межа BC: files лише у своєму BC (як dependency-guard)
  const files = fm.files ?? [];
  const src = files.filter((f) => f.startsWith('src/'));
  let out = [];
  if (['trips', 'expenses', 'shared'].includes(fm.bc)) out = src.filter((f) => !f.startsWith(`src/${fm.bc}/`));
  if (fm.bc === 'http') out = src.filter((f) => !/^src\/(\w+\/presentation|presentation|contracts)\//.test(f));
  const crossNoAdr = fm.bc === 'cross' && !(fm.adr_refs ?? []).length;
  add('G12 BC boundary', files.length > 0 && !out.length && !crossNoAdr,
    !files.length ? 'files empty' : out.length ? `outside src/${fm.bc}/: ${out.join(', ')}` : crossNoAdr ? 'bc=cross needs adr_refs' : 'ok');

  // G13 імена з контракту живі: у рядку «🔌 API» кожен `токен` — operationId / схема / Схема.поле / код;
  // будь-який `<bc>.<snake>`-код у тілі — є в openapi або api-sync-report
  const apiLine = section(s.body, 'Linked artifacts').split(/\r?\n/).find((l) => l.includes('🔌 API')) ?? '';
  const apiToks = [...apiLine.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  const badApi = apiToks.filter((t) => {
    if (t.includes('/')) return !existsSync(join(root, t)); // шлях у репо — має існувати
    if (ops.has(t) || schemas.has(t)) return false;
    const [sch, field] = t.split('.');
    if (field && schemas.has(sch)) return !hasField(sch, field);
    return !knownCodes.has(t);
  });
  const codes = [...s.body.matchAll(/`((?:trips|expenses|shared|http)\.[a-z_]+)`/g)].map((m) => m[1])
    .filter((c) => !/\.(ts|js|mjs|md|sql|json|ya?ml)$/.test(c)); // `http.ts` — файл, не код
  const badCodes = [...new Set(codes.filter((c) => !knownCodes.has(c)))];
  add('G13 contract names', !badApi.length && !badCodes.length,
    [badApi.length && `API line: ${badApi.join(', ')}`, badCodes.length && `codes: ${badCodes.join(', ')}`].filter(Boolean).join('; ') || 'ok');

  return { tokens, results: r };
}

const LAYER_MAP = { application: 'app', presentation: 'ports', infrastructure: 'infra', e2e: 'tests' };
function emitTasksJson() {
  const tasks = [...byId.values()]
    .sort((a, b) => Number(a.fm.wave) - Number(b.fm.wave) || a.fm.id.localeCompare(b.fm.id))
    .map(({ fm, body }) => ({
      id: fm.id,
      title: fm.title,
      layer: LAYER_MAP[fm.layer] ?? fm.layer,
      bc: fm.bc,
      wave: Number(fm.wave),
      deps: fm.blocked_by ?? [],
      external_deps: fm.external_blocked_by ?? [],
      acs: fm.prd_refs ?? [],
      dod: section(body, 'Definition of Done').split(/\r?\n/).find((l) => /^- \[[ x]\]/.test(l))?.replace(/^- \[[ x]\]\s*/, '') ?? '',
      files_hint: fm.files ?? [],
    }));
  const p = join(tasksDir, 'tasks.json');
  writeFileSync(p, JSON.stringify({ slug, generated_by: 'task-forge', tasks }, null, 2) + '\n');
  cache.delete(p);
  console.log(`tasks.json: ${tasks.length} tasks`);
}

function epicChecks() {
  const r = [];
  const add = (id, ok, msg) => r.push({ gate: id, ok, msg });
  const same = (a = [], b = []) => [...a].sort().join('|') === [...b].sort().join('|');

  // E1 acyclic
  const state = new Map();
  let cycle = null;
  const visit = (id, path) => {
    if (state.get(id) === 1) { cycle = [...path, id].join(' → '); return; }
    if (state.get(id) === 2 || cycle) return;
    state.set(id, 1);
    for (const d of byId.get(id)?.fm.blocked_by ?? []) visit(d, [...path, id]);
    state.set(id, 2);
  };
  for (const id of byId.keys()) visit(id, []);
  add('E1 acyclic', !cycle, cycle ?? 'ok');

  // E2 / E3 coverage (порожній PRD / openapi — провал, а не «0/0»)
  const covered = new Set(stories.flatMap((s) => s.fm.prd_refs ?? []));
  const orphan = [...prdAcs].filter((a) => !covered.has(a));
  add('E2 AC coverage', prdAcs.size > 0 && !orphan.length,
    !prdAcs.size ? 'no "### AC-…" in PRD.md' : orphan.length ? `uncovered: ${orphan.join(', ')}` : `${prdAcs.size}/${prdAcs.size}`);
  const usedOps = new Set(stories.flatMap((s) => s.fm.openapi_ops ?? []));
  const orphanOps = [...ops].filter((o) => !usedOps.has(o));
  add('E3 op coverage', ops.size > 0 && !orphanOps.length,
    !ops.size ? 'no operationId in contracts/openapi.yaml' : orphanOps.length ? `uncovered: ${orphanOps.join(', ')}` : `${ops.size}/${ops.size}`);

  // E4 tasks.json ⇔ frontmatter
  const tj = read(join(tasksDir, 'tasks.json'));
  const diff = [];
  if (!tj) diff.push('tasks.json missing');
  else {
    const tasks = JSON.parse(tj).tasks;
    for (const t of tasks) {
      const s = byId.get(t.id);
      if (!s) { diff.push(`${t.id} not a story`); continue; }
      const fm = s.fm;
      if (t.title !== fm.title) diff.push(`${t.id}.title`);
      if (t.layer !== (LAYER_MAP[fm.layer] ?? fm.layer)) diff.push(`${t.id}.layer`);
      if (t.bc !== fm.bc) diff.push(`${t.id}.bc`);
      if (!same(t.deps, fm.blocked_by)) diff.push(`${t.id}.deps`);
      if (!same(t.external_deps, fm.external_blocked_by)) diff.push(`${t.id}.external_deps`);
      if (!same(t.acs, fm.prd_refs)) diff.push(`${t.id}.acs`);
      if (!same(t.files_hint, fm.files)) diff.push(`${t.id}.files_hint`);
      if (Number(t.wave) !== Number(fm.wave)) diff.push(`${t.id}.wave`);
    }
    for (const id of byId.keys()) if (!tasks.some((t) => t.id === id)) diff.push(`${id} not in tasks.json`);
  }
  add('E4 tasks.json sync', !diff.length, diff.join(', ') || 'ok');

  // E5 tracker: рядок на story + Wave / Status / Blocked by / External / Estimate = frontmatter
  const tr = read(join(tasksDir, 'tracker.md')) ?? '';
  const rows = new Map();
  for (const line of tr.split(/\r?\n/)) {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    const id = cells[0]?.match(/^\[?([A-Z0-9]+-\d+)\]?/)?.[1];
    if (id && cells.length >= 7) rows.set(id, cells);
  }
  const list = (c) => (c === '—' || c === '-' || !c ? [] : c.split(',').map((x) => x.trim()));
  const tdiff = [];
  for (const [id, s] of byId) {
    const c = rows.get(id);
    if (!c) { tdiff.push(`${id}: no row`); continue; }
    const [, wave, status, , blocked, external, estimate] = c;
    if (Number(wave) !== Number(s.fm.wave)) tdiff.push(`${id}.wave`);
    if (status !== s.fm.status) tdiff.push(`${id}.status`);
    if (!same(list(blocked), s.fm.blocked_by)) tdiff.push(`${id}.blocked_by`);
    if (!same(list(external), s.fm.external_blocked_by)) tdiff.push(`${id}.external`);
    if (estimate !== s.fm.estimate) tdiff.push(`${id}.estimate`);
  }
  add('E5 tracker sync', !!tr && !tdiff.length, !tr ? 'tracker.md missing' : tdiff.join(', ') || 'ok');

  // E6 CONTEXT.md: 5 секцій, 8–10 термінів з NOT
  const ctx = read(join(featureDir, 'CONTEXT.md')) ?? '';
  const need = ['Glossary', 'Invariants', 'Sentinel errors', '(?:Scope|Org)-filter invariant', 'Out of scope'];
  const miss = need.filter((h) => !new RegExp(`^## ${h}`, 'm').test(ctx));
  const terms = (section(ctx, 'Glossary').match(/^- .+ NOT /gm) ?? []).length;
  add('E6 CONTEXT.md', !!ctx && !miss.length && terms >= 8 && terms <= 10,
    !ctx ? 'missing' : [miss.length && `missing: ${miss.join(', ')}`, `${terms} terms with NOT`].filter(Boolean).join('; '));

  // E7 epic + generation files
  const extra = ['_epic.md', '_generation.md'].filter((f) => !existsSync(join(tasksDir, f)));
  add('E7 epic files', !extra.length, extra.join(', ') || 'ok');

  // E8 file lanes: перетин files (директорія — префікс) ⇒ впорядковані через blocked_by
  const reach = (a, b, seen = new Set()) => {
    if (seen.has(a)) return false;
    seen.add(a);
    const deps = byId.get(a)?.fm.blocked_by ?? [];
    return deps.includes(b) || deps.some((d) => reach(d, b, seen));
  };
  const overlap = (x, y) => x === y || (x.endsWith('/') && y.startsWith(x)) || (y.endsWith('/') && x.startsWith(y));
  const lanes = [];
  const all = [...byId.values()];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const [a, b] = [all[i].fm, all[j].fm];
      const shared = (a.files ?? []).filter((f) => (b.files ?? []).some((g) => overlap(f, g)));
      if (shared.length && !reach(a.id, b.id) && !reach(b.id, a.id)) lanes.push(`${a.id}×${b.id}: ${shared.join(', ')}`);
    }
  }
  add('E8 file lanes', !lanes.length, lanes.join('; ') || 'ok');

  // E9 список «ID ◄ A, B» у _epic.md = frontmatter
  const epic = read(join(tasksDir, '_epic.md')) ?? '';
  const drift = [];
  const inGraph = new Set();
  for (const m of epic.matchAll(/([A-Z0-9]+-\d+)\s+◄\s+([A-Z0-9, -]+?\d)(?=\s{2,}|\s*—|\s*$)/gm)) {
    const [, id, deps] = m;
    inGraph.add(id);
    if (!same(deps.split(',').map((d) => d.trim()), byId.get(id)?.fm.blocked_by)) drift.push(`${id}: epic «${deps}»`);
  }
  const unlisted = all.filter((s) => (s.fm.blocked_by ?? []).length && !inGraph.has(s.fm.id)).map((s) => s.fm.id);
  if (unlisted.length) drift.push(`not in epic graph: ${unlisted.join(', ')}`);
  add('E9 epic graph sync', !!epic && !drift.length, drift.join('; ') || 'ok');
  return r;
}

if (argv.includes('--emit')) emitTasksJson();

const report = { slug, stories: {}, epic: onlyStory ? [] : epicChecks() };
let failed = 0;
for (const s of stories) {
  if (onlyStory && s.fm.id !== onlyStory) continue;
  const g = gates(s);
  report.stories[s.fm.id ?? s.file] = g;
  failed += g.results.filter((x) => !x.ok).length;
}
failed += report.epic.filter((x) => !x.ok).length;

if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  for (const [id, g] of Object.entries(report.stories)) {
    const bad = g.results.filter((x) => !x.ok);
    console.log(`${bad.length ? '✗' : '✓'} ${id} (~${g.tokens} tok)${bad.length ? '' : ` — ${g.results.length}/${g.results.length}`}`);
    for (const x of bad) console.log(`    ${x.gate}: ${x.msg}`);
  }
  for (const x of report.epic) console.log(`${x.ok ? '✓' : '✗'} ${x.gate}: ${x.msg}`);
  console.log(failed ? `FAILED: ${failed}` : 'ALL GATES PASSED');
}
process.exit(failed ? 1 : 0);
