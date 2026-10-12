## Parent

#255 (spec "Cabinas")

## Dónde trabajar

En `agendic-back/`. El glosario está en `../CONTEXT.md`, los ADRs en `../docs/adr/` y el spec en `../.scratch/cabinas/spec.md` (#255). Importan **Cabina**, **Servicio del Negocio** y **Servicio personal**; ADR 0021 (Servicios del Usuario y del Negocio), ADR 0030 (la Cabina) y ADR 0007 (endpoints).

## What to build

El Dueño elige qué Cabinas de la Sucursal admite cada Servicio del Negocio, al crearlo o al editarlo. El panel ve ese conjunto en el Servicio; las páginas públicas no. Dar de baja una Cabina la saca de todos los Servicios que la admitían. Los Turnos todavía no ocupan Cabinas (eso es el ticket siguiente).

### Modelo

- `ServiceCabin` (`serviceId`, `cabinId`), clave primaria compuesta. Es el conjunto de Cabinas que admite un Servicio del Negocio.
- Dar de baja una Cabina (`DELETE /cabins/:id`) borra sus filas de `ServiceCabin` en la misma transacción.

### Contrato

- `POST /branches/:id/services` y `PATCH /services/:id` aceptan `cabinIds?: number[]` (enteros, sin repetidos). Si viene, reemplaza el conjunto entero; `[]` deja al Servicio sin Cabinas; si no viene, no se toca.
  - 422 `Cabin <cabinId> is not an active Cabin of Branch <branchId>` si alguna no existe, es de otra Sucursal o está dada de baja.
  - En un Servicio personal (`PATCH /services/:id` sobre uno, o `POST /users/me/services`), 422 `A personal Service has no Cabins`.
- Las respuestas del Servicio en el panel suman `cabins: [{ id, name }]`, ordenadas por nombre y solo las activas. Esas respuestas son:
  - el catálogo `GET /employees/me/services`;
  - crear y editar un Servicio;
  - Ofrecer (`POST /services/:id/employees`);
  - cambiar la Availability de un Empleado (`PATCH /services/:id/employees/:employeeId`).

  En un Servicio personal (`GET`/`POST /users/me/services`) siempre es `[]`.
- Las vistas públicas no lo exponen: `GET /branches/:id/services`, `GET /branches/:id/services/by-slug/:slug`, `GET /u/:userSlug` y `GET /u/:userSlug/:serviceSlug`.
- Sumarlo a `../docs/adr/0007-endpoints-de-la-api.md`, en la sección de Services.

### Qué necesita el front

El detalle del Servicio en el panel sale del catálogo `GET /employees/me/services`, así que `cabins` tiene que venir ahí. El front guarda los checkboxes con `PATCH /services/:id` `{ cabinIds }` y muestra el 422 como aviso.

## Acceptance criteria

- [ ] Migración con `ServiceCabin`; `npx prisma generate` y `npx tsc --noEmit` pasan.
- [ ] Crear y editar un Servicio del Negocio con `cabinIds` guarda el conjunto; `[]` lo vacía; sin el campo no se toca.
- [ ] 422 por Cabina ajena, dada de baja o inexistente, y por `cabinIds` en un Servicio personal.
- [ ] `cabins` sale en las vistas del panel listadas y no en las públicas.
- [ ] Dar de baja una Cabina la saca de los Servicios que la admitían.
- [ ] Specs HTTP de Servicios (y de Servicios personales para el 422) y de Cabinas cubriendo lo anterior.
- [ ] ADR 0007 actualizado.
- [ ] `npm test` pasa entero.

## Blocked by

- #256 (Cabinas · back 01: Gestión de Cabinas de la Sucursal)
