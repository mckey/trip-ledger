// Синтаксична перевірка .claude/workflows/*.mjs у семантиці рантайму Workflow:
// тіло виконується як async-функція (top-level await і return легальні), тож
// `node --check` тут не підходить — він вимагає валідний ES-модуль.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const dir = '.claude/workflows';
let failed = 0;
for (const name of readdirSync(dir).filter((f) => f.endsWith('.mjs'))) {
  const body = readFileSync(join(dir, name), 'utf8').replace(/^export const meta\s*=/m, 'const meta =');
  try {
    new AsyncFunction('agent', 'parallel', 'pipeline', 'phase', 'log', 'args', 'budget', 'workflow', body);
    console.log(`OK   ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
