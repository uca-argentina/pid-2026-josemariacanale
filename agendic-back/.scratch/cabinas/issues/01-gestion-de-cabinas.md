## Parent

#255 (spec "Cabinas")

## Dónde trabajar

En `agendic-back/`. El glosario está en `../CONTEXT.md`, los ADRs en `../docs/adr/` y el spec en `../.scratch/cabinas/spec.md` (#255). Importan **Cabina**, **Sucursal**, **Dueño** y **Dar de baja**; ADR 0030 (la Cabina), ADR 0004 (únicos parciales escritos a mano en la migración) y ADR 0007 (endpoints). La fila `Cabin` de `../docs/agents/domain.md` fija los identificadores.

## What to build

El Dueño carga, lista, renombra y da de baja las Cabinas de cada Sucursal de su Negocio. Todavía ningún Servicio las admite ni ningún Turno las ocupa: este ticket deja el catálogo de Cabinas andando de punta a punta (modelo, migración, casos de uso, endpoints y tests).

### Modelo

- `Cabin`: `id`, `branchId`, `name`, `deletedAt` (timestamptz, nullable; dada de baja = no null).
- Único parcial escrito a mano en la migración: `(branchId, lower(name))` donde `deletedAt` es null. El nombre se puede repetir en otra Sucursal y se puede reusar el de una Cabina dada de baja.
- El adapter de Prisma traduce la violación de ese único (P2002, ver ADR 0004 § Consecuencias) al mismo error de dominio de nombre en uso.

### Contrato

Todos exigen Sesión y solo los puede hacer el Dueño del Negocio de la Sucursal (403 si es otro Usuario). Un Negocio dado de baja responde como inexistente (ADR 0024).

- `GET /branches/:id/cabins`: 200 con `[{ id, branchId, name }]`, las activas, ordenadas por nombre. 404 si la Sucursal no existe.
- `POST /branches/:id/cabins` `{ name }`: 201 con `{ id, branchId, name }`. 404 si la Sucursal no existe. 409 `Cabin name <name> already in use in Branch <branchId>` (sin distinguir mayúsculas, entre las activas). 400 si `name` falta, está vacío después de recortarlo o tiene más de 60 caracteres; el nombre se guarda recortado.
- `PATCH /cabins/:id` `{ name }`: 200 con la Cabina. Mismo 409 y mismo 400. 404 si no existe o está dada de baja.
- `DELETE /cabins/:id`: 204 y marca `deletedAt`. 404 si no existe o ya está dada de baja. (El 409 por Turnos futuros lo suma el ticket "Reservar ocupa una Cabina", cuando exista `Booking.cabinId`.)

Sumar estos endpoints a `../docs/adr/0007-endpoints-de-la-api.md`, en una sección "Cabins (Cabina)" después de las Imágenes de Sucursal.

### Qué necesita el front

El front muestra el 409 de nombre bajo el campo del nombre. Después de crear, renombrar o dar de baja, vuelve a pedir la lista.

## Acceptance criteria

- [ ] Migración con la tabla `Cabin` y el único parcial; `npx prisma generate` y `npx tsc --noEmit` pasan.
- [ ] Los cuatro endpoints responden según el contrato, con los 400, 403, 404 y 409 descritos.
- [ ] Spec HTTP nueva de Cabinas con `createTestApp`, cubriendo cada caso del contrato.
- [ ] Spec del repositorio contra la base real: el único es por Sucursal, no distingue mayúsculas e ignora las dadas de baja; la violación sale como el error de dominio de nombre en uso.
- [ ] ADR 0007 actualizado.
- [ ] `npm test` pasa entero.

## Blocked by

None (can start immediately)
