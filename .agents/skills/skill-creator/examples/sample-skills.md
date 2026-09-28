# Sample Skill Implementations

Reference templates and implementations illustrating model-invoked and user-invoked skill design.

---

## Example 1: Model-Invoked Skill (`prisma-seam-migrator`)

Reachable autonomously whenever database schema changes or migrations are discussed.

```markdown
---
name: prisma-seam-migrator
description: Plan, execute, and verify database schema migrations and Prisma client updates. Use when modifying schema.prisma, generating migrations, adding database indexes, or resolving migration conflicts.
---

# Prisma Seam Migrator

Discipline for evolving the database schema without introducing migration drift or breaking domain seams.

## Workflow

1. **Inspect Primary Sources**:
   - Read the current `prisma/schema.prisma`.
   - Inspect existing migration folders in `prisma/migrations/`.
   - Check pending migrations using `npx prisma migrate status`.
   - *Completion Criterion*: Document the exact delta (added models, modified columns, removed constraints) in a checklist.

2. **Draft the Schema Delta**:
   - Update `prisma/schema.prisma` with the target changes.
   - Enforce snake_case for PostgreSQL mapping via `@map` / `@@map` annotations where applicable.
   - *Completion Criterion*: Run `npx prisma validate` without syntax or relation errors.

3. **Generate and Verify Migration**:
   - Generate the migration script: `npx prisma migrate dev --create-only --name <migration_name>`.
   - Inspect the generated `.sql` file in `prisma/migrations/` to ensure no destructive operations or inadvertent table drops occur.
   - Apply migration: `npx prisma migrate dev`.
   - *Completion Criterion*: Migration status shows 0 pending migrations and migration history is in sync.

4. **Regenerate Client & Verify Seams**:
   - Run `npx prisma generate`.
   - Run the TypeScript typecheck on affected services: `npm run build` or `npx tsc --noEmit`.
   - *Completion Criterion*: Typechecker reports 0 errors across the application seams.
```

---

## Example 2: User-Invoked Skill (`feature-planner`)

An orchestrator skill triggered strictly by the human via command.

```markdown
---
name: feature-planner
description: Interview the user to synthesize a technical specification and decompose it into tracer-bullet tickets.
disable-model-invocation: true
---

# Feature Planner

Orchestrate feature scoping, technical alignment, and ticket breakdown.

## Prerequisites

- Ensure `CONTEXT.md` is populated with current domain vocabulary.
- Confirm target issue tracker or destination path under `docs/specs/`.

## Workflow

1. **The Grilling Round**:
   - Ask probing questions regarding:
     - User problem and trigger context.
     - Affected domain models and architectural seams.
     - Boundaries, non-goals, and failure modes.
   - Present options as structured lists, never long paragraphs.
   - *Completion Criterion*: Continue the interview until every branch of the design tree has a settled decision.

2. **Synthesize the Spec**:
   - Write the technical specification to `docs/specs/<feature-name>.md`.
   - Document domain terms, database changes, API endpoints, and test seams.
   - *Completion Criterion*: User explicitly reviews and approves the spec document.

3. **Break Down into Tracer-Bullet Tickets**:
   - Divide the spec into discrete, vertically integrated tickets.
   - Each ticket must touch all required layers (data, service, API/UI) and define its blocking edges.
   - *Completion Criterion*: Tickets are saved to the tracker or `docs/tickets/` with explicit dependency ordering.
```
