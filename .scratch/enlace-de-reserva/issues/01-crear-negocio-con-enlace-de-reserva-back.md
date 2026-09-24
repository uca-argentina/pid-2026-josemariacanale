# 01: Crear Negocio con Enlace de reserva (back)

**What to build:** Al Crear Negocio, el Dueño elige la dirección final de su Enlace de reserva (`slug`). Si la dirección ya está en uso o tiene un formato inválido, el Dueño se entera al crear, con un error específico en cada caso. El Enlace de reserva completo queda disponible en la respuesta del back para que el Dueño lo copie y comparta.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `Business` tiene una columna `slug`, `NOT NULL` y `@unique` (migración sin backfill, no hay Negocios creados todavía)
- [ ] El slug se guarda normalizado a minúsculas
- [ ] `CreateBusinessDto` exige `slug` dentro de los datos del Negocio, con formato `^[a-z0-9]+(-[a-z0-9]+)*$`, de 3 a 40 caracteres; fuera de ese formato es 400
- [ ] Crear un Negocio con un slug ya usado por otro devuelve 409 con el mensaje "esa dirección ya está en uso" (el repositorio traduce la violación del índice único, no hay consulta previa de disponibilidad)
- [ ] El presenter de Negocio devuelve `slug`
- [ ] Tests HTTP (seam `createTestApp()` + repositorio mockeado, prior art: `businesses.http.spec.ts`): creación sin `slug`, con formato inválido, muy corto y muy largo → 400 cada uno; creación con slug ya usado → 409 con el mensaje de dirección en uso
- [ ] Tests de repositorio contra base real (prior art: `prisma-businesses.repository.spec.ts`): crear dos Negocios con el mismo slug rompe con el conflicto de dirección en uso, no con el genérico
