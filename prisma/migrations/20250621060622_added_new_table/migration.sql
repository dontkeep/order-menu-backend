-- CreateTable
CREATE TABLE `Ongkir` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `district_name` VARCHAR(191) NOT NULL,
    `district_post_kode` INTEGER NOT NULL,
    `price` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
