---
status: Living
updated_at: "YYYY-MM-DD"
---

# Domain Context — <slug>

<!--
Per-feature словник: те, що знає кожна story цієї фічі. Кореневий CONTEXT.md — база;
тут лише терміни фічі + NOT-межі проти кореневих. Без деталей реалізації в Glossary/Invariants
(жодних колонок, бібліотек, шляхів). Sentinel errors і Scope-filter — виняток: це домовленість,
яку story-файли цитують посиланням замість того, щоб повторювати.
-->

## Glossary

<!-- 8–10 термінів · одне канонічне речення · NOT-межа з найближчим омонімом (з кореневого словника чи сусідньої фічі). -->
- <term> — <визначення>. NOT <з чим плутають>.

## Invariants

<!-- Правила, що тримаються у всьому коді фічі; кожне — з джерелом (PRD AC / ADR). -->
- <X завжди / ніколи …> (<джерело>)

## Sentinel errors

<!-- Клас доменної помилки → code на дроті (`<bc>.<snake(Class без Error)>`) → HTTP → хто кидає. Джерело — api-sync-report «Error codes». -->

| Class | code | HTTP | BC / кидає |
|---|---|---|---|

## Scope-filter invariant

<!-- Аналог org-filter для single-user репо: чим обмежено кожне читання/запис. -->
- <…>

## Out of scope

- <концепт · чому не наш>
