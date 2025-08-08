/*
  Warnings:

  - The primary key for the `Note` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Note` table. All the data in the column will be lost.
  - Made the column `vaultId` on table `Note` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Note" DROP CONSTRAINT "Note_vaultId_fkey";

-- DropIndex
DROP INDEX "public"."Note_vaultId_key";

-- AlterTable
ALTER TABLE "public"."Note" DROP CONSTRAINT "Note_pkey",
DROP COLUMN "id",
ALTER COLUMN "vaultId" SET NOT NULL,
ADD CONSTRAINT "Note_pkey" PRIMARY KEY ("vaultId");

-- AddForeignKey
ALTER TABLE "public"."Note" ADD CONSTRAINT "Note_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "public"."Vault"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
