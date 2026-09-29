# Review packet · SHR-1-rate-value-object · packet-1

base: `9f470b0` · diff: `git diff HEAD` (незакомічені зміни)
diff-sha256: `11b3d8ce77c5e9ff`



## Acceptance criteria (GWT)

- [ ] **AC-s1-1 (AC-02):** Given рядок `"0"`, `"-1.5"` або `"1.1234567890"` (10 знаків), when `Rate.parse(...)`, then кидається `InvalidRateError` і жодного `Rate` не створено.
- [ ] **AC-s1-2 (AC-02):** Given рядок `"0.9123"`, when `Rate.parse`, then `toString()` повертає `"0.912300000"` (завжди 9 знаків — форма контракту, api-sync-report F4), а внутрішнє значення — `912300000n`.
- [ ] **AC-s1-3 (AC-03b):** Given `Money(100000000, 'VND')` і курс `"0.000037037"`, when `rate.apply(money, 'EUR')`, then результат — `Money(3704, 'EUR')`, не нуль.
- [ ] **AC-s1-4 (AC-03b):** Given випадкові пари (сума ≤ 10¹², курс ≤ 9 знаків), when `apply`, then відхилення від точного добутку ≤ 1 minor unit і округлення — half-up.

## Edge cases

| Кейс | Поведінка |
|---|---|
| `"1e-7"` (так серіалізує JS number) | `InvalidRateError` — саме тому курс на дроті рядок (ADR-0002) |
| `"00.5"`, `".5"` | `InvalidRateError` — той самий `pattern`, що в схемі `Rate` контракту: ціла частина без провідних нулів, цифра перед крапкою обов'язкова |
| Курс < 10⁻⁹ | Не представний — `InvalidRateError`, accepted debt SAD §11 |
| Сума × курс > 2⁵³ | BigInt, переповнення немає; `Money` приймає результат лише як safe integer — інакше кидає |

## Definition of Done

- [ ] `Rate.test.ts` зелений, включно з property-тестом AC-03b на ≥ 1000 пар
- [ ] У `Rate.ts` немає жодного `Number(`/`parseFloat` на шляху курсу (grep у PR-описі)
- [ ] `node_modules/.bin/tsc --noEmit` і `npx vitest run src/shared` зелені; dependency-guard мовчить (shared нічого не імпортує з BC)
- [ ] `tracker.md`: SHR-1 → `done`

## Diff

```diff
diff --git a/scripts/review-packet.sh b/scripts/review-packet.sh
index c5b5515..85c836d 100644
--- a/scripts/review-packet.sh
+++ b/scripts/review-packet.sh
@@ -4,30 +4,37 @@
 #
 #   scripts/review-packet.sh <story.md> <review-dir>
 #   → <review-dir>/packet-N.md (N — наступний вільний номер), шлях друкується в stdout
 set -euo pipefail
 
 story="$1"; dir="$2"
 mkdir -p "$dir"
 n=1; while [ -e "$dir/packet-$n.md" ]; do n=$((n+1)); done
 out="$dir/packet-$n.md"
 
-# Секція markdown від "## <назва>" до наступного "## ".
-section() { awk -v h="## $1" '$0==h{p=1;print;next} p&&/^## /{p=0} p' "$story"; }
+# Секція markdown від "## <назва>…" (префікс: "## Acceptance criteria (GWT)") до наступного "## ".
+# Порожня секція — помилка: пакет без AC рецензента обманює (packet-1 SHR-1 так і вийшов).
+section() {
+  local body
+  body=$(tr -d '\r' < "$story" | awk -v h="## $1" 'index($0,h)==1{p=1;print;next} p&&/^## /{p=0} p')
+  if [ -z "$body" ] && [ "${2:-}" = required ]; then echo "✗ у $story немає секції '## $1'" >&2; exit 1; fi
+  printf '%s\n' "$body"
+}
 
 {
   echo "# Review packet · $(basename "$story" .md) · packet-$n"
   echo
   echo "base: \`$(git rev-parse --short HEAD)\` · diff: \`git diff HEAD\` (незакомічені зміни)"
   echo "diff-sha256: \`$(scripts/critical-diff-hash.sh HEAD)\`"
   echo
+  section "What"; echo
   section "Acceptance criteria"; echo
   section "Edge cases"; echo
-  section "Definition of Done"; echo
+  section "Definition of Done" required; echo
   echo "## Diff"
   echo
   echo '```diff'
   git --no-pager diff --no-color -U10 HEAD -- . ':(exclude)review/' ':(exclude)docs/'
   echo '```'
 } > "$out"
 
 echo "$out"
diff --git a/src/shared/Money.test.ts b/src/shared/Money.test.ts
index 0cf1d79..6658e95 100644
--- a/src/shared/Money.test.ts
+++ b/src/shared/Money.test.ts
@@ -7,11 +7,16 @@ describe('Money', () => {
   });
 
   it('rejects adding different currencies', () => {
     expect(() => new Money(100, 'UAH').add(new Money(100, 'EUR'))).toThrow();
   });
 
   it('rejects negative or fractional minor units', () => {
     expect(() => new Money(-1, 'UAH')).toThrow();
     expect(() => new Money(10.5, 'UAH')).toThrow();
   });
+
+  it('rejects amounts beyond Number.MAX_SAFE_INTEGER', () => {
+    expect(() => new Money(Number.MAX_SAFE_INTEGER, 'UAH')).not.toThrow();
+    expect(() => new Money(Number.MAX_SAFE_INTEGER + 1, 'UAH')).toThrow();
+  });
 });
diff --git a/src/shared/Money.ts b/src/shared/Money.ts
index 62d9867..7525434 100644
--- a/src/shared/Money.ts
+++ b/src/shared/Money.ts
@@ -1,18 +1,18 @@
 // Спільний value object. Без бізнес-логіки контекстів.
 export class Money {
   constructor(
     public readonly amount: number, // у мінорних одиницях (копійки/центи)
     public readonly currency: string, // ISO 4217, напр. 'UAH'
   ) {
-    if (!Number.isInteger(amount) || amount < 0) {
-      throw new Error('Money amount must be a non-negative integer of minor units');
+    if (!Number.isSafeInteger(amount) || amount < 0) {
+      throw new Error('Money amount must be a non-negative safe integer of minor units');
     }
   }
 
   add(other: Money): Money {
     if (other.currency !== this.currency) {
       throw new Error('Cannot add money in different currencies');
     }
     return new Money(this.amount + other.amount, this.currency);
   }
 }
diff --git a/src/shared/Rate.test.ts b/src/shared/Rate.test.ts
index b9788d7..9fdaca9 100644
--- a/src/shared/Rate.test.ts
+++ b/src/shared/Rate.test.ts
@@ -1,21 +1,35 @@
 import { describe, expect, it } from 'vitest';
 import { Money } from './Money';
 import { InvalidRateError, Rate } from './Rate';
 
 describe('Rate', () => {
-  it.each(['0', '0.000000000', '-1.5', '1.1234567890', '1e-7', '00.5', '.5', '1.', ' 1.5', ''])(
-    'rejects invalid rate string %j',
-    (raw) => {
-      expect(() => Rate.parse(raw)).toThrow(InvalidRateError);
-    },
-  );
+  it.each([
+    '0',
+    '0.000000000',
+    '-1.5',
+    '1.1234567890',
+    '1e-7',
+    '00.5',
+    '.5',
+    '1.',
+    ' 1.5',
+    '',
+    '1234567890.5', // ціла частина 10 цифр — контракт дозволяє ≤ 9 ([1-9][0-9]{0,8})
+    '0.0000000001', // 10 знаків після крапки, тобто < 10⁻⁹ — не представне
+  ])('rejects invalid rate string %j', (raw) => {
+    expect(() => Rate.parse(raw)).toThrow(InvalidRateError);
+  });
+
+  it('accepts a 9-digit integer part (contract boundary)', () => {
+    expect(Rate.parse('123456789.5').toNano()).toBe(123_456_789_500_000_000n);
+  });
 
   it('parses a valid decimal rate and always formats with 9 decimals', () => {
     const rate = Rate.parse('0.9123');
     expect(rate.toString()).toBe('0.912300000');
     expect(rate.toNano()).toBe(912_300_000n);
   });
 
   it('round-trips through toNano/fromNano, and ONE is 1.000000000', () => {
     expect(Rate.fromNano(Rate.parse('26.5').toNano()).toString()).toBe('26.500000000');
     expect(Rate.ONE.toString()).toBe('1.000000000');
@@ -29,20 +43,25 @@ describe('Rate', () => {
     expect(result.amount).toBe(3704);
     expect(result.currency).toBe('EUR');
   });
 
   it('rounds half-up at the boundary', () => {
     expect(Rate.parse('0.5').apply(new Money(1, 'A'), 'B').amount).toBe(1);
     expect(Rate.parse('0.499999999').apply(new Money(1, 'A'), 'B').amount).toBe(0);
     expect(Rate.parse('0.9123').apply(new Money(1999, 'A'), 'B').amount).toBe(1824);
   });
 
+  it('throws instead of silently losing precision when amount × rate exceeds Number.MAX_SAFE_INTEGER', () => {
+    const money = new Money(Number.MAX_SAFE_INTEGER, 'A'); // 2⁵³ − 1
+    expect(() => Rate.parse('3').apply(money, 'B')).toThrow();
+  });
+
   it('applies a rate with at most 1 minor unit of error (half-up)', () => {
     const SCALE = 1_000_000_000n;
     let seed = 0x5eed_7005;
     const next = () => {
       seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
       return seed;
     };
     for (let i = 0; i < 2000; i++) {
       const amount = (next() * 2 ** 9 + (next() % 512)) % 1_000_000_000_001;
       const nano = BigInt(1 + (next() % 999_999_999)) + BigInt(next() % 1000) * SCALE;
diff --git a/src/shared/Rate.ts b/src/shared/Rate.ts
index ff22536..0bb87d4 100644
--- a/src/shared/Rate.ts
+++ b/src/shared/Rate.ts
@@ -1,15 +1,16 @@
 // Спільний value object. Курс на дроті — рядок, у пам'яті — ціле (шкала 10⁹), у БД — BIGINT.
 import { Money } from './Money';
 
 const SCALE = 1_000_000_000n;
-const PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,9})?$/;
+// Ціла частина ≤ 9 цифр — дзеркалить схему `Rate` контракту ([1-9][0-9]{0,8}).
+const PATTERN = /^(0|[1-9][0-9]{0,8})(\.[0-9]{1,9})?$/;
 
 export class InvalidRateError extends Error {
   constructor(message: string) {
     super(message);
     this.name = 'InvalidRateError';
   }
 }
 
 export class Rate {
   private readonly nano: bigint;
```
