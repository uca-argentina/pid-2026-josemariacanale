## Parent

#255 (spec "Cabinas")

## Dónde trabajar

En `agendic-front/`, con las reglas de `agendic-front/CLAUDE.md`. El glosario está en `../CONTEXT.md`, los ADRs en `../docs/adr/` y el spec en `../.scratch/cabinas/spec.md` (#255). Importan **Cabina**, **Servicio del Negocio** y **Servicio personal**, y el ADR 0030.

## What to build

El detalle de un Servicio del Negocio en el panel suma una pestaña **Cabinas**, con un checkbox por cada Cabina activa de su Sucursal. El Dueño marca cuáles admite el Servicio y guarda; sin ninguna marcada, el Servicio no usa Cabinas. Un texto corto explica que cada Turno ocupa una de las Cabinas marcadas y que, sin Cabinas, el Servicio depende solo de sus Empleados. Un Empleado que no es Dueño ve la pestaña en solo lectura, con los nombres de las Cabinas que admite. Un Servicio personal no muestra la pestaña. Si la Sucursal no tiene Cabinas, la pestaña lo dice y lleva a Business → Sucursales.

### Contrato del back

Lo implementa #257; está en `../docs/adr/0007-endpoints-de-la-api.md`.

- El Servicio del catálogo `GET /employees/me/services` (y las respuestas de crear y editar un Servicio, y de Ofrecer) trae `cabins: [{ id, name }]`, las Cabinas activas que admite, ordenadas por nombre. En un Servicio personal es `[]`.
- `PATCH /services/:id` acepta `cabinIds: number[]`, que reemplaza el conjunto entero (`[]` lo vacía). Exige Sesión y es solo del Dueño. Responde 200 con el Servicio. 422 `Cabin <cabinId> is not an active Cabin of Branch <branchId>` si alguna Cabina ya no es válida (por ejemplo, se dio de baja en otra pestaña).
- Las Cabinas de la Sucursal para armar los checkboxes salen de `GET /branches/:id/cabins` (solo el Dueño, ver #260).

### Qué hace el front

- El modelo de Servicio suma `cabins`.
- Se suma la operación de guardar `cabinIds`, reusando el repositorio de Servicios y la edición existente si encaja.
- Reusa el listado de Cabinas de #260.
- El 422 se muestra como aviso y se vuelve a pedir la lista de Cabinas.

## Acceptance criteria

- [ ] La pestaña Cabinas aparece en Servicios del Negocio y no en Servicios personales.
- [ ] El Dueño marca y desmarca Cabinas y guarda; al recargar, se ve lo guardado.
- [ ] Un Empleado no Dueño la ve en solo lectura.
- [ ] Sin Cabinas en la Sucursal, la pestaña lo dice y enlaza a Sucursales.
- [ ] El 422 se muestra como aviso.
- [ ] Tests del use case o de la action de guardar Cabinas y del repositorio (envío de `cabinIds`, traducción del 422).
- [ ] `npx tsc --noEmit` y `npm test` pasan.

## Blocked by

- #257 (Cabinas · back 02: El Servicio admite Cabinas)
- #260 (Cabinas · front 01: Cabinas de la Sucursal)
