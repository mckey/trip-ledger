---
status: Draft | Confirmed | Frozen
owner: "<name>"
reviewers: []
updated_at: "<YYYY-MM-DD>"
feature_size: <XS|S|M|L|XL>
stage: "01"
ticket: "<ticket-id | ->"
value_score:
  rice: <number>                 # рахує Claude, я підтверджую
  state: proposed | confirmed
  confirmed_at: "<YYYY-MM-DD>"
feasibility_state: proposed | confirmed
---

<!-- Stage 01 → .claude/skills/discovery. Продуктовий бриф: без назв технологій
     (сховища, фреймворки, бібліотеки мого стека), без схем таблиць і endpoint-ів. -->

# Idea Brief — <feature name>

## 1. Raw idea
<1 абзац дослівно, phase 1>

## 2. Problem
<1–3 речення, факти/числа>

## 3. Users
- **Хто платить**: <хто ухвалює рішення про гроші/пріоритет; для pet — «я»>
- **Хто користується**: <хто клацає щодня; для B2B travel це майже ніколи не той, хто платить>
- **Хто відчуває наслідки**: <кінцевий клієнт/турист, якщо є>
- Частота та обсяг: <скільки випадків на квартал/сезон>

## 4. Why now
- Тригер: <інцидент / контракт / поїздка / дедлайн>
- **Дедлайн сезону**: <дата, після якої фіча чекає наступного вікна (високий сезон, наступна поїздка); «немає» — теж відповідь>

## 5. Out of scope
- bullet

## 6. Konkurenty / сусідні рішення
| # | Product · URL | Features | Value (1–5) | Gap |
|---|---|---|---|---|
| 1 | <name> · <url або «сусідній інструмент»> | <features> | <ratings> | <gap> |

Для внутрішніх/pet фіч: 2–3 сусідні рішення, якими реально користуюсь, + рядок «як це робить легасі», якщо є. Дата й запит пошуку — виноскою.

## 7. Strategic approaches

### Approach A — Reuse: <3–5 слів>
- **Thesis** / **For whom** / **Outcome metric** / **Key trade-off** / **Effort**: S/M/L / **Recommended?** ◯/●

### Approach B — Integrate: <3–5 слів>
[та сама структура]

### Approach C — Build minimal: <3–5 слів>
[та сама структура]

## 8. Multi-perspective feedback

### Engineer
- 3–5 булетів (абстрактні ризики, без назв бібліотек і сховищ)

### Support
- 3–5 булетів: які тікети прилетять, як діагностувати, де користувач побачить «не задано/не порахувалось»; для pet — де Я побачу, що дані неповні

### User
- 3–5 булетів (тертя, помітність, звикання)

### Synthesis matrix
|         | Engineer | Support | User |
|---------|:--------:|:-------:|:----:|
| App. A  |          |         |      |
| App. B  |          |         |      |
| App. C  |          |         |      |

Коротке обґрунтування в кожній клітинці.

## 9. Trade-offs and edge cases

### Trade-offs per approach
| Approach | Pros | Cons |
|---|---|---|

### Edge cases
- 5–8 пунктів (дані, інтеграції, відмови, сезонні піки)

## 10. Risks
- Top attack vector (devil's advocate, чиста сесія)
- **Сигнал у саппорт**: <як цей ризик проявиться тікетом/симптомом і як його впізнати>
- Інші ризики

## 11. RICE — Claude proposed
- **Reach (R)**: <число> — з §3 (для B2B — бронювання/сезон; для pet — випадки/рік)
- **Impact (I)**: <0.25–3> — з §2 + §8
- **Confidence (C)**: <0.5–1.0> — з кількості TBD у §15
- **Effort (E)**: <person-weeks> — з §7
- **RICE = R × I × C / E = <число>**
- **Правило малої бази**: Reach < 10/квартал → проходить тільки Effort S. Застосовано: <так/ні, що врізали>
- **State**: proposed | confirmed

## 12. Feasibility — Claude proposed
- [☑/☐] **Tech**: <цитата сусідньої фічі з репо>
- [☑/☐] **Skills**: <обґрунтування>
- [☑/☐] **Time**: <скільки зайняла схожа фіча>
- **State**: proposed | confirmed

## 13. Recommendation
**Selected: Approach <X>** — 3–5 речень; цитує RICE (§11), Feasibility (§12), ≥1 клітинку §8, ≥1 gap §6.

**Locked-in pointer**: <що це фіксує для наступної фази>

## 14. Parked & rejected approaches
| # | Approach | Status | Reason | Revisit trigger |
|---|---|:---:|---|---|

## 15. Open questions
- [ ] <питання> — owner: <хто>, due: <коли>
- **Наступна фіча, яку це розблокує**: <slug або «немає» — думати конвеєром, не поодинокими фічами>

## 16. Слід у словнику
<Терміни, додані/уточнені в CONTEXT.md за цей прогін, по рядку на термін — щоб рев'юер бачив дельту глосарія без diff. Якщо нових немає — «дельти немає».>

## Related
- CONTEXT.md, SPEC.md, тикет, сусідні фічі

## DoD self-check
- [ ] Всі секції заповнені (16, включно зі «Слідом у словнику»)
- [ ] Без термінів мого стека в тілі
- [ ] ≤ 5 сторінок (~2200 слів)
- [ ] status: Confirmed, RICE confirmed, Feasibility confirmed
- [ ] Правило малої бази застосоване й задокументоване
- [ ] §13 цитує §6, §8, §11, §12
