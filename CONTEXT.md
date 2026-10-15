# Agendic

Plataforma de gestión de turnos para negocios de servicios (clínicas, spas, gimnasios, academias, etc.). El Negocio publica su agenda; el Cliente reserva y gestiona sus turnos desde la web o la app.

## Language

### Actores

**Negocio**:
Grupo de Usuarios que comparten Servicios: los Servicios del Negocio los atiende cualquiera de sus Empleados que los Ofrezca. No hace falta un Negocio para ofrecer Servicios; un Usuario solo tiene sus Servicios personales.
_Avoid_: empresa, cuenta, cliente (cuando se refiere al negocio)

**Cliente**:
Persona que reserva un Turno dejando un nombre y un email, y verificándolo al Reservar. No hace falta que sea un Usuario. Cada Turno tiene su propio Cliente, con el nombre con el que se reservó: el mismo email en dos Turnos son dos Clientes, que se juntan solo en la Ficha del Cliente.
_Avoid_: usuario final, paciente, consumidor

**Ficha del Cliente**:
Lo que un Negocio sabe de un email de Cliente a lo largo de todos sus Turnos. Es de ese Negocio: otro Negocio con el mismo email tiene otra Ficha, y no se ven entre sí. En los Servicios personales, la Ficha es del Usuario que los atiende. El email ya está verificado en cada Turno, así que alcanza para identificarla sin que el Cliente tenga cuenta.
_Avoid_: perfil del cliente, cuenta del cliente, historia clínica

**Sucursal**:
Sede física de un Negocio, con zona horaria propia. Un Negocio puede tener varias. No tiene horario de apertura ni de cierre: los Horarios reservables salen solo de las Availability de sus Empleados. Solo los Servicios del Negocio tienen Sucursal. Tiene siempre al menos una imagen, desde que se crea. Puede tener una descripción propia, opcional, que reemplaza a la del Negocio en la página de la Sucursal.
_Avoid_: sede, local

**Cabina**:
Espacio o equipo de una Sucursal (un box, una camilla, un láser) que un Turno ocupa mientras dura, con su Tiempo de preparación. Dos Turnos no pueden ocupar la misma Cabina a la vez, igual que pasa con el Empleado. No tiene horario propio: solo resta Horarios reservables. Solo la usan los Servicios del Negocio que la admiten, y es opcional: un Servicio sin Cabinas depende solo de sus Empleados. Un Servicio puede admitir varias; cada Turno ocupa una sola. Al Reservar se le asigna una libre, la que hace más tiempo que no recibe un Turno de cualquier Servicio, sin atarla al Empleado. Reagendar la conserva si sigue libre; si no, pasa a otra. El Cliente no la elige ni la ve. Solo la gestiona el Dueño. Los Turnos tomados antes de que su Servicio admitiera Cabinas no ocupan ninguna hasta que se Reagendan. A diferencia de lo demás, no se puede Dar de baja una Cabina mientras tenga Turnos futuros: primero se Reagendan o se Cancelan.
_Avoid_: recurso, sala, box, equipo, puesto

**Empleado**:
Usuario que atiende los Servicios del Negocio. Puede atender cualquiera de ellos. Un Usuario puede ser Empleado de varios Negocios a la vez, sea o no Dueño de otro.
_Avoid_: recurso

**Especialidad**:
Etiqueta que describe en qué se destaca un Empleado dentro de un Negocio. El Cliente la ve al elegir con quién Reservar. No limita qué Servicios Ofrece.
_Avoid_: habilidad, skill, rubro

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
_Avoid_: admin, superusuario, administrativo

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
Servicio de una Sucursal de un Negocio, atendido por los Empleados que lo Ofrecen. Al Reservar, el Cliente elige con quién entre quienes lo Ofrecen, o deja que se le asigne uno ("cualquiera"). Con "cualquiera" se le asigna un Empleado libre en ese horario: el que hace más tiempo que no recibe un Turno de ese Servicio. Si elige a alguien, queda un Empleado elegido.
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

**Plazo de cambios**:
Horas antes del inicio de un Turno hasta las que el Cliente puede Cancelarlo o Reagendarlo. Es del Servicio y es opcional: sin él, el Cliente puede Cancelar hasta que el Turno empieza. No limita al Empleado.
_Avoid_: política de cancelación (a secas), plazo de cancelación

**Máximo de reagendamientos**:
Cuántas veces puede el Cliente Reagendar un mismo Turno. Es del Servicio y es opcional. Los Reagendamientos que hace el Empleado no cuentan.
_Avoid_: límite de cambios, cupo de reprogramaciones

**Paquete**:
Cantidad de sesiones de un Servicio que el Dueño define con un precio, y que el Empleado o el Dueño cargan en una Ficha del Cliente cuando lo venden. Cada Turno de ese Servicio que se Reserva con ese email usa una sesión y no pide Seña. Si el Turno se Cancela o se Rechaza, la sesión vuelve. Si queda con Ausencia del Invitado, se pierde. No vence.
_Avoid_: bono, abono, pack, membresía

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
Reemplazo de las Franjas de una Availability para una fecha concreta, leído en la zona horaria de esa Availability. Sin horas, es un día libre: así se cargan, por ejemplo, unas vacaciones. Vale solo para esa Availability: para anular la misma fecha en otra, se carga otra Anulación. Al guardar la Availability, los Turnos pendientes o aceptados que la Anulación (o una Franja que se achica, o un cambio de zona horaria) deja afuera de las Franjas se Cancelan, previa confirmación y con una Causa de cancelación.
_Avoid_: excepción, override, licencia, ausencia (eso es del Cliente)

**Fuera de la oficina**:
Período de uno o más días enteros en que un Usuario no atiende: en esos días ninguno de sus Servicios, personales o de cualquier Negocio, tiene Horarios reservables con él. Es del Usuario, no de una Availability: no es una Anulación. Sus días se leen en la zona horaria de cada Availability. Al guardarlo, los Turnos pendientes o aceptados que ya tenía en esos días se Cancelan, previa confirmación y con una Causa de cancelación. Lleva un Motivo y, opcionalmente, una nota que el Usuario puede mostrar en la página de reserva de sus Servicios personales. Solo lo gestiona el propio Usuario.
_Avoid_: ausencia (eso es el no-show), OOO, licencia, vacaciones

**Motivo**:
Por qué un Usuario está Fuera de la oficina, elegido de una lista fija: No especificado, Vacaciones, Viaje, Baja por enfermedad, Día festivo.
_Avoid_: razón, causa (eso es la Causa de cancelación)

**Día festivo**:
Feriado de un país o de un calendario religioso que el Usuario elige. Todos los Días festivos de lo elegido quedan prendidos hasta que el Usuario apaga alguno, y cada uno prendido bloquea al Usuario como un día Fuera de la oficina, siempre que caiga en un día que trabaja. Al prenderlo, los Turnos pendientes o aceptados que caen en ese día se Cancelan, previa confirmación y con una Causa de cancelación.
_Avoid_: feriado, holiday

**Horario reservable**:
Hora concreta en la que un Cliente puede Reservar un Turno para un Servicio, ya descontadas las Anulaciones, los días Fuera de la oficina, los Días festivos, la Anticipación mínima y los Turnos tomados. En un Servicio del Negocio, basta con que un Empleado que lo Ofrece esté libre y, si el Servicio admite Cabinas, también una de ellas. Los Turnos ocupan al Usuario que los atiende en todos sus Servicios, personales o de cualquier Negocio.
_Avoid_: slot, hueco, disponibilidad

**Categoría de Servicio**:
Tipo de prestación al que pertenece un Servicio, elegido de una lista fija.
_Avoid_: tipo de servicio, categoría (a secas)

**Aprobación manual**:
Atributo de un Servicio que hace que sus Turnos nazcan como Turno pendiente en vez de aceptarse solos al Reservar. Un Servicio sin Aprobación manual acepta sus Turnos automáticamente.
_Avoid_: auto-aceptación, requiere aprobación (a secas)

**Seña**:
Porcentaje del precio de un Servicio que el Negocio pide como adelanto. Opcional: un Servicio sin Seña no pide nada por adelantado. El Turno de un Servicio con Seña nace con la Seña pendiente hasta que el Cliente la paga, salvo que use una sesión de un Paquete. Pagarla o no es independiente de que el Turno esté pendiente o aceptado.
_Avoid_: depósito, anticipo, deposit

**Pagar la Seña**:
Acción del Cliente de dar por pagada la Seña de su Turno, desde el Enlace del Turno, hasta que el Turno empieza. Es simulada: Agendic no cobra. Si el Cliente no la paga, el Empleado puede Cancelar o Rechazar el Turno a mano. Si después se Reagenda el Turno, la Seña sigue pagada. Si se Cancela o se Rechaza, no se devuelve.
_Avoid_: registrar la Seña, abonar, señar

**Turno**:
Reserva concreta de un Cliente con un Empleado, para un Servicio y un horario determinados. Es el sustantivo; "reservar" es el verbo.
_Avoid_: cita, reserva (como sustantivo), appointment

**Reservar**:
Acción del Cliente de tomar un turno disponible. Exige Verificar email: el Turno recién existe cuando el Cliente ingresa el Código de verificación. No hay forma de Reservar sin verificar.
_Avoid_: agendar, sacar turno, pedir turno

**Mis turnos**:
Pantalla del panel donde un Empleado ve los Turnos que atiende, en todos los Negocios donde lo es, y desde donde los Acepta, Rechaza, Cancela, Reagenda, o los marca como atendidos o con Ausencia del Invitado. Es del Empleado: el Cliente no tiene una, vuelve a su Turno por el Enlace del Turno.
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

**Historial del Turno**:
Lista cronológica de lo que le pasó a un Turno: cuándo se reservó, se aceptó o rechazó, se pagó la Seña, se Reagendó (con el horario de antes), se Canceló (con quién y el Motivo de cancelación), tuvo Ausencia del Invitado o del Anfitrión y se Calificó. Se deduce de los campos del Turno y de los originales que reemplazó al Reagendar, sin guardarse aparte. Lo ven quien atiende el Turno y no el Cliente.
_Avoid_: log, auditoría, bitácora

**Nota interna**:
Texto que el Empleado deja en un Turno. Lo ven solo el Empleado que lo atiende y el Dueño, nunca el Cliente.
_Avoid_: comentario (es el del Cliente), observación

**Preferencias del Cliente**:
Texto de la Ficha del Cliente que cualquier Empleado del Negocio escribe, y que ven todos los Empleados y el Dueño en cada Turno de ese email. El Cliente no las ve.
_Avoid_: preferencias del Usuario (es otra cosa), notas del cliente

**Enlace de reserva**:
Dirección pública que un Negocio comparte para que un Cliente entre a Reservar, sin prefijo: su primer tramo es el del Negocio. La elige el Dueño al Crear Negocio y puede cambiarla; al cambiarla, la anterior deja de funcionar. Si el Negocio tiene más de una Sucursal, cada una agrega su propio tramo a esa dirección para llegar directo a ella; con una sola Sucursal, el Enlace de reserva del Negocio ya lleva ahí. Cada Servicio agrega un tramo que abre la página de su Sucursal con ese Servicio ya elegido, y un Servicio del Negocio puede sumar un último tramo opcional con el Enlace de reserva de un Empleado que lo Ofrece. Un Usuario tiene además su propio Enlace de reserva, que elige él, para sus Servicios personales; cada uno agrega su propio último tramo. El primer tramo es de un Negocio o de un Usuario, nunca repetido entre los dos, y no puede ser una palabra reservada (`bookings`, `services`, `business`, `availability`, `analytics`, `turnos`, `sign-in`, `sign-up`, `api`, `trpc`, `u`, `lista-de-espera`): son pantallas de Agendic. Los tramos de Sucursal y de Servicio sí pueden usarlas.
_Avoid_: link del negocio, perfil público, página pública, slug (eso es el identificador en el código)

**Empleado elegido**:
Empleado que el Cliente eligió al Reservar un Servicio del Negocio, por su Enlace de reserva o de la lista de la página de reserva. El Turno queda con él y al Cliente solo se le ofrecen sus Horarios reservables; si el horario se ocupó, no se pasa a otro Empleado. Si el Cliente deja "cualquiera", el Turno no tiene Empleado elegido y se asigna como siempre.
_Avoid_: Empleado asignado, Empleado preferido

**Reagendar**:
Mover un turno existente a otro horario del mismo Servicio. Conserva al Empleado si está libre en el horario nuevo; si no, pasa a otro libre, salvo en un Turno con Empleado elegido: ese solo se Reagenda a horarios de ese Empleado, y para pasarlo a otro se Cancela. Libera el horario anterior. Lo puede hacer el Empleado o el Cliente, sobre un Turno pendiente o aceptado. Al Cliente lo limitan el Plazo de cambios y el Máximo de reagendamientos del Servicio.
_Avoid_: reprogramar, cambiar el turno

**Cancelar**:
Anular un Turno. Su horario queda libre. El Cliente puede Cancelar un Turno pendiente o aceptado hasta el Plazo de cambios del Servicio, o hasta que empieza si el Servicio no tiene uno. También se Cancelan, previa confirmación, los Turnos pendientes o aceptados que un cambio en el horario de quien los atiende deja afuera: Fuera de la oficina, un Día festivo, o un cambio de Franjas, Anulaciones o zona horaria. Solo se Cancelan los que estaban dentro del horario antes del cambio; achicar o borrar el cambio no descancela nada.
_Avoid_: eliminar, borrar (un turno)

**Dar de baja**:
Retirar un Servicio de la agenda de un Negocio, retirar a un Empleado de un Negocio, retirar una Cabina de una Sucursal (solo sin Turnos futuros), o retirar a un Usuario de Agendic. Sus Turnos futuros en ese Negocio quedan cancelados; los de un Usuario, en todos lados. Lo dado de baja no se borra: queda como historial. Un Usuario dado de baja deja de existir para el Proveedor de autenticación: si vuelve a registrarse con el mismo email, es un Usuario nuevo. Un Usuario solo se da de baja a sí mismo; si es Dueño, su Negocio queda dado de baja con él, y su Enlace de reserva no vuelve a quedar libre.
_Avoid_: eliminar, borrar, desactivar, bajar (un usuario)

**Causa de cancelación**:
Por qué se Canceló un Turno cuando lo cancela un cambio en el horario de quien lo atiende: Fuera de la oficina, Día festivo o Cambio de horario (Franjas, Anulaciones o zona horaria). En esos Turnos, Agendic escribe el Motivo de cancelación, que el Cliente ve en el mail y en el Enlace del Turno, y ese Motivo queda fijo aunque después cambie o se borre el período.
_Avoid_: motivo (eso es el Motivo de cancelación, o el Motivo de Fuera de la oficina), razón

**Ausencia del Invitado**:
Turno al que el Cliente no se presentó sin cancelarlo. La marca a mano quien lo atiende, solo en Turnos ya aceptados cuyo horario ya pasó. Excluye a Turno atendido y a Ausencia del Anfitrión: gana la primera que se marca.
_Avoid_: Ausencia (a secas), ausencia del Cliente, inasistencia, no-show, ausencia del Usuario (eso es Fuera de la oficina)

**Ausencia del Anfitrión**:
Turno al que no se presentó quien lo atiende: el Empleado, o el Usuario en un Servicio personal. La marca el Cliente desde el Enlace del Turno, en un Turno aceptado, desde que empieza hasta 24 horas después de que termina. Nadie la deshace. Excluye a Ausencia del Invitado.
_Avoid_: Falta del Empleado, ausencia del Empleado, Fuera de la oficina (es otra cosa)

**Turno atendido**:
Turno aceptado cuyo horario ya pasó y que el Empleado marcó a mano como atendido. Excluye a Ausencia del Invitado. Un Turno que pasó sin ninguna de las dos marcas no cuenta como atendido.
_Avoid_: completado, realizado, finalizado

**Turno pendiente**:
Turno de un Servicio con Aprobación manual que todavía espera que el Empleado lo Acepte o lo Rechace. Mientras tanto ocupa su Horario reservable igual que uno aceptado. Si el Cliente lo Reagenda, o Reagenda uno aceptado de un Servicio con Aprobación manual, vuelve a quedar pendiente.
_Avoid_: turno sin verificar (no existe: todo Turno nace con el email verificado)

**Motivo de cancelación**:
Texto libre, opcional y de hasta 500 caracteres, que quien Cancela o Rechaza un Turno deja para el Cliente (o el Cliente, para el Negocio). Va en el Aviso de cambio del Turno y se ve en el Turno junto a quién lo Canceló o Rechazó: el Empleado, el Cliente o una baja. El original de un Reagendamiento guarda quién Reagendó, sin motivo.
_Avoid_: razón, justificación, comentario (es el del Cliente al Reservar)

**Aceptar turno**:
Acción del Negocio de dar por válido un Turno pendiente, es decir, uno que no quedó aceptado automáticamente al reservarse.
_Avoid_: confirmar (a secas, se confunde con Confirmación de asistencia), Turno confirmado (es el Turno aceptado)

**Rechazar turno**:
Acción del Negocio de no aceptar un Turno pendiente. Libera el horario.
_Avoid_: cancelar (eso aplica a un turno ya aceptado)

### Comunicación

**Confirmación de reserva**:
Aviso automático que recibe el Cliente cuando su turno queda creado.
_Avoid_: confirmación (a secas)

**Aviso de cambio del Turno**:
Aviso automático por mail que recibe el Cliente cuando su Turno se Cancela, se Reagenda, se Rechaza o queda cancelado por una baja, lo haga el Empleado o el propio Cliente. Cuando lo Cancela un cambio en el horario de quien lo atiende, lleva además la Causa de cancelación. Lleva el Enlace del Turno. Si el mail falla, el cambio igual queda hecho.
_Avoid_: notificación (a secas), recordatorio

**Lista de espera**:
Clientes anotados para un Servicio en una fecha con todos sus Horarios reservables tomados, a la espera de que se libere uno. Solo se ofrece en un día lleno: no en uno en que nadie trabaja, ni en uno Fuera de la oficina o Día festivo. Lleno es el Servicio entero, sumando a todos sus Empleados: si un Empleado elegido no tiene lugar pero otro sí, el día no está lleno. Vale igual para los Servicios personales y los del Negocio. Se compone de Anotaciones. El Negocio no ve quién está anotado.
_Avoid_: waitlist, cola

**Anotación**:
Pedido de un Cliente, con nombre y email, de entrar en la Lista de espera de un Servicio para una fecha. Para anotarse hay que Verificar email. No retiene ningún horario ni elige Empleado. Hay una sola por email, Servicio y fecha; anotarse de nuevo no la duplica. Termina cuando pasa la fecha, cuando el Servicio se Da de baja o cuando el Cliente Sale de la Lista de espera. Mientras ese email tenga un Turno de ese Servicio en esa fecha, sin Cancelar ni Rechazar, no recibe Avisos de horario libre; si lo Cancela, vuelve a recibirlos.
_Avoid_: inscripción, suscripción

**Confirmación de anotación**:
Mail que recibe el Cliente al anotarse en la Lista de espera, con el Servicio, la fecha y el enlace para Salir de la Lista de espera.
_Avoid_: Confirmación de reserva (es otra), confirmación (a secas)

**Aviso de horario libre**:
Mail que reciben a la vez todas las Anotaciones de un Servicio y una fecha cuando aparece un Horario reservable de ese Servicio en esa fecha, por la razón que sea. Dice el Servicio y la fecha, sin horarios, porque pueden estar tomados al leerlo. Lleva al Enlace de reserva del Servicio con esa fecha elegida, y el horario queda para el primero que Reserva. Lleva también el enlace para Salir de la Lista de espera. Si el día se vuelve a llenar y después se libera otro horario, llega otro Aviso; mientras el día siga con lugar, no se repite.
_Avoid_: Aviso de cambio del Turno (es otro), notificación (a secas)

**Salir de la Lista de espera**:
Acción del Cliente de terminar su Anotación, desde el enlace que traen la Confirmación de anotación y cada Aviso de horario libre. No hace falta Verificar email de nuevo. Después puede volver a anotarse.
_Avoid_: desanotarse, darse de baja (eso es otra cosa), cancelar la anotación

**Invitación a calificar**:
Mail que recibe el Cliente una hora después de que termina un Turno que se puede Calificar, con el Enlace del Turno. Se manda una sola vez por Turno, hasta 7 días después de que terminó.
_Avoid_: recordatorio, encuesta

**Confirmación de asistencia**:
Acción del Cliente, previa al turno, indicando que va a asistir.
_Avoid_: confirmación (a secas), confirmar turno
