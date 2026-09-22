# Identificadores de código en inglés sobre un glosario en español

El glosario (`CONTEXT.md`) y el primer borrador del modelo en Prisma están en español, pero todo identificador de código (entidades, campos, enums, casos de uso, endpoints) va en inglés, tanto en el front como en el back.

El costo es una capa de traducción: cada término del glosario tiene exactamente un identificador en inglés, listado en `docs/agents/domain.md`, y no se introducen sinónimos (un Turno es siempre `Booking`, nunca `Appointment` ni `Reservation`).
