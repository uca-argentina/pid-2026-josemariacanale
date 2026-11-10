# Agendic

Plataforma de gestión de turnos para negocios de servicios (clínicas, spas, gimnasios, academias). El Negocio publica su agenda; el Cliente reserva y gestiona sus Turnos desde la web.

- `agendic-front/` — Next.js, con Clerk para la autenticación.
- `agendic-back/` — NestJS con Prisma sobre Postgres.
- `CONTEXT.md` — el glosario del dominio, compartido por las dos apps.
- `docs/adr/` — las decisiones de arquitectura, una sola serie para todo el sistema.

Cada app tiene su `package.json` y sus dependencias propias: se instalan y se levantan por separado.

## Levantar el back

```bash
cd agendic-back
npm install
# .env necesita DATABASE_URL apuntando a un Postgres con la extensión btree_gist
npx prisma migrate dev
npm run start:dev
```

## Levantar el front

```bash
cd agendic-front
npm install
# .env.local necesita NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY y CLERK_SECRET_KEY
# Mapa y autocompletado (ADR 0037): NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (del navegador, restringida por dominio),
# GOOGLE_MAPS_API_KEY (del servidor, para la Time Zone API) y, opcional, NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID.
# Sin la key pública el formulario de Sucursal queda en texto y no deja crear una nueva.
npm run dev
```

## Login sin internet (solo desarrollo)

Para probar sin conectarse a Clerk:

- Back: `AUTH_OFFLINE=true` en `agendic-back/.env`. Acepta `Authorization: Bearer dev:<clerkId>` sin verificar nada y no arranca con `NODE_ENV=production`.
- Front: `NEXT_PUBLIC_AUTH_OFFLINE=true` en `agendic-front/.env.local` (reiniciá `npm run dev`). Iniciar sesión pide un clerkId: uno que ya está en la base entra como ese Usuario; uno nuevo lo crea.

Editar el perfil (el modal de Clerk) no funciona en este modo, y Maps, Calendar y el mail siguen necesitando internet.

## Tests

`npm test` dentro de cada app. El back además tiene `npm run lint` con oxlint; el front, con eslint.
