export const meta = {
  name: 'audit-entrypoints',
  description: 'Read-only audit of trip-ledger entry points (routes, use cases, repos, adapters) with blind convergence verify',
  whenToUse: 'Re-run the same entry-point audit on trip-ledger after new routes/use cases land',
  phases: [
    { title: 'Audit', detail: 'one auditor per element, max 3 findings each' },
    { title: 'Verify', detail: 'blind verifiers per high/medium finding, while-loop until 2 votes agree' },
  ],
}

const HEAD = (args && args.head) || 'HEAD'

const ITEMS = [
  // HTTP routes
  { kind: 'route', id: 'POST /trips', file: 'src/trips/presentation/tripsRouter.ts' },
  { kind: 'route', id: 'GET /trips', file: 'src/trips/presentation/tripsRouter.ts' },
  { kind: 'route', id: 'GET /trips/:id', file: 'src/trips/presentation/tripsRouter.ts' },
  { kind: 'route', id: 'POST /trips/:id/expenses', file: 'src/expenses/presentation/expensesRouter.ts' },
  { kind: 'route', id: 'GET /trips/:id/expenses', file: 'src/expenses/presentation/expensesRouter.ts' },
  { kind: 'route', id: 'GET /trips/:id/summary', file: 'src/expenses/presentation/expensesRouter.ts' },
  // use cases
  { kind: 'usecase', id: 'CreateTrip', file: 'src/trips/application/CreateTrip.ts' },
  { kind: 'usecase', id: 'FinishTrip', file: 'src/trips/application/FinishTrip.ts' },
  { kind: 'usecase', id: 'GetTrip', file: 'src/trips/application/GetTrip.ts' },
  { kind: 'usecase', id: 'ListTrips', file: 'src/trips/application/ListTrips.ts' },
  { kind: 'usecase', id: 'SetTripBudget', file: 'src/trips/application/SetTripBudget.ts' },
  { kind: 'usecase', id: 'AddExpense', file: 'src/expenses/application/AddExpense.ts' },
  { kind: 'usecase', id: 'ListExpenses', file: 'src/expenses/application/ListExpenses.ts' },
  { kind: 'usecase', id: 'GetTripSummary', file: 'src/expenses/application/GetTripSummary.ts' },
  { kind: 'usecase', id: 'BudgetBlock', file: 'src/expenses/application/BudgetBlock.ts' },
  // repositories
  { kind: 'repo', id: 'PostgresTripRepository', file: 'src/trips/infrastructure/PostgresTripRepository.ts' },
  { kind: 'repo', id: 'InMemoryTripRepository', file: 'src/trips/infrastructure/InMemoryTripRepository.ts' },
  { kind: 'repo', id: 'PostgresExpenseRepository', file: 'src/expenses/infrastructure/PostgresExpenseRepository.ts' },
  { kind: 'repo', id: 'InMemoryExpenseRepository', file: 'src/expenses/infrastructure/InMemoryExpenseRepository.ts' },
  // cross-BC adapters
  { kind: 'adapter', id: 'TripRepositoryStatusPort', file: 'src/expenses/infrastructure/TripRepositoryStatusPort.ts' },
  { kind: 'adapter', id: 'TripRepositoryBudgetPort', file: 'src/expenses/infrastructure/TripRepositoryBudgetPort.ts' },
]

const CHECKLIST = {
  route: 'input validation of body/params/query (zod shape, :id format, numeric bounds, currency format), mapping of every domain error to the right HTTP status (no unhandled rejection -> 500, no stack/internal message leak), existence check of the parent trip, response shape consistency.',
  usecase: 'existence checks of referenced aggregates, lifecycle/state checks (finished trip etc.), whether it trusts caller input that the domain does not re-validate, race/ordering issues between read and save, errors thrown as untyped Error instead of a domain sentinel.',
  repo: 'SQL injection (string-built SQL vs parameterized), nullability/NULL mapping in toDomain, silent data loss on upsert, missing columns vs domain fields, behavior divergence between InMemory and Postgres implementations.',
  adapter: 'cross-BC seam correctness (only place expenses sees trips), null/undefined handling, whether it leaks trips domain types into expenses beyond the port, whether callers can get a misleading answer for a missing trip.',
}

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'integer' },
          category: { type: 'string', enum: ['input-validation', 'error-mapping', 'existence-check', 'state-check', 'sql', 'data-mapping', 'seam', 'known-T12-auth', 'other'] },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          claim: { type: 'string', description: 'one falsifiable sentence: concrete input/state -> wrong behavior' },
        },
        required: ['title', 'file', 'line', 'category', 'severity', 'claim'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT = {
  type: 'object',
  properties: {
    confirmed: { type: 'boolean' },
    reason: { type: 'string' },
    guardedElsewhere: { type: 'string', description: 'file:line of a guard in another layer that makes the claim false, or empty' },
  },
  required: ['confirmed', 'reason', 'guardedElsewhere'],
}

const LENSES = [
  'READ: trace the exact code path from the entry point to the claimed failure and check every line on the way.',
  'REPRODUCE: construct the concrete HTTP request or call (values included) that would trigger it and walk it through the code; if you cannot build one, it is refuted.',
  'GUARDED-ELSEWHERE: look for a guard in another layer (zod schema, domain constructor/invariant, shared VO like Money/Balance, DB CHECK in migrations/, router error handler) that already prevents it.',
]

const auditPrompt = (it) => `Read-only security/robustness audit of ONE element of the trip-ledger repo (cwd), commit ${HEAD}. Do NOT edit files, do NOT run git write commands.
Element: ${it.kind} "${it.id}" in ${it.file}. Read that file and whatever it directly calls or is called by, enough to judge it.
Check: ${CHECKLIST[it.kind]}
Known context: there is no authentication yet — API key is planned in task T12. If this element is a route, you may emit at most ONE finding with category known-T12-auth and severity low; do not spend other findings on auth.
Report at most 3 findings, the most important first. Only concrete, falsifiable claims about THIS element with a file:line. If the element is fine, return an empty list — an empty list is a good answer.`

const verifyPrompt = (f, it, lens) => `Independent verifier. Read-only: do NOT edit files. Repo trip-ledger (cwd), commit ${HEAD}.
A claim was made about ${it.kind} "${it.id}":
  CLAIM: ${f.claim}
  LOCATION: ${f.file}:${f.line}
You have not seen the auditor's reasoning; judge from the code only.
Your lens — ${lens}
Set confirmed=true only if the claim holds on the current code. If uncertain, confirmed=false.`

// Blind votes until two agree (majority of up to 3). The while-loop IS the convergence.
async function converge(f, it) {
  const votes = []
  let yes = 0, no = 0
  while (yes < 2 && no < 2 && votes.length < 3) {
    const need = votes.length === 0 ? 2 : 1
    const start = votes.length
    const batch = await parallel(Array.from({ length: need }, (_, k) => () =>
      agent(verifyPrompt(f, it, LENSES[start + k]), {
        label: `verify:${it.id}:${start + k + 1}`,
        phase: 'Verify',
        schema: VERDICT,
        effort: 'medium',
      })))
    for (const v of batch.filter(Boolean)) {
      votes.push(v)
      if (v.confirmed) yes++; else no++
    }
    if (batch.filter(Boolean).length === 0) break
  }
  return { ...f, element: it.id, kind: it.kind, yes, no, confirmed: yes >= 2, votes }
}

phase('Audit')
log(`Auditing ${ITEMS.length} elements at ${HEAD}`)

const perItem = await pipeline(
  ITEMS,
  (it) => agent(auditPrompt(it), { label: `audit:${it.id}`, phase: 'Audit', schema: FINDINGS, model: 'sonnet', effort: 'medium' }),
  async (res, it) => {
    const all = (res && res.findings) || []
    const toVerify = all.filter(f => f.severity !== 'low' && f.category !== 'known-T12-auth')
    const skipped = all.filter(f => !toVerify.includes(f)).map(f => ({ ...f, element: it.id, kind: it.kind }))
    const verified = await parallel(toVerify.map(f => () => converge(f, it)))
    return { element: it.id, kind: it.kind, raw: all.length, verified: verified.filter(Boolean), skipped }
  },
)

const rows = perItem.filter(Boolean)
const verified = rows.flatMap(r => r.verified)
const confirmed = verified.filter(f => f.confirmed)
const filtered = verified.filter(f => !f.confirmed)
const skipped = rows.flatMap(r => r.skipped)
const tiebreaks = verified.filter(f => f.votes.length === 3).length

log(`raw findings: ${rows.reduce((s, r) => s + r.raw, 0)}, verified: ${verified.length}, confirmed: ${confirmed.length}, filtered by convergence: ${filtered.length}, tiebreaks: ${tiebreaks}, low/T12 not verified: ${skipped.length}`)
if (rows.length < ITEMS.length) log(`WARNING: ${ITEMS.length - rows.length} auditors returned nothing`)

const brief = (f) => ({ element: f.element, severity: f.severity, category: f.category, at: `${f.file}:${f.line}`, title: f.title, claim: f.claim, votes: `${f.yes}✓/${f.no}✗`, reasons: f.votes.map(v => (v.confirmed ? '✓ ' : '✗ ') + v.reason + (v.guardedElsewhere ? ` [guard: ${v.guardedElsewhere}]` : '')) })

return {
  stats: { elements: ITEMS.length, audited: rows.length, raw: rows.reduce((s, r) => s + r.raw, 0), verified: verified.length, confirmed: confirmed.length, filtered: filtered.length, tiebreaks, skippedLow: skipped.length },
  confirmed: confirmed.map(brief),
  filtered: filtered.map(brief),
  skipped: skipped.map(f => ({ element: f.element, severity: f.severity, category: f.category, at: `${f.file}:${f.line}`, title: f.title })),
}
