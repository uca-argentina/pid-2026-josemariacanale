# 03: Editar el Enlace de reserva de un Negocio (back)

**What to build:** El Dueño puede cambiar la dirección de su Enlace de reserva después de crear el Negocio, para corregir un error o acompañar un cambio de nombre. Nadie más puede tocarla. No se guarda historial: la dirección anterior deja de funcionar.

**Blocked by:** 01 (Crear Negocio con Enlace de reserva (back))

**Status:** ready-for-agent

- [ ] `UpdateBusinessDto` suma `slug` opcional, junto a `name` y `description`, con la misma regla de "solo el Dueño" que ya rige ahí
- [ ] Slug con formato inválido en la actualización → 400
- [ ] Slug ya usado por otro Negocio en la actualización → 409 con el mensaje de dirección en uso
- [ ] Actualización por un Usuario que no es el Dueño → 403
- [ ] Tests HTTP: actualización de slug por el Dueño → 200 con el slug nuevo; por otro Usuario → 403; con slug mal formado → 400
