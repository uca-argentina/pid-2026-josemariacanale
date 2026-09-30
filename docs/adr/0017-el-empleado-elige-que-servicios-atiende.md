# El Empleado elige qué Servicios atiende

Reabre otra parte de la ADR 0013 (y del "sigue sin haber panel de Negocio para un Empleado" de la
0016): la página de Servicios del panel le muestra a cada Usuario los Servicios de todos los
Negocios de los que es Empleado activo, no solo los del Negocio del que es Dueño. La razón de ser
Empleado de un Negocio es poder atender cualquiera de sus Servicios, así que Ofrecer un Servicio no
puede depender de que el Dueño lo haga por él.

Sobre un Servicio de un Negocio ajeno, el Empleado puede tres cosas, siempre sobre sí mismo:
Ofrecerlo, elegir con cuál de sus Availability lo atiende, y dejar de ofrecerlo (salvo que sea el
último). Para eso también lee sus propias Availability. Todo lo demás del Servicio (crear, editar,
ocultar, Dar de baja, Ofrecer o quitar a otro Empleado) sigue siendo solo del Dueño.

## Consecuencias

- Los endpoints de Empleados de un Servicio dejan de ser solo del Dueño: los acepta también el
  propio Empleado cuando el `employeeId` es el suyo.
- Un Servicio oculto no entra en el catálogo de un Empleado que no lo atiende: para él no existe
  (404), así que no puede Ofrecerlo.
- Editar las Availability sigue siendo una pantalla del Dueño (issue #13). Que el Empleado edite
  las suyas es una spec aparte.
