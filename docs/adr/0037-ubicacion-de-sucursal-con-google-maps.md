# La Ubicación de la Sucursal se carga y se muestra con Google Maps Platform

La Sucursal pasa a tener Ubicación: su dirección y su punto en el mapa. El Dueño escribe la dirección con autocompletado, de ahí salen las coordenadas, y puede corregir el punto a mano en el mapa. El Cliente ve las Sucursales de un Negocio en un mapa dentro de su Enlace de reserva.

Elegimos Google Maps Platform (Maps JavaScript API y Places Autocomplete) frente a Mapbox y MapLibre/Leaflet con OpenStreetMap. OpenStreetMap no tiene un autocompletado usable: la política de uso de Nominatim prohíbe usarlo para autocompletar mientras se escribe. Mapbox era viable, pero Google tiene mejores datos de direcciones en Argentina, el mapa es el que el Cliente ya conoce, y el volumen de Agendic entra en la cuota gratuita mensual.

El mapa sigue dentro del Enlace de reserva de un Negocio: no es un catálogo de la plataforma, así que la ADR 0010 sigue en pie.

## Consecuencias

- Hace falta una API key de Google con facturación habilitada, restringida por dominio para el front.
- Se guardan las coordenadas, no el identificador de lugar de Google: cambiar de proveedor después solo cambia el autocompletado y el dibujo del mapa, no los datos.
- La dirección que ve el Cliente es la que eligió el Dueño, no una que se recalcula desde las coordenadas.
