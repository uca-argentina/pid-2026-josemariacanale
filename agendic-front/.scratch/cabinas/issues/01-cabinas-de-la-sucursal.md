## Parent

#255 (spec "Cabinas")

## Dónde trabajar

En `agendic-front/`, con las reglas de `agendic-front/CLAUDE.md` (clean architecture, componentes de UI). El glosario está en `../CONTEXT.md`, los ADRs en `../docs/adr/` y el spec en `../.scratch/cabinas/spec.md` (#255). Importan **Cabina**, **Sucursal**, **Dueño** y **Dar de baja**, y el ADR 0030 (la Cabina). La fila `Cabin` de `../docs/agents/domain.md` fija los identificadores.

## What to build

En la pantalla Business → Sucursales, cada Sucursal suma una sección **Cabinas**. Ahí el Dueño ve la lista de Cabinas de la Sucursal, agrega una con un nombre, la renombra y la da de baja. La da de baja con confirmación, explicando que deja de usarse en los Turnos nuevos.

### Contrato del back

Lo implementa #256; está en `../docs/adr/0007-endpoints-de-la-api.md`, sección "Cabins (Cabina)". Todos exigen Sesión y solo los puede hacer el Dueño (403 si no).

- `GET /branches/:id/cabins` → 200 `[{ id, branchId, name }]`, activas, ordenadas por nombre. 404 si la Sucursal no existe.
- `POST /branches/:id/cabins` `{ name }` → 201 `{ id, branchId, name }`. 409 `Cabin name <name> already in use in Branch <branchId>` (nombre repetido sin distinguir mayúsculas). 400 si el nombre está vacío o tiene más de 60 caracteres.
- `PATCH /cabins/:id` `{ name }` → 200 `{ id, branchId, name }`. El mismo 409 y el mismo 400. 404 si no existe o está dada de baja.
- `DELETE /cabins/:id` → 204. 404 si no existe o ya está dada de baja. 409 `Cabin <id> has <n> upcoming Turnos` llega recién con #258: lo maneja el ticket "La Cabina en los Turnos", así que acá basta con que cualquier error de la baja se muestre como aviso genérico.

### Qué hace el front

- Modelo `Cabin` en `src/entities/models`, con su esquema.
- Error de nombre en uso en `src/entities/errors`, al que el repositorio traduce el 409.
- Puerto y repositorio HTTP de Cabinas.
- Use cases y controllers: listar, crear, renombrar, dar de baja.
- Server actions para el formulario.
- El nombre se valida en el cliente (requerido, hasta 60 caracteres) y el 409 se muestra bajo el campo.
- Después de cada cambio se refresca la lista.

## Acceptance criteria

- [ ] El Dueño ve, agrega, renombra y da de baja Cabinas en cada Sucursal desde Business → Sucursales.
- [ ] El 409 de nombre en uso se muestra bajo el campo; el 400 y la validación local también.
- [ ] La baja pide confirmación.
- [ ] Tests de los use cases (repositorio mockeado), del repositorio HTTP (traducción del 409) y de las server actions.
- [ ] `npx tsc --noEmit` y `npm test` pasan.

## Blocked by

- #256 (Cabinas · back 01: Gestión de Cabinas de la Sucursal)
