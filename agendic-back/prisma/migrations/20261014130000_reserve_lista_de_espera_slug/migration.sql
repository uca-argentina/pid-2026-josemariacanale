-- `lista-de-espera` becomes a reserved first tramo of the Enlace de reserva (ADR 0026): it is the front route to
-- Salir de la Lista de espera. Fail loudly if a Negocio or Usuario already owns it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "BookingSlug" WHERE "slug" = 'lista-de-espera') THEN
    RAISE EXCEPTION 'Cannot reserve the Enlace de reserva "lista-de-espera": a Negocio or Usuario already uses it. Ask them to change it and run the migration again.';
  END IF;
END $$;
