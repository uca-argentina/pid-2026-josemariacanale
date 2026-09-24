# 08: Actualizar ADR 0007 con el contrato nuevo

**What to build:** El contrato de la API en `docs/adr/0007-endpoints-de-la-api.md` refleja los endpoints de Negocio ya cambiados: `GET /businesses` requiere Sesión y devuelve solo lo del Dueño, existe `GET /businesses/by-slug/:slug`, y `CreateBusinessDto`/`UpdateBusinessDto`/`presentBusiness` incluyen `slug`. Así el front no tiene que leer el código del back para saber qué cambió.

**Blocked by:** 01 (Crear Negocio con Enlace de reserva (back)), 02 (Listado de `GET /businesses` restringido al Dueño (back)), 03 (Editar el Enlace de reserva de un Negocio (back)), 04 (Búsqueda pública de Negocio por Enlace de reserva (back))

**Status:** ready-for-agent

- [ ] La fila de `GET /businesses` en la tabla de Businesses dice "sí" en Auth y describe que lista solo los del Dueño
- [ ] Se agrega la fila `GET /businesses/by-slug/:slug`, sin Auth, con su descripción
- [ ] `CreateBusinessDto` y `UpdateBusinessDto` documentados incluyen `slug`
- [ ] `presentBusiness` documentado incluye `slug`
- [ ] ADR 0010 (sin catálogo público) no se toca: ya está escrita y no cambia con este trabajo
