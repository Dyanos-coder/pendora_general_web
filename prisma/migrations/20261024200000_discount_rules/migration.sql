-- Règles de réduction (Plan-Reductions-Abonnement.md §8) : chaque palier appartient à une règle qui
-- porte sur tout l'abonnement ou sur certaines sections. Les paliers déjà créés deviennent la règle
-- « Tout l'abonnement » (identifiant `global`) : les montants ne changent pas.

-- CreateTable
CREATE TABLE `discount_rule` (
    `id` VARCHAR(191) NOT NULL,
    `planIds` VARCHAR(2000) NOT NULL DEFAULT '[]',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Règle « Tout l'abonnement » pour les paliers existants.
INSERT INTO `discount_rule` (`id`, `planIds`, `sortOrder`, `updatedAt`)
SELECT 'global', '[]', 0, NOW(3) FROM DUAL WHERE EXISTS (SELECT 1 FROM `discount_tier`);

-- AlterTable
ALTER TABLE `discount_tier` DROP PRIMARY KEY,
    ADD COLUMN `ruleId` VARCHAR(191) NOT NULL DEFAULT 'global',
    ADD PRIMARY KEY (`ruleId`, `minItems`);

ALTER TABLE `discount_tier` ALTER COLUMN `ruleId` DROP DEFAULT;

-- AddForeignKey
ALTER TABLE `discount_tier` ADD CONSTRAINT `discount_tier_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `discount_rule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
