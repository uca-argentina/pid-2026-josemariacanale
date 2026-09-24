# 04: Búsqueda pública de Negocio por Enlace de reserva (back)

**What to build:** Cualquiera que tenga un Enlace de reserva (`/business/<slug>`) puede pedirle al back el Negocio correspondiente, sin Sesión y sin importar mayúsculas o minúsculas. Si la dirección no existe, un 404 claro.

**Blocked by:** 01 (Crear Negocio con Enlace de reserva (back))

**Status:** ready-for-agent

- [ ] Endpoint público nuevo `GET /businesses/by-slug/:slug`, sin guard
- [ ] El repositorio gana un método que busca un Negocio por su slug; si no hay, es un 404 de dominio
- [ ] El parámetro se normaliza a minúsculas antes de consultar, así que la búsqueda funciona con cualquier combinación de mayúsculas
- [ ] Devuelve el Negocio y nada más (Sucursales y Servicios los sigue sirviendo lo que ya existe: no se crea ningún endpoint agregado)
- [ ] `GET /businesses/:id` sigue público, sin cambios
- [ ] Tests HTTP: búsqueda por slug sin Sesión → 200 con el Negocio, y el repositorio recibió el slug normalizado; búsqueda con mayúsculas → mismo resultado; búsqueda por un slug inexistente → 404
- [ ] Test de repositorio contra base real: buscar por slug devuelve el Negocio, y `null` si no existe
