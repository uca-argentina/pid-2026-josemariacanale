# agendic-back

## Setup

### Custom claims de Clerk

Para que el back refresque el nombre y el email del Usuario (y del Empleado) al vuelo, el session token de Clerk tiene que traer esos datos como custom claims. Configurarlo en el dashboard de Clerk, **Sessions → Customize session token**, agregando:

```json
{
  "name": "{{user.full_name}}",
  "email": "{{user.primary_email_address}}"
}
```

Sin esta configuración (o con un token viejo que no la tiene todavía), el back sigue funcionando igual: no refresca nada y no llama a la API de Clerk.
