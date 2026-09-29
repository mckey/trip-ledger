// Mermaid-gate без mermaid-cli (Chromium не потрібен).
//   node .claude/skills/schema-forge/templates/mmd-extract.mjs docs/features/<slug>/sad.md [more.md…] > check.js
// Далі вміст check.js виконати в DevTools будь-якої https-сторінки (або через javascript-tool агента):
// він імпортує mermaid@11 з jsDelivr, робить mermaid.parse() кожного блоку і повертає рядок OK/FAIL по блоках.
import { readFileSync } from 'node:fs';

const blocks = [];
for (const file of process.argv.slice(2)) {
  const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  // Огорожа може бути з відступом (блок усередині пункту списку) — такий блок теж має пройти gate.
  const re = /^([ \t]*)```mermaid[ \t]*\n([\s\S]*?)^[ \t]*```/gm;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    const indent = m[1].length;
    const src = m[2].split('\n').map((l) => l.slice(Math.min(indent, l.length - l.trimStart().length))).join('\n');
    const line = text.slice(0, m.index).split('\n').length;
    blocks.push({ file, i: i++, line, src });
  }
  const fences = (text.match(/^[ \t]*```mermaid/gm) || []).length; // лише огорожі на початку рядка, не згадки в тексті
  if (fences !== i) {
    console.error(`${file}: ${fences} \`\`\`mermaid fences, extracted ${i} — check the unmatched ones by hand`);
    process.exitCode = 1;
  }
  console.error(`${file}: ${i} mermaid block(s)`);
}
if (blocks.length === 0) {
  console.error('no ```mermaid blocks found');
  process.exit(1);
}

console.log(`const blocks = ${JSON.stringify(blocks)};
const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs');
mermaid.initialize({ startOnLoad: false });
const res = [];
for (const b of blocks) {
  const where = b.file + ':' + b.line + ' #' + b.i;
  try { await mermaid.parse(b.src); res.push('OK   ' + where); }
  catch (e) { res.push('FAIL ' + where + ' ' + String(e.message || e).split('\\n').slice(0, 3).join(' / ')); }
}
res.join(' | ');`);
