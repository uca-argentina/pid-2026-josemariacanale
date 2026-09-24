# 06: Editar el Enlace de reserva desde el panel (front)

**What to build:** Donde el panel ya deja editar el Negocio, el Dueño puede cambiar también su Enlace de reserva, con una advertencia de que los enlaces ya compartidos dejan de funcionar al hacerlo.

**Blocked by:** 03 (Editar el Enlace de reserva de un Negocio (back))

**Status:** ready-for-agent

- [ ] Donde se pueda editar el Negocio, el formulario suma el campo del Enlace de reserva con la misma normalización que el de creación
- [ ] El formulario advierte que al cambiar la dirección los enlaces ya compartidos dejan de funcionar
- [ ] El 409 y el 400 del back se muestran como error bajo el campo, sin reportarse al crash reporter
