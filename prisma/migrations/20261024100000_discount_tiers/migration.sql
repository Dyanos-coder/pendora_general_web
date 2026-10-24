-- Réductions selon le nombre d'éléments de l'abonnement (Plan-Reductions-Abonnement.md) : paliers
-- réglés dans la console, et réduction enregistrée sur chaque paiement. Aucun palier au départ :
-- les montants ne changent pas tant que l'admin n'en crée pas.

-- AlterTable
ALTER TABLE `payment` ADD COLUMN `discountPercent` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `discountAmount` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `discount_tier` (
    `minItems` INTEGER NOT NULL,
    `percent` INTEGER NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`minItems`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
