/*
  Warnings:

  - You are about to drop the column `district` on the `user` table. All the data in the column will be lost.
  - Added the required column `district_id` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `user` DROP COLUMN `district`,
    ADD COLUMN `district_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_district_id_fkey` FOREIGN KEY (`district_id`) REFERENCES `Ongkir`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
