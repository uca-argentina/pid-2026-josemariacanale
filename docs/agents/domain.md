# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase. Front (`agendic-front/`) and back (`agendic-back/`) live in this one repo and share one glossary and one ADR series.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root: the Agendic glossary, shared by front and back. There is no per-app glossary and no `CONTEXT-MAP.md`.
- **`docs/adr/`** at the repo root: read the ADRs that touch the area you're about to work in. One series covers the whole system; an ADR that only binds one app says so in its text.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Code identifiers

The glossary is in Spanish; code is in English, in both apps (ADR 0003). Each term has exactly one identifier, the same one on both sides. Add a row when a new glossary term reaches the code; if front and back ever have to differ on a term, say so in that row.

| Glosario | Code |
| --- | --- |
| Negocio | `Business` |
| Dueño | `owner` (`Business.ownerId`) |
| Enlace de reserva | `Business.slug` (la URL del front es `/business/<slug>`) |
| Sucursal | `Branch` (apertura/cierre → `opensAt`/`closesAt`) |
| Usuario | `User` |
| Cliente | `Booking.clientName` / `Booking.clientEmail` |
| Empleado | `Employee` |
| Servicio | `Service` |
| Categoría de Servicio | `ServiceCategory` (`Service.category`) |
| Turno | `Booking` (inicio/fin → `startsAt`/`endsAt`; estado → `BookingStatus.UNVERIFIED \| BOOKED \| CANCELLED`) |
| Turno sin verificar | `BookingStatus.UNVERIFIED` |
| Reservar | `book` |
| Cancelar | `cancel` |
| Dar de baja | `retire` (`Service.retiredAt`, `Employee.retiredAt`) |
| Sesión / Iniciar sesión / Cerrar sesión | `Session` / `signIn` / `signOut` |

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (endpoints de la API), but worth reopening because…_
