# Comments

Applies to every `.ts` / `.tsx` file in `agendic-front/` and `agendic-back/`.

## The rule

No inline comments. Ever. Every explanation goes in a TSDoc block (`/** … */`) attached to the symbol it describes, so the editor shows it on hover.

There is no exception. A non-obvious *why* — a workaround, a domain invariant, a decision — belongs in the symbol's TSDoc, or in an ADR under `docs/adr/` linked from it. A comment that narrates what the next line does gets deleted instead of moved.

```ts
// wrong: the reader already sees the call; the tooltip stays empty
// "Only the Dueño" and "not the last Empleado of a Servicio" are enforced by the back.
export const retireEmployeeUseCase = …
```

```ts
/**
 * Retira un Empleado del Negocio.
 *
 * El back valida que solo el Dueño pueda retirarlo y que no sea el último
 * Empleado de un Servicio; acá no se revalida.
 */
export const retireEmployeeUseCase = …
```

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
