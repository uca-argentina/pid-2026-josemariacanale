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
npm run dev
```

## Tests

`npm test` dentro de cada app. El back además tiene `npm run lint` con oxlint; el front, con eslint.
