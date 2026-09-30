-- AlterTable
ALTER TABLE `hospital` ADD COLUMN `linkSecretEnc` TEXT NULL;

-- CreateTable
CREATE TABLE `price_item` (
    `key` VARCHAR(191) NOT NULL,
    `offer` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `price` INTEGER NOT NULL,
    `modules` TEXT NOT NULL,
    `mandatory` BOOLEAN NOT NULL DEFAULT false,
    `comingSoon` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment` (
    `id` VARCHAR(191) NOT NULL,
    `hospitalId` VARCHAR(191) NOT NULL,
    `method` ENUM('MONEYFUSION', 'MANUEL') NOT NULL,
    `status` ENUM('EN_ATTENTE', 'PAYE', 'APPLIQUE', 'ECHEC', 'ANNULE') NOT NULL DEFAULT 'EN_ATTENTE',
    `items` TEXT NOT NULL,
    `modules` TEXT NOT NULL,
    `months` INTEGER NOT NULL,
    `amount` INTEGER NOT NULL,
    `prorataAmount` INTEGER NOT NULL DEFAULT 0,
    `previousEndDate` VARCHAR(191) NULL,
    `newEndDate` VARCHAR(191) NULL,
    `moneyfusionToken` VARCHAR(191) NULL,
    `moneyfusionUrl` TEXT NULL,
    `payerName` VARCHAR(191) NULL,
    `payerPhone` VARCHAR(191) NULL,
    `transactionNumber` VARCHAR(191) NULL,
    `paymentMeans` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `recordedById` VARCHAR(191) NULL,
    `events` TEXT NULL,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paidAt` DATETIME(3) NULL,
    `appliedAt` DATETIME(3) NULL,

    UNIQUE INDEX `payment_moneyfusionToken_key`(`moneyfusionToken`),
    INDEX `payment_hospitalId_createdAt_idx`(`hospitalId`, `createdAt`),
    INDEX `payment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `payment_hospitalId_fkey` FOREIGN KEY (`hospitalId`) REFERENCES `hospital`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
