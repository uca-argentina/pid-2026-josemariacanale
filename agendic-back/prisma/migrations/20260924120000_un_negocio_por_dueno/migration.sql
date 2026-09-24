-- Un Usuario es Dueño de a lo sumo un Negocio (docs/adr/0012). Sin migración de datos: los Dueños con más de un Negocio se limpian a mano antes.

-- CreateIndex
CREATE UNIQUE INDEX "Business_ownerId_key" ON "Business"("ownerId");
