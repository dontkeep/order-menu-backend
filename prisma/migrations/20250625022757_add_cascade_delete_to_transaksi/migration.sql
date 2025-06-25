-- DropForeignKey
ALTER TABLE `transaksi` DROP FOREIGN KEY `Transaksi_user_id_fkey`;

-- AddForeignKey
ALTER TABLE `Transaksi` ADD CONSTRAINT `Transaksi_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
