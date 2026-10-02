-- AlterTable
ALTER TABLE `hospital` ADD COLUMN `activationCodeAt` DATETIME(3) NULL,
    ADD COLUMN `activationCodeEnc` TEXT NULL,
    ADD COLUMN `activationCodeHash` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `device` (
    `id` VARCHAR(191) NOT NULL,
    `hospitalId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `appVersion` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,

    UNIQUE INDEX `device_tokenHash_key`(`tokenHash`),
    INDEX `device_hospitalId_idx`(`hospitalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `hospital_activationCodeHash_key` ON `hospital`(`activationCodeHash`);

-- AddForeignKey
ALTER TABLE `device` ADD CONSTRAINT `device_hospitalId_fkey` FOREIGN KEY (`hospitalId`) REFERENCES `hospital`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

