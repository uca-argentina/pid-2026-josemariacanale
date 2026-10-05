# Errors

Applies to `agendic-front/` and `agendic-back/`. Which layer throws and catches what: `agendic-front/docs/agents/clean-architecture.md` § Errors.

- **Throw a domain error class.** Back: a subclass of `DomainError` (`src/domain/errors.ts`), which `DomainExceptionFilter` maps to its status. Front: a class from `src/entities/errors`. A bare `Error` reaches the client as a generic 500.
- **Name what failed and with which value.** `Employee 12 has no Franjas on 2026-10-05`, not `Operation failed`. The message is what you read in the log or the response when debugging.
- **Back messages are API contract.** `DomainExceptionFilter` sends `error.message` as-is, and ADR 0007 lists the messages the front relies on (e.g. the 409 for an Enlace de reserva in use). Changing one is changing the contract: update the ADR and the front ticket with it.
- **Wrap vendor errors with `{ cause }`.** Prisma, Clerk, and S3 errors are translated to a domain error in the adapter, keeping the original: `throw new DatabaseOperationError('Booking 7 not saved', { cause: error })`.
