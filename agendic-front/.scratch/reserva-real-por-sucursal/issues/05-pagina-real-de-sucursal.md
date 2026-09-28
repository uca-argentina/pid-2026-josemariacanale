# 05: Página real de Sucursal

**Spec:** `../../../../.scratch/reserva-real-por-sucursal/spec.md`
**ADR relevante:** `../../../../docs/adr/0014-enlace-de-reserva-con-tramo-de-sucursal.md`, `../../../../docs/adr/0007-endpoints-de-la-api.md`

**Dónde trabajar:** `agendic-front/`. Glosario y ADRs en la raíz (`../CONTEXT.md`, `../docs/adr/`), reglas de esta app en `agendic-front/CLAUDE.md` (clean architecture y ui-components).

**What to build:** reemplazar la maqueta estática (`/businessPage`, datos de `mock-business.ts`) por la página pública real del Enlace de reserva, en `/business/<negocio-slug>/<sucursal-slug>`, con Negocio, Sucursal, Servicios (con su Seña si tiene), profesionales y otras Sucursales reales, pedidos al back. No incluye todavía imágenes reales (ticket 06) ni la reserva del Turno en sí (ticket 07): esos pasos siguen mockeados/ocultos en este ticket.

**Blocked by:** 02 (back: `Branch.slug`), 03 (back: `Service.depositPercent`).

**Contrato del back a consumir:**

- `GET /businesses/by-slug/:slug` — sin Sesión. `:slug` es el primer tramo de la URL (Negocio). Devuelve `{ id, name, description, slug, ownerId }`. 404 si no existe (comparación case-insensitive, el back ya normaliza).
- `GET /businesses/:businessId/branches` — sin Sesión. Devuelve el array de Sucursales de ese Negocio: `{ id, businessId, name, address, opensAt, closesAt, timeZone, slug }` (el campo `slug` lo agrega el ticket 02). El segundo tramo de la URL (Sucursal) se resuelve buscando, dentro de este array, la que tenga ese `slug`; si ninguna matchea, es 404 de la página — no hay endpoint combinado.
- `GET /branches/:id/services` — sin Sesión. Devuelve los Servicios activos de esa Sucursal: `{ id, branchId, name, description, category, durationMinutes, price, depositPercent, employees: [{id, name}] }` (`depositPercent` lo agrega el ticket 03; puede venir `null`, significa sin Seña).
- Los "profesionales que atienden la Sucursal" no tienen endpoint propio: se derivan uniendo, sin duplicados, los `employees` de todos los Servicios de esa Sucursal.

**Acceptance criteria:**

- [ ] `/business/[negocioSlug]/[sucursalSlug]/` es una ruta dinámica nueva, server component, que resuelve el controlador por DI (nada de fetch propio del componente).
- [ ] Muestra: Servicios activos con nombre, duración, precio y Seña si tiene (oculta esa línea si `depositPercent` es `null`); profesionales derivados (deduplicados); horario de apertura/cierre de la Sucursal; las demás Sucursales del mismo Negocio, cada una con un link a su propia página (`/business/[negocioSlug]/[esa-otra-sucursal-slug]`).
- [ ] `Negocio` inexistente, `Sucursal` que no existe, o `Sucursal` que existe pero es de otro Negocio → 404 del framework.
- [ ] `/business/[negocioSlug]/` (sin Sucursal): si el Negocio tiene una sola Sucursal, redirige a `/business/[negocioSlug]/[esa-sucursal]`; si tiene varias, muestra un selector simple con links a cada una.
- [ ] Se borran `mock-business.ts` y los mocks de Negocio/Sucursal/Servicio/profesionales en `types.ts`; solo quedan los tipos y mocks que sigan haciendo falta para lo que todavía no está conectado (horarios reservables y reserva en sí, ticket 07).
- [ ] Tests unitarios por capa (controlador, caso de uso, adaptador, contenedor), puertos stubeados, siguiendo el prior art de la spec de Enlace de reserva anterior (`../../../../docs/specs/enlace-de-reserva.md`).
