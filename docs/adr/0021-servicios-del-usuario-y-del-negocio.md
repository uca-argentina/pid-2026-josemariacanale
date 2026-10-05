# Servicios del Usuario y del Negocio

Reabre las ADR 0013 y 0017 (solo se atiende un Servicio siendo Empleado de un Negocio) y amplía las
0014 y 0018 (el Enlace de reserva siempre pasa por Negocio y Sucursal). Seguimos el modelo de
cal.diy, donde un EventType es de un usuario o de un team: un Servicio es **personal**, de un
Usuario, o **del Negocio**, de una Sucursal, nunca de los dos. El Negocio deja de ser condición para
ofrecer Servicios y pasa a ser un grupo que los comparte.

Descartamos mantener el Servicio colgado siempre de un Negocio, con un "Negocio de una persona"
implícito para quien trabaja solo. Obligaba a Crear Negocio y Sucursal para ofrecer un solo
Servicio, y chocaba con la ADR 0012 para quien además es Dueño de otro Negocio.

## Consecuencias

- La Availability es del Usuario, no del Empleado, y todo Usuario nace con una predeterminada (lunes
  a viernes de 9 a 17, `America/Argentina/Buenos_Aires`). La Anulación es de una Availability
  (ADR 0020).
- En un Servicio del Negocio el Cliente no elige Empleado. Ve la unión de los Horarios reservables
  de quienes lo Ofrecen, y al Reservar se le asigna el Empleado libre que hace más tiempo que no
  recibe un Turno de ese Servicio (ROUND_ROBIN de cal).
- La Cobertura desaparece: con asignación automática, la Anulación de un Empleado ya deja que los
  demás atiendan.
- Los Turnos ocupan al Usuario, no al vínculo Empleado: un Turno de un Servicio personal bloquea
  ese tramo en todos sus Negocios, y viceversa.
- El Usuario tiene su propio Enlace de reserva, `/u/<usuario>/<servicio>`, separado de
  `/business/...` para que los slugs no choquen.
