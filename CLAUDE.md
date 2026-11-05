Agendic es una plataforma de gestión de turnos para negocios de servicios. El front (Next.js) vive en `agendic-front/` y el back (NestJS + Prisma + Postgres) en `agendic-back/`. Comparten glosario, ADRs e issue tracker, todos en la raíz.

Cada app tiene su propio `CLAUDE.md` con las reglas que solo valen ahí.

@docs/agents/errors.md
@docs/agents/testing.md

- Glosario: `CONTEXT.md`. Antes de nombrar un concepto del dominio (código, issue, test), leé los términos del área que vas a tocar.
- Término → identificador de código: `docs/agents/domain.md`. Buscá el término con grep; no lo leas entero.
- Issues y tickets: leé `docs/agents/issue-tracker.md` antes de crear o editar uno.
