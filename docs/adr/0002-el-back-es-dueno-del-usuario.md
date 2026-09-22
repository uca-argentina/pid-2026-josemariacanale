# El back es dueño del Usuario y de la autenticación

Front y back habían implementado Usuarios cada uno por su lado: el front en memoria, con bcrypt-ts y sesiones hechas a mano, y el back con un CRUD de usuarios. El back es el sistema de registro del Usuario, porque es donde va a vivir la persistencia; el front pasa a ser un cliente suyo, y su repositorio de usuarios se convierte en un adapter HTTP contra esta API.

Un Usuario es cualquier persona con credenciales, y puede ser Dueño de cero o más Negocios. Su único rol marca a los Administradores de la plataforma. Su contraseña se guarda hasheada y nunca sale de la API. Iniciar sesión y las Sesiones vienen justo después del Usuario en el orden de construcción.

El Cliente no entra acá: reserva con un nombre y un email, sin cuenta (ADR 0005).
