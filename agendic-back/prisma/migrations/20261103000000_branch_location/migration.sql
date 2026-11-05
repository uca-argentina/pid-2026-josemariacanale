-- Ubicación de la Sucursal (#384, ADR 0037): the point on the map next to its address. Existing Sucursales stay
-- without one (null) until geocoded (#385) or edited by the Dueño.
ALTER TABLE "Branch"
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

ALTER TABLE "Branch" ADD CONSTRAINT "Branch_location_both_or_neither" CHECK (("latitude" IS NULL) = ("longitude" IS NULL));
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_latitude_range" CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90);
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_longitude_range" CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180);
