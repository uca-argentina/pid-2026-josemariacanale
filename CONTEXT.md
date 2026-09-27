# Agendic

Plataforma de gestión de turnos para negocios de servicios (clínicas, spas, gimnasios, academias, etc.). El Negocio publica su agenda; el Cliente reserva y gestiona sus turnos desde la web o la app.

## Language

### Actores

**Negocio**:
Quien contrata Agendic para gestionar su agenda. Es el destinatario de la landing y del panel de administración.
_Avoid_: empresa, cuenta, cliente (cuando se refiere al negocio)

**Cliente**:
Persona que reserva Turnos dejando un nombre y un email. No hace falta que sea un Usuario.
_Avoid_: usuario final, paciente, consumidor

**Sucursal**:
Sede física de un Negocio, con zona horaria propia. Un Negocio puede tener varias. Deja de ser la fuente de los horarios reservables.
_Avoid_: sede, local

**Empleado**:
Usuario que atiende los Servicios de un Negocio.
_Avoid_: recurso

**Staff**:
El conjunto de Empleados de un Negocio. Solo se usa en plural/colectivo.

**Usuario**:
Persona identificada por Agendic, con contraseña o con un Proveedor de identidad. Puede ser Dueño de cero o un Negocio.
_Avoid_: cuenta, perfil

**Dueño**:
Usuario que creó un Negocio y lo gestiona. Un Usuario es Dueño de un solo Negocio; quien quiera otro Negocio se registra como otro Usuario con otro email. Es además Empleado de su propio Negocio.
_Avoid_: owner, titular, admin

**Crear Negocio**:
Acción de un Usuario de dar de alta un Negocio con sus datos. Solo puede hacerlo un Usuario que todavía no es Dueño de un Negocio. Al hacerlo pasa a ser su Dueño.
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
Código de un solo uso que el Proveedor de autenticación manda por email para Verificar email. Al ingresarlo, el Usuario queda con una Sesión abierta. Vence.
_Avoid_: link de verificación, link de confirmación, magic link

### Agenda

**Servicio**:
Prestación que ofrece una Sucursal, con duración y precio, atendida por uno o más Empleados. No confundir con los microservicios de la arquitectura.
_Avoid_: prestación, tratamiento

**Availability**:
Conjunto de Franjas semanales con nombre que declara cuándo trabaja un Empleado. En pantalla se llama "Horas laborables". Un Empleado tiene una o más, exactamente una predeterminada. El término queda en inglés a pedido explícito: "Disponibilidad" ya se usa en el panel para otra cosa.
_Avoid_: disponibilidad, horario (a secas), agenda

**Franja**:
Tramo de un día de la semana dentro de una Availability, con hora de inicio y de fin. Varias por día; un día sin Franjas es un día que no se trabaja. Nunca cruza la medianoche.
_Avoid_: rango, bloque, slot

**Anulación**:
Reemplazo de las Franjas de un Empleado para una fecha concreta. Sin horas, es un día libre.
_Avoid_: excepción, override, licencia

**Cobertura**:
El Empleado que atiende en lugar de otro durante una Anulación, para no dejar sus Servicios sin nadie. Opcional: una Anulación sin Cobertura simplemente deja esas fechas sin horarios para el Cliente.
_Avoid_: reemplazo, suplente, backup

**Categoría de Servicio**:
Tipo de prestación al que pertenece un Servicio, elegido de una lista fija.
_Avoid_: tipo de servicio, categoría (a secas)

**Turno**:
Reserva concreta de un Cliente con un Empleado, para un Servicio y un horario determinados. Es el sustantivo; "reservar" es el verbo.
_Avoid_: cita, reserva (como sustantivo), appointment

**Reservar**:
Acción del Cliente de tomar un turno disponible.
_Avoid_: agendar, sacar turno, pedir turno

**Enlace de reserva**:
Dirección pública y única que un Negocio comparte para que un Cliente entre a Reservar. La elige el Dueño al Crear Negocio y puede cambiarla; al cambiarla, la anterior deja de funcionar.
_Avoid_: link del negocio, perfil público, página pública, slug (eso es el identificador en el código)

**Reagendar**:
Mover un turno existente a otro horario. Libera el horario anterior.
_Avoid_: reprogramar, cambiar el turno

**Cancelar**:
Anular un Turno. Su horario queda libre.
_Avoid_: eliminar, borrar (un turno)

**Dar de baja**:
Retirar un Servicio de la agenda de un Negocio, o retirar a un Empleado de un Negocio. Sus Turnos futuros en ese Negocio quedan cancelados.
_Avoid_: eliminar, borrar, desactivar

**Ausencia**:
Turno al que el Cliente no se presentó sin cancelarlo.
_Avoid_: inasistencia, no-show

**Turno sin verificar**:
Turno cuyo Cliente todavía no verificó su email. No mantiene reservado su horario.
_Avoid_: pendiente (ese término queda reservado para Aceptar turno y Rechazar turno)

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
