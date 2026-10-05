# Comments

Applies to every `.ts` / `.tsx` file in `agendic-front/` and `agendic-back/`.

## The rule

Two kinds of comment, each in its place:

- **TSDoc** (`/** … */`) on the symbol: what it does and why it exists, so the editor shows it on hover. A *why* about the whole symbol goes here, never in a `//` above it.
- **Inline `//`** on the line it explains: only a *why* the code cannot show at that spot. A workaround, a domain invariant, a non-obvious optimization, a security decision, or a gotcha found while debugging.

A comment that narrates *what* the code does gets deleted. A decision too big for a comment goes in an ADR under `docs/adr/`, linked from the TSDoc.

```ts
// Busca los turnos del día
const bookings = await bookingsRepository.findByEmployeeIdBetween(employeeId, from, to);
```

The comment above restates the call; delete it.

```ts
// `to` is exclusive: a Turno ending at midnight belongs to the previous day.
const bookings = await bookingsRepository.findByEmployeeIdBetween(employeeId, from, to);
```

This one stays: nothing in the line says the bound is exclusive or why.

```ts
/**
 * Retira un Empleado del Negocio.
 *
 * El back valida que solo el Dueño pueda retirarlo y que no sea el último
 * Empleado de un Servicio; acá no se revalida.
 */
export const retireEmployeeUseCase = …
```

The *why* about the whole use case lives in its TSDoc, where the hover shows it.

## What gets TSDoc

Every exported symbol:

- use cases, controllers and their presenters
- repository / service classes and each public method
- `entities/` schemas, inferred types and error classes
- React components whose props aren't self-explanatory

## What doesn't

File-private helpers, local variables, and tests — an `it('…')` name is the description.

## Form

One imperative summary line. Then tags, only where they add something the signature doesn't:

- `@param` / `@returns` — only when the name doesn't already say it
- `@throws` — always. Errors are the core's outward API (see `agendic-front/docs/agents/clean-architecture.md` § Errors)
- `@deprecated` — with the replacement

```ts
/**
 * Archiva un Turno del usuario autenticado.
 *
 * @throws {NotFoundError} el Turno no existe
 * @throws {UnauthorizedError} el Turno no es del usuario
 */
export const archiveBookingUseCase = …
```

Classes carry the summary on the class; each public method carries its own.

```ts
/** Acceso a Negocios contra la API del back. */
export class BusinessesRepository implements IBusinessesRepository {
    /**
     * @throws {DatabaseOperationError} la API respondió con error
     */
    async createBusiness(…) {}
}
```
