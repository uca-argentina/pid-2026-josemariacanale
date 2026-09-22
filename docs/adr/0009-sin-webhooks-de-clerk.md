# Sin webhooks del Proveedor de autenticación: el Usuario se crea al primer request

ADR 0008 dejó pendiente la sincronización entre el Usuario de Clerk y el Usuario del back, y anticipó un webhook de `user.created`. No lo hacemos: cada request trae el JWT de Clerk, así que el back crea el Usuario (o el Empleado) la primera vez que lo ve, con el `clerkId` del token y el nombre y el email que Clerk devuelve. Nombre y email se refrescan en ese mismo camino cuando cambiaron en Clerk.

Un webhook habría agregado un endpoint público con verificación de firma, reintentos, llegadas fuera de orden y un segundo camino de creación compitiendo con el primero, todo para que la fila exista antes de un request que, si nunca llega, tampoco la necesita.

## Consecuencias

- Un Usuario que se registra en Clerk y nunca usa Agendic no tiene fila en Postgres. Cualquier pantalla de Administrador que quiera listar "registrados que todavía no entraron" no puede salir de nuestra base.
- Si un Usuario borra su cuenta en Clerk, el back no se entera: su `User`, sus Negocios y sus Turnos quedan en Postgres y nadie puede volver a entrar a ese Negocio. Se acepta a propósito; dar de baja un Negocio con Turnos futuros por un evento externo es más destructivo que dejar la fila. Si el borrado de cuenta pasa a ser un caso real del producto, el camino es darlo de baja desde Agendic, no escuchar a Clerk.
- Un dato de Clerk que no viaja en el token ni se lee al resolver el Usuario (por ejemplo, un cambio de email de alguien que no vuelve a entrar) queda desactualizado hasta su próximo request.
