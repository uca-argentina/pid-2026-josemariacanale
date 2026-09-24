# 05: Formulario de Crear Negocio expone el Enlace de reserva (front)

**What to build:** Al Crear Negocio desde el panel, el Dueño escribe la parte final de su Enlace de reserva y ve el resto de la URL armado alrededor (`agendic.com/business/` + lo que escribe). Si la dirección ya está tomada, se entera bajo ese mismo campo, sin un error genérico.

**Blocked by:** 01 (Crear Negocio con Enlace de reserva (back))

**Status:** ready-for-agent

- [ ] El formulario de Crear Negocio suma el campo del Enlace de reserva, mostrado como `agendic.com/business/` + lo que se escribe
- [ ] El input normaliza mientras se tipea: a minúsculas y espacios a guiones
- [ ] El 409 del back se muestra como error bajo ese campo, con el texto de dirección ya tomada; no se reporta al crash reporter, porque es un error esperable del Usuario
