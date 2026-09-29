// Contract mocks for <slug>, typed by the generated contract (src/contracts/<slug>.gen.ts).
// One mock per success response (and per nullable branch such as `budget: null`). A contract change the
// mocks do not follow breaks `tsc --noEmit`, not a run on the stand.
import type { operations } from './<slug>.gen';

type Json<Op extends keyof operations, Status extends keyof operations[Op]['responses']> =
  operations[Op]['responses'][Status] extends { content: { 'application/json': infer Body } } ? Body : never;

type Req<Op extends keyof operations> =
  operations[Op] extends { requestBody: { content: { 'application/json': infer Body } } } ? Body : never;

export const <operationId>Request = {
  // ...
} satisfies Req<'<operationId>'>;

export const <operationId>Ok = {
  // ...
} satisfies Json<'<operationId>', 200>;
