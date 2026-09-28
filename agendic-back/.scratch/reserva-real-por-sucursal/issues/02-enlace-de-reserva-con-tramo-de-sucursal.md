# 02: Enlace de reserva con tramo de Sucursal

**Spec:** `../../../../.scratch/reserva-real-por-sucursal/spec.md`
**ADR relevante:** `../../../../docs/adr/0014-enlace-de-reserva-con-tramo-de-sucursal.md`, actualizar `../../../../docs/adr/0007-endpoints-de-la-api.md`

**Dónde trabajar:** `agendic-back/`. Glosario y ADRs en la raíz (`../CONTEXT.md`, `../docs/adr/`).

**What to build:** `Branch` gana su propio `slug`, así el Enlace de reserva puede llegar hasta una Sucursal concreta (`/business/<negocio-slug>/<sucursal-slug>`, ADR 0014), no solo hasta el Negocio.

**Blocked by:** Ninguno (puede arrancar ya).

- [ ] `Branch` tiene un campo `slug`, único **dentro del mismo Negocio** (no global — dos Negocios distintos pueden tener Sucursales con el mismo `slug`).
- [ ] Mismo formato que `Business.slug`: minúsculas, números y guiones simples entre segmentos (`^[a-z0-9]+(-[a-z0-9]+)*$`), 3-40 caracteres; se guarda ya normalizado a minúsculas.
- [ ] Crear Sucursal (`POST /businesses/:businessId/branches`) y actualizarla (`PATCH /branches/:id`) aceptan `slug`; solo el Dueño puede hacerlo (ya es así hoy para el resto de los campos).
- [ ] `slug` repetido dentro del mismo Negocio → 409 con un mensaje de "esa dirección ya está en uso" (mismo patrón que el 409 de `Business.slug`). `slug` mal formado → 400.
- [ ] La respuesta de Sucursal (`presentBranch`, tanto en la creación como en `GET /businesses/:businessId/branches`) incluye `slug`.
- [ ] `docs/adr/0007-endpoints-de-la-api.md` queda actualizado con el campo nuevo en los DTOs y la respuesta de Sucursal.
- [ ] Tests HTTP: crear con `slug` repetido en el mismo Negocio → 409; en Negocios distintos → 201 en ambos; `slug` mal formado → 400; actualizar `slug` por el Dueño → 200; por otro Usuario → 403.

**Qué necesita el front:** el ticket 05 (página real de Sucursal) resuelve `/business/<negocio-slug>/<sucursal-slug>` buscando, dentro de las Sucursales del Negocio, la que tenga ese `slug`; si ninguna matchea, es 404 de la página. No hace falta ningún endpoint combinado nuevo para esa resolución.
