-- Repetición (#301): a Servicio offers Series of Turnos every N weeks, up to a maximum; both or neither.
ALTER TABLE "Service"
ADD COLUMN "repeatEveryWeeks" INTEGER,
ADD COLUMN "repeatMaxBookings" INTEGER;

ALTER TABLE "Service" ADD CONSTRAINT "Service_repeat_both_or_neither" CHECK (("repeatEveryWeeks" IS NULL) = ("repeatMaxBookings" IS NULL));
ALTER TABLE "Service" ADD CONSTRAINT "Service_repeatEveryWeeks_min" CHECK ("repeatEveryWeeks" IS NULL OR "repeatEveryWeeks" >= 1);
ALTER TABLE "Service" ADD CONSTRAINT "Service_repeatMaxBookings_range" CHECK ("repeatMaxBookings" IS NULL OR "repeatMaxBookings" BETWEEN 2 AND 10);
