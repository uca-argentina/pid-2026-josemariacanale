# La Availability tiene su propia zona horaria

Hasta ahora una Availability no tenía zona horaria: sus Franjas se leían en la de la Sucursal del
Servicio. Un Empleado de dos Negocios con Sucursales en zonas distintas que usara la misma
Availability "9 a 17" para Servicios de los dos terminaba trabajando dos tramos reales distintos
del día. La Availability describe cuándo trabaja una persona, y eso pasa en la zona horaria de esa
persona, no en la del Negocio. Por eso pasa a tener `timeZone` propio, como el Schedule de cal.diy.

La Sucursal además pierde `opensAt`/`closesAt`: los Horarios reservables salen solo de las
Availability.

## Consecuencias

- Una misma Availability da el mismo tramo real sin importar en qué Sucursal está el Servicio.
- La Anulación pasa a ser de una Availability, no del Empleado, y se lee en su zona, como los date
  overrides de cal.diy. Anular la misma fecha en dos Availability son dos Anulaciones.
- Las validaciones al Reservar dejan de mirar el horario de la Sucursal.
