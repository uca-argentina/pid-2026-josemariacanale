---
status: accepted
---

# Clerk para todo el flujo de auth

Reemplazamos el sign-up/sign-in a mano (contraseña + link de verificación, ADR 0001 y 0002) por Clerk: sus componentes prearmados (`<SignUp>`, `<SignedIn>`, etc.) cubren registro, Código de verificación por email, Proveedor de identidad (Google, Microsoft) y Sesión, y su middleware reemplaza a `proxy.ts`.

Seguir a mano hubiera significado construir y mantener, con nuestro propio código, lo que Clerk ya resuelve: hash y rotación de contraseñas, rate limiting de intentos, el flujo de Código de verificación con reenvío y expiración, y la integración con cada Proveedor de identidad. Ese costo no compra nada que el negocio necesite distinto de lo que un proveedor de auth estándar ofrece.

MFA queda afuera de este alcance: el plan de Clerk que lo habilita es pago, y no hay hoy una razón de negocio que justifique pasar a ese plan.

El back sigue siendo dueño del Usuario de negocio (sus Negocios, su rol de Dueño, etc.). Clerk es dueño de la identidad (login, Sesión, Código de verificación, Proveedor de identidad) pero no sabe nada de Negocios ni de Dueños. La sincronización entre el Usuario de Clerk y el Usuario del back — típicamente vía webhook, para crear o actualizar el Usuario de negocio cuando Clerk crea o actualiza el suyo — queda pendiente como trabajo futuro.

## Consequences

- `MockUsersRepository`, `AuthenticationService` hand-rolled y el Route Handler de `/verify-email` (ADR 0002) se eliminan; Clerk reemplaza esas piezas.
- El front no controla el formato del Código de verificación (longitud, alfabeto): es un detalle de Clerk que puede cambiar sin aviso.
- Sin la sincronización pendiente, un Usuario que se registra en Clerk no tiene todavía un Usuario de negocio en el back; queda para un ticket posterior.
