# Data layer

Rules for the Prisma repositories under `src/infrastructure/` and for schema changes under `prisma/`. Prisma lives only in repositories; use cases see the port in `src/domain/`.

## Queries: `select` over `include`

Read with `select`, naming the fields the repository returns. `include` pulls every column of the relation, sensitive ones too, and hides what the method actually needs.

```ts
prisma.booking.findUnique({
  where: { id },
  select: { id: true, startsAt: true, employee: { select: { id: true, userId: true } } },
});
```

Reach for `include` only when the caller genuinely needs the whole related row.

## Repository method names

- **No entity name.** The class already says it: `findById`, `findByBranchId`, `create`, not `findBookingById`.
- **Relations in the name.** A method that loads relations says so: `findByIdIncludeEmployees`, `findByIdIncludeEmployeesAndIntervals`. Plain `findById` returns the row alone.
- **Say what it returns, not who calls it.** `findByEmployeeIdBetween(employeeId, from, to)`, not `findForDashboard`. A generic name gets reused; a screen-named one gets duplicated.
- **Data access only.** Existence checks, status transitions, and authorization belong in the use case. A repository method that throws a business-rule error is in the wrong layer.

## Schema changes and migrations

- Create a migration with `npx prisma migrate dev --name <snake_case_description>`, matching the existing names in `prisma/migrations/`.
- Run `npx prisma generate` after every schema change, and whenever TypeScript reports a missing Prisma enum or type. The client is generated into `src/generated/prisma`; `postinstall` also regenerates it.
- A new date column on a table that already has rows: decide on purpose whether existing rows get `null` or a default, and write it in the migration. An `updatedAt`-style column must actually be set on every update.
- Change the schema before the code that reads the new field.
- Leave applied migrations untouched: fix forward with a new migration. Branches are stacked, and a rewritten migration breaks every branch above it.
