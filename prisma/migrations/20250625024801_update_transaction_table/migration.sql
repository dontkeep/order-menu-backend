-- DropForeignKey
ALTER TABLE `transaksi_detail` DROP FOREIGN KEY `Transaksi_Detail_transaksi_id_fkey`;

-- AddForeignKey
ALTER TABLE `Transaksi_Detail` ADD CONSTRAINT `Transaksi_Detail_transaksi_id_fkey` FOREIGN KEY (`transaksi_id`) REFERENCES `Transaksi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
