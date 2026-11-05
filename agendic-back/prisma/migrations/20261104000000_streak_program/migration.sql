-- CreateEnum
CREATE TYPE "StreakRewardType" AS ENUM ('PERCENT_DISCOUNT', 'AMOUNT_DISCOUNT', 'GIFT', 'FREE_SERVICE');

-- CreateTable
CREATE TABLE "StreakProgram" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER,
    "userId" INTEGER,
    "burnAfterDays" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StreakProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreakReward" (
    "id" SERIAL NOT NULL,
    "programId" INTEGER NOT NULL,
    "requiredCount" INTEGER NOT NULL,
    "repeatable" BOOLEAN NOT NULL,
    "type" "StreakRewardType" NOT NULL,
    "value" DECIMAL(10,2),
    "description" TEXT,
    "serviceId" INTEGER,
    "validForDays" INTEGER,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "StreakReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StreakProgram_businessId_key" ON "StreakProgram"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "StreakProgram_userId_key" ON "StreakProgram"("userId");

-- CreateIndex
CREATE INDEX "StreakReward_programId_idx" ON "StreakReward"("programId");

-- AddForeignKey
ALTER TABLE "StreakProgram" ADD CONSTRAINT "StreakProgram_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreakProgram" ADD CONSTRAINT "StreakProgram_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreakReward" ADD CONSTRAINT "StreakReward_programId_fkey" FOREIGN KEY ("programId") REFERENCES "StreakProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreakReward" ADD CONSTRAINT "StreakReward_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ADR 0004: a program is of a Negocio or of a Usuario, exactly one.
ALTER TABLE "StreakProgram" ADD CONSTRAINT "StreakProgram_exactly_one_owner" CHECK (("businessId" IS NULL) <> ("userId" IS NULL));
ALTER TABLE "StreakProgram" ADD CONSTRAINT "StreakProgram_burnAfterDays_range" CHECK ("burnAfterDays" IS NULL OR "burnAfterDays" BETWEEN 1 AND 365);
ALTER TABLE "StreakReward" ADD CONSTRAINT "StreakReward_requiredCount_positive" CHECK ("requiredCount" > 0);
ALTER TABLE "StreakReward" ADD CONSTRAINT "StreakReward_validForDays_positive" CHECK ("validForDays" IS NULL OR "validForDays" > 0);
