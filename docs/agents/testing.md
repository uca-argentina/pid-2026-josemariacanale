# Fixing failing tests

Applies to `agendic-front/` and `agendic-back/`.

1. **Type-check first.** `npx tsc --noEmit` from the app folder (there is no type-check script). A type error is often the real cause of a failing test; fix every one before touching tests.
2. **In the back, regenerate Prisma** with `npx prisma generate` when the errors name a missing Prisma enum or type.
3. **One test file at a time.** `npm test -- <path>`, get that file green, then the next. Done when `npm test` passes in full.
