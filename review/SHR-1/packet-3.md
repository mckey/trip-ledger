# Review packet · SHR-1-rate-value-object · packet-3

base: `bc0e0e7` · diff: `git diff bc0e0e7 -- src/shared/ docs/features/multi-currency-summary/tasks/tracker.md`


## Acceptance criteria (GWT)

- [x] **AC-s1-1 (AC-02):** Given рядок `"0"`, `"-1.5"` або `"1.1234567890"` (10 знаків), when `Rate.parse(...)`, then кидається `InvalidRateError` і жодного `Rate` не створено.
- [x] **AC-s1-2 (AC-02):** Given рядок `"0.9123"`, when `Rate.parse`, then `toString()` повертає `"0.912300000"` (завжди 9 знаків — форма контракту, api-sync-report F4), а внутрішнє значення — `912300000n`.
- [x] **AC-s1-3 (AC-03b):** Given `Money(100000000, 'VND')` і курс `"0.000037037"`, when `rate.apply(money, 'EUR')`, then результат — `Money(3704, 'EUR')`, не нуль.
- [x] **AC-s1-4 (AC-03b):** Given випадкові пари (сума ≤ 10¹², курс ≤ 9 знаків), when `apply`, then відхилення від точного добутку ≤ 1 minor unit і округлення — half-up.

## Edge cases

| Кейс | Поведінка |
|---|---|
| `"1e-7"` (так серіалізує JS number) | `InvalidRateError` — саме тому курс на дроті рядок (ADR-0002) |
| `"00.5"`, `".5"` | `InvalidRateError` — той самий `pattern`, що в схемі `Rate` контракту: ціла частина без провідних нулів, цифра перед крапкою обов'язкова |
| Курс < 10⁻⁹ | Не представний — `InvalidRateError`, accepted debt SAD §11 |
| Сума × курс > 2⁵³ | BigInt, переповнення немає; `Money` приймає результат лише як safe integer — інакше кидає |


## Definition of Done

- [x] `Rate.test.ts` зелений, включно з property-тестом AC-03b на ≥ 1000 пар
- [x] У `Rate.ts` немає жодного `Number(`/`parseFloat` на шляху курсу (grep у PR-описі)
- [x] `node_modules/.bin/tsc --noEmit` і `npx vitest run src/shared` зелені; dependency-guard мовчить (shared нічого не імпортує з BC)
- [x] `tracker.md`: SHR-1 → `done`

## Diff

```diff
diff --git a/docs/features/multi-currency-summary/tasks/tracker.md b/docs/features/multi-currency-summary/tasks/tracker.md
index 0d00e27..391df64 100644
--- a/docs/features/multi-currency-summary/tasks/tracker.md
+++ b/docs/features/multi-currency-summary/tasks/tracker.md
@@ -4,21 +4,21 @@ feature: multi-currency-summary
 updated_at: 2026-09-29
 ---
 
 # Tracker — multi-currency-summary
 
 Плоский стан для виконавця (runner). **Алгоритм вибору:** зверху вниз — перший рядок зі статусом `todo` або `wip` **без assignee** (кинута сесія), у якого **Blocked by** порожній або всі перелічені `done`, і всі **External** `done` у [tracker trip-budget](../../trip-budget/tasks/tracker.md). Рядки впорядковані за хвилями, усередині хвилі — рекомендований порядок для одного виконавця.
 
 | Story | Wave | Status | Assignee | Blocked by | External | Estimate |
 |---|---|---|---|---|---|---|
 | [DOC-1](./DOC-1-backport-glossary-and-prd.md) | 1 | todo | — | — | — | S |
-| [SHR-1](./SHR-1-rate-value-object.md) | 1 | todo | — | — | — | M |
+| [SHR-1](./SHR-1-rate-value-object.md) | 1 | done | — | — | — | M |
 | [TRP-1](./TRP-1-trip-base-currency-lock.md) | 1 | todo | — | — | trip-budget:T2 | M |
 | [MIG-1](./MIG-1-promote-rate-snapshot-migration.md) | 1 | todo | — | — | trip-budget:T3 | S |
 | [EXP-1](./EXP-1-expense-rate-attribute-and-ports.md) | 2 | todo | — | SHR-1 | trip-budget:T6, trip-budget:T8 | L |
 | [TRP-2](./TRP-2-set-trip-base-currency-use-case.md) | 2 | todo | — | TRP-1 | — | S |
 | [EXP-4](./EXP-4-converted-total-in-budget-block.md) | 3 | todo | — | SHR-1, EXP-1 | trip-budget:T6 | L |
 | [EXP-5](./EXP-5-expense-repositories-rate-mapping.md) | 3 | todo | — | EXP-1, MIG-1 | — | M |
 | [EXP-2](./EXP-2-add-expense-with-optional-rate.md) | 3 | todo | — | EXP-1 | trip-budget:T6 | S |
 | [EXP-3](./EXP-3-set-expense-rate-use-case.md) | 3 | todo | — | EXP-1 | — | S |
 | [X-1](./X-1-rated-expenses-port-adapter.md) | 4 | todo | — | TRP-1, EXP-5 | — | S |
 | [HTTP-1](./HTTP-1-expenses-rate-routes.md) | 4 | todo | — | EXP-2, EXP-3, EXP-5 | trip-budget:T12 | M |
diff --git a/src/shared/Money.test.ts b/src/shared/Money.test.ts
index 0cf1d79..81fc849 100644
--- a/src/shared/Money.test.ts
+++ b/src/shared/Money.test.ts
@@ -7,11 +7,18 @@ describe('Money', () => {
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
+    expect(() => new Money(Number.MAX_SAFE_INTEGER + 1, 'UAH')).toThrow(
+      'Money amount must be a non-negative safe integer of minor units',
+    );
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
new file mode 100644
index 0000000..f30c25e
--- /dev/null
+++ b/src/shared/Rate.test.ts
@@ -0,0 +1,110 @@
+import { describe, expect, it } from 'vitest';
+import { Money } from './Money';
+import { InvalidRateError, Rate } from './Rate';
+
+describe('Rate', () => {
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
+
+  it('parses a valid decimal rate and always formats with 9 decimals', () => {
+    const rate = Rate.parse('0.9123');
+    expect(rate.toString()).toBe('0.912300000');
+    expect(rate.toNano()).toBe(912_300_000n);
+  });
+
+  it('round-trips through toNano/fromNano, and ONE is 1.000000000', () => {
+    expect(Rate.fromNano(Rate.parse('26.5').toNano()).toString()).toBe('26.500000000');
+    expect(Rate.ONE.toString()).toBe('1.000000000');
+    expect(() => Rate.fromNano(0n)).toThrow(InvalidRateError);
+    expect(() => Rate.fromNano(-1n)).toThrow(InvalidRateError);
+  });
+
+  it('rejects fromNano beyond the 9-digit integer-part contract, not only parse', () => {
+    // 1_234_567_890.5 — та сама межа, яку parse відкидає рядком; fromNano мала б обходити її.
+    expect(() => Rate.fromNano(1_234_567_890_500_000_000n)).toThrow(InvalidRateError);
+    // Межа: рівно 9 дев'яток у цілій частині + 9 дев'яток дробової — ще представне.
+    expect(() => Rate.fromNano(999_999_999_999_999_999n)).not.toThrow();
+  });
+
+  it('applies a rate to Money without rounding to zero for small currencies', () => {
+    const result = Rate.parse('0.000037037').apply(new Money(100_000_000, 'VND'), 'EUR');
+    expect(result).toBeInstanceOf(Money);
+    expect(result.amount).toBe(3704);
+    expect(result.currency).toBe('EUR');
+  });
+
+  it('rounds half-up at the boundary', () => {
+    expect(Rate.parse('0.5').apply(new Money(1, 'A'), 'B').amount).toBe(1);
+    expect(Rate.parse('0.499999999').apply(new Money(1, 'A'), 'B').amount).toBe(0);
+    expect(Rate.parse('0.9123').apply(new Money(1999, 'A'), 'B').amount).toBe(1824);
+  });
+
+  it('throws instead of silently losing precision when amount × rate exceeds Number.MAX_SAFE_INTEGER', () => {
+    const money = new Money(Number.MAX_SAFE_INTEGER, 'A'); // 2⁵³ − 1
+    expect(() => Rate.parse('3').apply(money, 'B')).toThrow(
+      'Money amount must be a non-negative safe integer of minor units',
+    );
+  });
+
+  it('applies a rate with at most 1 minor unit of error (half-up)', () => {
+    const SCALE = 1_000_000_000n;
+    const AMOUNT_CAP = 1_000_000_000_000; // 10¹² — межа з AC-s1-4
+
+    // xorshift32: попередній LCG (seed * 1_103_515_245) рахував у Number, де добуток вже
+    // ~2⁶¹ — молодші біти seed губились, і `% 512` виродився в 24 значення (887/2000 нулів,
+    // жодної суми < 10⁶ серед 2000 пар). xorshift32 тримає повну 32-бітну ентропію в кожному
+    // виклику й не потребує BigInt.
+    let state = 0x5eed_7005 >>> 0;
+    const nextU32 = (): number => {
+      state ^= state << 13;
+      state ^= state >>> 17;
+      state ^= state << 5;
+      state >>>= 0;
+      return state;
+    };
+    const nextFloat = (): number => nextU32() / 2 ** 32;
+
+    let sawSmall = false; // < 1000
+    let sawLarge = false; // > 10¹¹
+
+    for (let i = 0; i < 2000; i++) {
+      // Випадковий порядок величини 10⁰..10¹², щоб не пропустити ні малі, ні великі суми.
+      const magnitude = nextU32() % 13;
+      const bandStart = 10 ** magnitude;
+      const amount = Math.min(Math.floor(bandStart + nextFloat() * bandStart * 9), AMOUNT_CAP);
+
+      const nano = BigInt(1 + (nextU32() % 999_999_999)) + BigInt(nextU32() % 1000) * SCALE;
+      const rate = Rate.fromNano(nano);
+      const got = BigInt(rate.apply(new Money(amount, 'A'), 'B').amount);
+      const exactTimesScale = BigInt(amount) * nano;
+      const diff = got * SCALE - exactTimesScale;
+      expect(diff <= SCALE && diff >= -SCALE).toBe(true);
+      expect(got).toBe((exactTimesScale + SCALE / 2n) / SCALE);
+
+      if (amount < 1000) sawSmall = true;
+      if (amount > 100_000_000_000) sawLarge = true;
+    }
+
+    // Захист від тихої деградації генератора (саме так пропустили F1 минулого разу).
+    expect(sawSmall).toBe(true);
+    expect(sawLarge).toBe(true);
+  });
+});
diff --git a/src/shared/Rate.ts b/src/shared/Rate.ts
new file mode 100644
index 0000000..4c0d3d8
--- /dev/null
+++ b/src/shared/Rate.ts
@@ -0,0 +1,62 @@
+// Спільний value object. Курс на дроті — рядок, у пам'яті — ціле (шкала 10⁹), у БД — BIGINT.
+import { Money } from './Money';
+
+const SCALE = 1_000_000_000n;
+// Ціла частина: сам «0» (напр. «0.5») або 1–9 цифр без провідних нулів — дзеркалить
+// схему `Rate` контракту: (0|[1-9][0-9]{0,8}).
+const PATTERN = /^(0|[1-9][0-9]{0,8})(\.[0-9]{1,9})?$/;
+// 10¹⁸ — верхня межа nano при цілій частині рівно 9 цифр (999999999.999999999 < 10¹⁸).
+// Тримається тут (не лише в parse), щоб fromNano не міг обійти межу контракту.
+const MAX_NANO = 1_000_000_000_000_000_000n;
+
+export class InvalidRateError extends Error {
+  constructor(message: string) {
+    super(message);
+    this.name = 'InvalidRateError';
+  }
+}
+
+export class Rate {
+  private readonly nano: bigint;
+
+  constructor(nano: bigint) {
+    if (nano <= 0n || nano >= MAX_NANO) {
+      throw new InvalidRateError('Rate must be a positive value with at most 9 integer digits');
+    }
+    this.nano = nano;
+  }
+
+  static readonly ONE: Rate = new Rate(SCALE);
+
+  static parse(raw: string): Rate {
+    const match = PATTERN.exec(raw);
+    if (!match) {
+      throw new InvalidRateError(`Invalid rate format: ${raw}`);
+    }
+    const [, intPart, decPart] = match;
+    const decimals = (decPart ?? '').slice(1).padEnd(9, '0');
+    return new Rate(BigInt(intPart) * SCALE + BigInt(decimals));
+  }
+
+  static fromNano(nano: bigint): Rate {
+    return new Rate(nano);
+  }
+
+  toNano(): bigint {
+    return this.nano;
+  }
+
+  toString(): string {
+    const intPart = this.nano / SCALE;
+    const decPart = this.nano % SCALE;
+    return `${intPart}.${decPart.toString().padStart(9, '0')}`;
+  }
+
+  apply(money: Money, target: string): Money {
+    const product = BigInt(money.amount) * this.nano + SCALE / 2n;
+    const resultAmount = product / SCALE;
+    // Number(...) конвертує суму в мінорних одиницях, не курс (курс лишається BigInt до цього
+    // рядка) — safe-integer межу перевіряє конструктор Money.
+    return new Money(Number(resultAmount), target);
+  }
+}
```
