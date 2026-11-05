-- `streaks` becomes a reserved first tramo of the Enlace de reserva (ADR 0026): it is the front route of the Rachas
-- screen. Fail loudly if a Negocio or Usuario already owns it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "BookingSlug" WHERE "slug" = 'streaks') THEN
    RAISE EXCEPTION 'Cannot reserve the Enlace de reserva "streaks": a Negocio or Usuario already uses it. Ask them to change it and run the migration again.';
  END IF;
END $$;
