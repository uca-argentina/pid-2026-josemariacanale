# 02: Listado de `GET /businesses` restringido al Dueño (back)

**What to build:** `GET /businesses` deja de ser un catálogo público. Pasa a requerir Sesión y devuelve únicamente los Negocios de los que el Usuario del token es Dueño, vacío si no tiene ninguno, y 401 si no hay Sesión (ADR 0010).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `GET /businesses` lleva `ClerkGuard` y recibe el Usuario actual
- [ ] El caso de uso de listar Negocios recibe el `userId` y pide al repositorio los Negocios de ese Dueño
- [ ] El repositorio cambia `list()` por un método que filtra por Dueño; el `findMany()` sin filtro desaparece
- [ ] Sin Sesión: 401
- [ ] Con Sesión y sin Negocios: `200 []`
- [ ] Tests HTTP: listado con Sesión devuelve los Negocios de ese Dueño y el repositorio se llamó con el id del Usuario del token; listado con Sesión de otro Usuario devuelve lo suyo (hay helpers para dos Sesiones distintas); listado sin Sesión → 401 (dar vuelta el test actual, que afirma que lista sin Sesión); listado con Sesión y sin Negocios → `200 []`
