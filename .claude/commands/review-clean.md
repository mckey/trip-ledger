---
description: Рев'ю незакомічених змін рецензентом з чистого контексту (diff + AC → ACCEPT/WARN/PARTIAL/REJECT)
argument-hint: <шлях до story.md>
allowed-tools: Bash(scripts/review-packet.sh:*), Bash(scripts/critical-diff-hash.sh:*), Read, Write, Agent
---

1. `scripts/review-packet.sh $ARGUMENTS review/<story-id>` → шлях пакета.
2. Підняти субагент `clean-reviewer` з промптом рівно з одного рядка: «Пакет: <шлях>».
   Не додавати пояснень, плану, звіту виконавця чи власної думки про зміну.
3. Відповідь рецензента зберегти дослівно в `review/<story-id>/verdict-N.md` і в
   `review/verdicts/<diff-sha256 з пакета>.txt` — саме його читає `scripts/hooks/pre-commit`.
4. PARTIAL/REJECT → знахідки йдуть виконавцю, після фіксу — новий пакет і новий прогін.
   Знахідку, з якою не згоден, не «закривай» мовчки: доведи зондом або запиши в story Notes.
