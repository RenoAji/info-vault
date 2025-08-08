/*
  Warnings:

  - A unique constraint covering the columns `[vaultId]` on the table `Note` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[noteId]` on the table `Vault` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Vault" ADD COLUMN     "noteId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Note_vaultId_key" ON "public"."Note"("vaultId");

-- CreateIndex
CREATE UNIQUE INDEX "Vault_noteId_key" ON "public"."Vault"("noteId");
