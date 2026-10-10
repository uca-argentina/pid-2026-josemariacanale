# Agendic

Plataforma de gestión de turnos para negocios de servicios (clínicas, spas, gimnasios, academias, etc.). El Negocio publica su agenda; el Cliente reserva y gestiona sus turnos desde la web o la app.

## Language

### Actores

**Negocio**:
Grupo de Usuarios que comparten Servicios: los Servicios del Negocio los atiende cualquiera de sus Empleados que los Ofrezca. No hace falta un Negocio para ofrecer Servicios; un Usuario solo tiene sus Servicios personales.
_Avoid_: empresa, cuenta, cliente (cuando se refiere al negocio)

**Cliente**:
Persona que reserva un Turno dejando un nombre y un email, y verificándolo al Reservar. No hace falta que sea un Usuario. Cada Turno tiene su propio Cliente: el mismo email en dos Turnos son dos Clientes, que no se juntan en ninguna parte.
_Avoid_: usuario final, paciente, consumidor

**Sucursal**:
Sede física de un Negocio, con zona horaria propia. Un Negocio puede tener varias. No tiene horario de apertura ni de cierre: los Horarios reservables salen solo de las Availability de sus Empleados. Solo los Servicios del Negocio tienen Sucursal. Puede tener una descripción propia, opcional, que en su página pública reemplaza a la del Negocio.
_Avoid_: sede, local

**Empleado**:
Usuario que atiende los Servicios del Negocio. Puede atender cualquiera de ellos. Un Usuario puede ser Empleado de varios Negocios a la vez, sea o no Dueño de otro.
_Avoid_: recurso

**Staff**:
El conjunto de Empleados de un Negocio. Solo se usa en plural/colectivo.

**Invitación**:
Pedido del Dueño a una persona, identificada por su email, para que sea Empleado de su Negocio. No hace Empleado a nadie hasta que la persona la acepta. Si la persona todavía no es Usuario, además recibe un mail que la invita a crearse una cuenta de Agendic.
_Avoid_: solicitud, pedido, agregar Empleado (eso saltea la aceptación)

**Aceptar invitación**:
Acción del Usuario invitado, dentro de la app, de pasar a ser Empleado del Negocio que lo invitó.
_Avoid_: confirmar invitación, unirse

**Usuario**:
Persona identificada por Agendic, con contraseña o con un Proveedor de identidad. Puede ser Dueño de cero o un Negocio.
_Avoid_: cuenta, perfil

**Dueño**:
Usuario que creó un Negocio y lo gestiona. Un Usuario es Dueño de un solo Negocio; quien quiera otro Negocio se registra como otro Usuario con otro email. Es además Empleado de su propio Negocio.
_Avoid_: owner, titular, admin

**Crear Negocio**:
Acción de un Usuario de dar de alta un Negocio con sus datos. Solo puede hacerlo un Usuario que todavía no es Dueño de un Negocio. Al hacerlo pasa a ser su Dueño. Se crea con su primera Sucursal y puede crearse sin Servicio: el Dueño lo agrega después.
_Avoid_: registrar negocio, alta de negocio, onboarding

**Administrador**:
Usuario del equipo de Agendic que gestiona la plataforma. No gestiona Negocios.
_Avoid_: admin, superusuario

### Acceso

**Proveedor de autenticación**:
Servicio externo que Agendic usa para identificar a sus Usuarios: guarda sus credenciales, les manda el Código de verificación, abre sus Sesiones y habla con los Proveedores de identidad. Es dueño de la identidad; el Usuario de negocio sigue siendo del back.
_Avoid_: proveedor de identidad (eso es otra cosa), auth provider, IdP

**Proveedor de identidad**:
Servicio externo (Google, Microsoft) con el que un Usuario puede registrarse e iniciar sesión, a través del Proveedor de autenticación.
_Avoid_: provider, OAuth

**Registro pendiente**:
Alta de un Usuario que todavía no verificó su email. No tiene Sesión.
_Avoid_: cuenta sin verificar, pending user

**Sesión**:
Período durante el cual un Usuario queda identificado, desde que se registra o inicia sesión hasta que cierra sesión o la sesión vence.
_Avoid_: login (como sustantivo)

**Iniciar sesión**:
Acción del Usuario de identificarse con sus credenciales para abrir una Sesión.
_Avoid_: login, loguearse, entrar

**Cerrar sesión**:
Acción del Usuario de terminar su Sesión.
_Avoid_: logout, log-out, desloguearse, salir

**Verificar email**:
Ingresar el Código de verificación recibido por email para probar que la dirección es real.
_Avoid_: confirmar email

**Código de verificación**:
Código que llega por email para Verificar email. Vence. Al Usuario se lo manda el Proveedor de autenticación y, al ingresarlo, queda con una Sesión abierta. Al Cliente se lo manda Agendic al Reservar, que lo pide en seis casillas, una por carácter; no abre una Sesión.
_Avoid_: link de verificación, link de confirmación, magic link

### Agenda

**Servicio**:
Prestación con duración y precio que se puede Reservar. Es o un Servicio personal o un Servicio del Negocio, nunca los dos. No confundir con los microservicios de la arquitectura.
_Avoid_: prestación, tratamiento

**Servicio personal**:
Servicio de un Usuario, sin Negocio ni Sucursal. Lo atiende solo ese Usuario, con una de sus Availability.
_Avoid_: servicio individual, servicio propio

**Servicio del Negocio**:
Servicio de una Sucursal de un Negocio, atendido por los Empleados que lo Ofrecen. El Cliente no elige con quién: al Reservar se le asigna un Empleado libre en ese horario, el que hace más tiempo que no recibe un Turno de ese Servicio.
_Avoid_: servicio de equipo, servicio compartido

**Intervalo**:
Cada cuántos minutos arranca un Horario reservable de un Servicio. Opcional: sin Intervalo, es la duración del Servicio.
_Avoid_: frecuencia, grilla, paso

**Anticipación mínima**:
Minutos que tienen que faltar como mínimo para el inicio de un Turno al Reservarlo. Opcional: sin ella, se puede Reservar hasta el último momento.
_Avoid_: aviso previo, minimum notice

**Ofrecer un Servicio**:
Acción de un Empleado de empezar a atender un Servicio del Negocio, con una de sus Availability. La hace él mismo o el Dueño por él. Su contraria es dejar de ofrecerlo, que no se puede si es el último Empleado del Servicio.
_Avoid_: asignarse, tomar un servicio

**Servicio oculto**:
Servicio que el Dueño sacó de la página de su Sucursal. Se puede Reservar solo entrando por su propio Enlace de reserva. Sus Turnos siguen en pie. En el panel lo ven el Dueño y los Empleados que lo atienden.
_Avoid_: servicio inactivo, desactivado, privado, dado de baja (eso es otra cosa)

**Tiempo de preparación**:
Minutos que el Empleado necesita libres justo antes de cada Turno de un Servicio. Nadie puede Reservar con él en ese tramo.
_Avoid_: buffer, margen, preparación (a secas)

**Límite diario**:
Máximo de Turnos de un Servicio en un mismo día, sumando a todos sus Empleados. Opcional. Alcanzado, ese día no tiene Horarios reservables para el Servicio.
_Avoid_: cupo, tope

**Availability**:
Conjunto de Franjas semanales con nombre y zona horaria propia que declara cuándo trabaja un Usuario. Es del Usuario, no de su vínculo con un Negocio. Sus Franjas y sus Anulaciones se leen en esa zona, no en la de la Sucursal del Servicio. En pantalla se llama "Horas laborables". Todo Usuario tiene una o más desde que se crea, exactamente una predeterminada. El término queda en inglés a pedido explícito: "Disponibilidad" ya se usa en el panel para otra cosa.
_Avoid_: disponibilidad, horario (a secas), agenda

**Franja**:
Tramo horario de una Availability, con hora de inicio y de fin, que se repite en uno o más días de la semana. Varias por día; un día sin Franjas es un día que no se trabaja. Nunca cruza la medianoche.
_Avoid_: rango, bloque, slot

**Anulación**:
Reemplazo de las Franjas de una Availability para una fecha concreta, leído en la zona horaria de esa Availability. Sin horas, es un día libre. Vale solo para esa Availability: para anular la misma fecha en otra, se carga otra Anulación.
_Avoid_: excepción, override, licencia

**Horario reservable**:
Hora concreta en la que un Cliente puede Reservar un Turno para un Servicio, ya descontadas las Anulaciones, la Anticipación mínima y los Turnos tomados. En un Servicio del Negocio, basta con que un Empleado que lo Ofrece esté libre. Los Turnos ocupan al Usuario que los atiende en todos sus Servicios, personales o de cualquier Negocio.
_Avoid_: slot, hueco, disponibilidad

**Categoría de Servicio**:
Tipo de prestación al que pertenece un Servicio, elegido de una lista fija.
_Avoid_: tipo de servicio, categoría (a secas)

**Aprobación manual**:
Atributo de un Servicio que hace que sus Turnos nazcan como Turno pendiente en vez de aceptarse solos al Reservar. Un Servicio sin Aprobación manual acepta sus Turnos automáticamente.
_Avoid_: auto-aceptación, requiere aprobación (a secas)

**Seña**:
Porcentaje del precio de un Servicio que el Negocio puede pedir declarar como adelanto al Reservar. Opcional: un Servicio sin Seña no pide nada por adelantado.
_Avoid_: depósito, anticipo, deposit

**Turno**:
Reserva concreta de un Cliente con un Empleado, para un Servicio y un horario determinados. Es el sustantivo; "reservar" es el verbo.
_Avoid_: cita, reserva (como sustantivo), appointment

**Reservar**:
Acción del Cliente de tomar un turno disponible. Exige Verificar email: el Turno recién existe cuando el Cliente ingresa el Código de verificación. No hay forma de Reservar sin verificar.
_Avoid_: agendar, sacar turno, pedir turno

**Mis turnos**:
Pantalla del panel donde un Empleado ve los Turnos que atiende, en todos los Negocios donde lo es, y desde donde los Acepta, Rechaza, Cancela, Reagenda o les marca la Ausencia. Es del Empleado: el Cliente no tiene una, vuelve a su Turno por el Enlace del Turno.
_Avoid_: mis reservas, agenda, turnos del cliente (no existe)

**Enlace del Turno**:
Dirección secreta de un Turno que llega en la Confirmación de reserva, y a la que el Cliente llega apenas Reserva. Es la única forma de volver a un Turno: abre ese Turno solo, sin Código de verificación, y quien la tenga puede Cancelarlo o Reagendarlo. Prueba que se tiene el Turno, no quién es el Cliente.
_Avoid_: link de gestión, link de cancelación, uid (eso es el identificador en el código), mis turnos (no existe para el Cliente)

**Reservar de nuevo**:
Acción del Cliente, desde la página del Enlace del Turno, de volver a donde reservó: la Sucursal del Servicio del Negocio, o la página del Usuario en un Servicio personal. Está en cualquier estado del Turno.
_Avoid_: repetir turno, volver a reservar

**Comentario del Turno**:
Texto libre que el Cliente puede dejar al Reservar, para contarle algo al Negocio sobre ese Turno.
_Avoid_: notas, observaciones, comment

**Enlace de reserva**:
Dirección pública que un Negocio comparte para que un Cliente entre a Reservar. La elige el Dueño al Crear Negocio y puede cambiarla; al cambiarla, la anterior deja de funcionar. Si el Negocio tiene más de una Sucursal, cada una agrega su propio tramo a esa dirección para llegar directo a ella; con una sola Sucursal, el Enlace de reserva del Negocio ya lleva ahí. Cada Servicio agrega un último tramo que abre la página de su Sucursal con ese Servicio ya elegido. Un Usuario tiene además su propio Enlace de reserva, que elige él, para sus Servicios personales; cada uno agrega su propio último tramo.
_Avoid_: link del negocio, perfil público, página pública, slug (eso es el identificador en el código)

**Reagendar**:
Mover un turno existente a otro horario del mismo Servicio. Conserva al Empleado si está libre en el horario nuevo; si no, pasa a otro libre. Libera el horario anterior. Lo puede hacer el Empleado o el Cliente, sobre un Turno pendiente o aceptado.
_Avoid_: reprogramar, cambiar el turno

**Cancelar**:
Anular un Turno. Su horario queda libre. El Cliente puede Cancelar un Turno pendiente o aceptado hasta que empieza.
_Avoid_: eliminar, borrar (un turno)

**Dar de baja**:
Retirar un Servicio de la agenda de un Negocio, retirar a un Empleado de un Negocio, o retirar a un Usuario de Agendic. Sus Turnos futuros en ese Negocio quedan cancelados; los de un Usuario, en todos lados. Lo dado de baja no se borra: queda como historial. Un Usuario dado de baja deja de existir para el Proveedor de autenticación: si vuelve a registrarse con el mismo email, es un Usuario nuevo. Un Usuario solo se da de baja a sí mismo; si es Dueño, su Negocio queda dado de baja con él, y su Enlace de reserva no vuelve a quedar libre.
_Avoid_: eliminar, borrar, desactivar, bajar (un usuario)

**Ausencia**:
Turno al que el Cliente no se presentó sin cancelarlo. El Empleado la marca a mano, solo en Turnos ya aceptados cuyo horario ya pasó.
_Avoid_: inasistencia, no-show

**Turno pendiente**:
Turno de un Servicio con Aprobación manual que todavía espera que el Empleado lo Acepte o lo Rechace. Mientras tanto ocupa su Horario reservable igual que uno aceptado. Si el Cliente lo Reagenda, o Reagenda uno aceptado de un Servicio con Aprobación manual, vuelve a quedar pendiente.
_Avoid_: turno sin verificar (no existe: todo Turno nace con el email verificado)

**Aceptar turno**:
Acción del Negocio de dar por válido un Turno pendiente, es decir, uno que no quedó aceptado automáticamente al reservarse.
_Avoid_: confirmar (a secas, se confunde con Confirmación de asistencia)

**Rechazar turno**:
Acción del Negocio de no aceptar un Turno pendiente. Libera el horario.
_Avoid_: cancelar (eso aplica a un turno ya aceptado)

### Comunicación

**Confirmación de reserva**:
Aviso automático que recibe el Cliente cuando su turno queda creado.
_Avoid_: confirmación (a secas)

**Confirmación de asistencia**:
Acción del Cliente, previa al turno, indicando que va a asistir.
_Avoid_: confirmación (a secas), confirmar turno
