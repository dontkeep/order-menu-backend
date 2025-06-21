/*
  Warnings:

  - You are about to drop the column `delivery_status` on the `Transaksi` table. All the data in the column will be lost.
  - Added the required column `payment_proof` to the `Transaksi` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Transaksi` DROP COLUMN `delivery_status`,
    ADD COLUMN `payment_proof` VARCHAR(191) NOT NULL;
