# El Cliente elige el Empleado

Reabre de la ADR 0021 la consecuencia «En un Servicio del Negocio el Cliente no elige Empleado». Amplía la ADR 0026: el Empleado elegido sale del tramo del enlace o de la lista de la página de reserva, con la misma semántica. Spec: #251.

En un Servicio del Negocio, el Cliente puede elegir desde la página de reserva con qué Empleado Reservar, entre quienes lo Ofrecen, o dejar «Cualquiera».

- Elegir desde la lista es el mismo **Empleado elegido** de la ADR 0026, con `employeeChosen = true`: si el horario se ocupa no se pasa a otro Empleado (422), y al Reagendar solo se aceptan horarios de esa persona.
- «Cualquiera» es la asignación automática de siempre (round robin): el Turno queda sin Empleado elegido.
- No hay atributo del Servicio para apagar la elección.
- Si se entra por el Enlace de reserva de un Empleado (`/<negocio>/<sucursal>/<servicio>/<empleado>`), viene preseleccionado y el Cliente puede cambiarlo.
- La URL no refleja la elección: cambiar en la lista no cambia el tramo de Empleado.

## Qué no cambia

El contrato de la API: `GET /services/:id/slots` y `POST /bookings` ya aceptan `employeeId` (ADR 0007). Sin `employeeId`, los Horarios reservables son la unión de los de cada Empleado. No hay migración ni campo nuevo.

## Alternativas descartadas

- **La elección como simple preferencia** (`employeeChosen` falso, con el Empleado como primera opción pero reasignable). Son dos conceptos para lo mismo: el Cliente que elige a alguien espera que lo atienda esa persona.
- **Un atributo del Servicio para apagarla.** Agrega configuración para un caso que ya se resuelve con una sola lista, y «Cualquiera» sigue disponible para quien no quiere elegir.
- **Un paso propio en el flujo de reserva.** Alarga la reserva para quien deja «Cualquiera», que es el caso común; la lista vive en la misma página que los Horarios reservables.
- **Sincronizarla con el tramo de Empleado de la URL.** Un Empleado sin `User.slug` no tendría tramo y no podría elegirse.
