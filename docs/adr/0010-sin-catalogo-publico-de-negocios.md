# Sin catálogo público de Negocios: el Cliente llega por un Enlace de reserva

ADR 0007 dejó `GET /businesses` público, listando todos los Negocios de la plataforma. Lo cerramos: pasa a requerir Sesión y a devolver solo los Negocios del Dueño del token, que es lo que el panel necesita. El Cliente no descubre Negocios dentro de Agendic; entra por el Enlace de reserva que el Negocio comparte (`/business/<slug>`), y desde ahí ve sus Sucursales y sus Servicios activos.

Un catálogo público es un producto distinto del que estamos construyendo: necesita búsqueda, filtros por Rubro y zona, orden, y una decisión sobre qué Negocio aparece primero. Además enumerar la plataforma entera expone a cada Negocio ante sus competidores sin que nadie lo haya pedido. Agendic es la agenda del Negocio, no su canal de captación.

## Consecuencias

- Un Negocio sin Enlace de reserva compartido es invisible: no hay forma de llegar a él desde Agendic. Es el comportamiento buscado, y hace del slug un dato que el Dueño tiene que poder elegir y comunicar.
- El slug es editable y no se guarda historial: cambiarlo rompe todo enlace ya compartido. Se acepta a cambio de no arrastrar una tabla de slugs viejos con su política de expiración. Si los enlaces rotos se vuelven un problema real, el camino es el redirect, no volver al catálogo.
- `GET /businesses/:id` sigue público, igual que el listado de Sucursales de un Negocio y el de Servicios de una Sucursal: sin ellos el Enlace de reserva no puede renderizar nada. Lo que se cierra es la enumeración, no el detalle.
- Una futura pantalla de Administrador que necesite ver todos los Negocios no puede usar este endpoint y va a necesitar el suyo.
