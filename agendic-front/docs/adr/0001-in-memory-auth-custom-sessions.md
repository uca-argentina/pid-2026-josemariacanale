---
status: superseded by 2026-agendic-back ADR 0002 and issue #1 — the back owns Usuario, passwords and Sesión; the front's `AuthenticationService` is an HTTP adapter to it (`API_BASE_URL`) and the in-memory mock was removed; unit tests stub the port per case. Also superseded by ADR 0003 — sign-up/sign-in are no longer hand-rolled.
---

# In-memory auth with hand-rolled sessions

Sign-up and sign-in follow nikolovlazar/nextjs-clean-architecture, with three deliberate deviations. There is no database yet, so Usuarios live in `MockUsersRepository` in every environment and sessions in a `Map` inside `AuthenticationService`; everything is lost on server restart. Lucia is not used (its author deprecated it in favour of hand-rolled sessions): a session is a random id in an httpOnly cookie that `app/` sets. Users are identified by email, not username, to fit the existing sign-up wizard. Passwords are hashed with bcrypt-ts. Google/Microsoft sign-in is out of scope.

The sign-up wizard's email step still runs `resolveSignUpMethodUseCase`, but its domain→Proveedor de identidad mapping is emptied, so every email currently resolves to `'password'`. The Proveedor de identidad UI (`ProviderButton`, `ProviderRedirectStep`) stays in the tree, unused, as a head start for the OAuth ticket, rather than being deleted and rebuilt.

This feature includes sign-out and a minimal "is this session still valid" check, used by the `(public)` layout to show the signed-in Usuario's name and a sign-out control in the `Header`, and by the `(app)` layout to redirect to `/sign-in`. `proxy.ts` guards the same routes optimistically (cookie presence only); `IAuthenticationService.validateSession` (throwing `UnauthenticatedError` for a missing, unknown or expired session) does the real check. A stale cookie left behind by a server restart is not cleared: the Header just renders signed-out until the next sign-in overwrites it.

## Consequences

- When a database lands: write a real `UsersRepository` plus a sessions table, and bind `MockUsersRepository` only under `NODE_ENV === 'test'`.
- When OAuth ships, restore the domain→Proveedor de identidad mapping in `resolveSignUpMethodUseCase`; the routing UI it feeds is already in place.
