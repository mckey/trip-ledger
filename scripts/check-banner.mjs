// Полегшений канал для косметики (урок 7.6): рядок старту проти курованого еталона.
// Еталон оновлюється лише руками (`--update` + перегляд diff у PR), не автоматично на розбіжності.
import { readFileSync, writeFileSync } from 'node:fs';
import { startupBanner } from '../src/presentation/banner.ts';

const golden = 'baselines/startup-banner.txt';
const cases = [
  { version: '0.1.0', port: 3000, env: undefined },
  { version: '0.1.0', port: 8080, env: 'production' },
];
const actual = cases.map(startupBanner).join('\n') + '\n';

if (process.argv.includes('--update')) {
  writeFileSync(golden, actual);
  console.log(`еталон оновлено: ${golden} — переглянь git diff перед комітом`);
  process.exit(0);
}
const expected = readFileSync(golden, 'utf8').replace(/\r\n/g, '\n');
if (expected === actual) {
  console.log(`✓ banner = еталон (${cases.length} кейси)`);
} else {
  console.log(`✗ banner ≠ еталон\n--- expected\n${expected}+++ actual\n${actual}`);
  process.exit(1);
}
