# El Enlace de reserva gana un tercer tramo por Servicio

Extiende la ADR 0014. El Dueño quiere compartir una dirección que lleve directo a un Servicio, así
que el Servicio gana su propio tramo, `Service.slug`:
`/business/<negocio-slug>/<sucursal-slug>/<servicio-slug>` abre la página de la Sucursal con ese
Servicio ya elegido. No es una página aparte: es la misma página de reserva con un paso resuelto.

El tramo es único dentro de su Sucursal entre los Servicios no dados de baja (índice parcial, ADR
0004), nace del nombre y el Dueño puede cambiarlo; al cambiarlo, el anterior deja de funcionar,
igual que los otros dos tramos.

## Consecuencias

- Es la única puerta a un Servicio oculto: la página de la Sucursal no lo lista, pero su enlace
  directo lo muestra y deja Reservar. Ocultar no es una medida de seguridad, es sacar de la vidriera.
- El tramo de un Servicio dado de baja responde 404 y queda libre para otro Servicio.
- Migración sin backfill: la base de desarrollo se recrea.
