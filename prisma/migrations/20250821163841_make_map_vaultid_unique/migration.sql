/*
  Warnings:

  - A unique constraint covering the columns `[vaultId]` on the table `Map` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[vaultId]` on the table `Source` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Map_vaultId_key" ON "public"."Map"("vaultId");

-- CreateIndex
CREATE UNIQUE INDEX "Source_vaultId_key" ON "public"."Source"("vaultId");
