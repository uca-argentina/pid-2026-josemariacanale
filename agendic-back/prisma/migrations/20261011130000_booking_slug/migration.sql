-- CreateTable: the shared namespace of the Enlace de reserva's first tramo (ADR 0026); no backfill, the development database is recreated
CREATE TABLE "BookingSlug" (
    "slug" TEXT NOT NULL,
    "businessId" INTEGER,
    "userId" INTEGER,

    CONSTRAINT "BookingSlug_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingSlug_businessId_key" ON "BookingSlug"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingSlug_userId_key" ON "BookingSlug"("userId");

-- AddForeignKey
ALTER TABLE "BookingSlug" ADD CONSTRAINT "BookingSlug_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSlug" ADD CONSTRAINT "BookingSlug_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A slug belongs to a Negocio or to a Usuario, exactly one, and is always lowercase
ALTER TABLE "BookingSlug" ADD CONSTRAINT "BookingSlug_exactly_one_owner" CHECK (("businessId" IS NULL) <> ("userId" IS NULL));
ALTER TABLE "BookingSlug" ADD CONSTRAINT "BookingSlug_slug_lowercase" CHECK ("slug" = lower("slug"));
