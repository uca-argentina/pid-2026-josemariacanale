# El Enlace de reserva gana un segundo tramo por Sucursal

_Ampliada por la ADR 0026: el Enlace de reserva ya no lleva el prefijo `/business/` en las URLs del front; abajo se corrigieron las menciones._

ADR 0010 fijó el Enlace de reserva como una sola dirección por Negocio (`/<slug>`), y su spec dejó fuera de scope un slug propio de Sucursal. Ahora que el Cliente completa la reserva de un Turno desde esa misma página, y que cada Sucursal tiene sus propias imágenes, sus propios Servicios y sus propios horarios reservables, una sola dirección por Negocio ya no alcanza para decir a cuál Sucursal se refiere. Agregamos un segundo tramo, `Branch.slug`, único dentro del Negocio (no global, a diferencia de `Business.slug`), así el Enlace de reserva completo queda `/<negocio-slug>/<sucursal-slug>`.

## Consecuencias

- Reabre dos puntos del Out of Scope de la spec de Enlace de reserva ("slug propio de Sucursal" y "completar la reserva desde esa página"): ambos pasan a estar dentro de scope de la spec nueva.
- Un Negocio con una sola Sucursal sigue compartiendo `/<negocio-slug>` sin el segundo tramo: esa dirección redirige a su única Sucursal, así el enlace que el Dueño ya compartió no se rompe.
- Un Negocio con varias Sucursales necesita que el Dueño elija un `slug` para cada una antes de que su Enlace de reserva sea compartible.
