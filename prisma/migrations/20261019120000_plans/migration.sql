-- Plans de la grille (Plan-Gestion-Des-Plans.md) : le nom du plan, recopié jusqu'ici dans chaque
-- élément (`price_item.offer`), devient une table modifiable dans la console. Reprise des données :
-- un plan par nom existant, avec l'identifiant, la couleur et les points forts de la grille d'origine.

-- CreateTable
CREATE TABLE `plan` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT 'emerald',
    `highlights` TEXT NOT NULL,
    `comingSoon` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Un plan par nom de plan existant, dans l'ordre actuel des éléments.
INSERT INTO `plan` (`id`, `name`, `color`, `highlights`, `comingSoon`, `active`, `sortOrder`)
SELECT UUID(), `offer`, 'emerald', '[]', MAX(`comingSoon`), true, MIN(`sortOrder`)
FROM `price_item`
GROUP BY `offer`;

-- Plans de la grille d'origine (src/lib/offers.ts) : identifiant, couleur et points forts.
UPDATE `plan` SET `id` = 'soins', `color` = 'emerald', `highlights` = '["Patients","Consultations"]'
WHERE `name` = 'Soins & Patients + Consultations';
UPDATE `plan` SET `id` = 'administration', `color` = 'sky', `highlights` = '["Ressources humaines","Approvisionnement"]'
WHERE `name` = 'Gestion administrative';
UPDATE `plan` SET `id` = 'services', `color` = 'orange', `highlights` = '["Rendez-vous","Hospitalisation","Urgences"]'
WHERE `name` = 'Gestion des patients et services';
UPDATE `plan` SET `id` = 'examens', `color` = 'violet',
  `highlights` = '["Laboratoire","Imagerie médicale","Cardiologie","Anatomopathologie","Endoscopie","Bloc opératoire"]'
WHERE `name` = 'Examens & plateau technique';
UPDATE `plan` SET `id` = 'medicaments', `color` = 'teal', `highlights` = '["Pharmacie","Stocks & Dépôts","Banque de sang"]'
WHERE `name` = 'Médicaments & stocks';
UPDATE `plan` SET `id` = 'intelligence', `color` = 'pink',
  `highlights` = '["Intelligence artificielle","Analyse & pilotage","Statistiques","Prévisions"]'
WHERE `name` = 'Intelligence & pilotage';
UPDATE `plan` SET `id` = 'signature', `color` = 'indigo',
  `highlights` = '["Documents & contrats","Signature électronique","Suivi des documents"]'
WHERE `name` = 'Signature à distance';
UPDATE `plan` SET `id` = 'finance', `color` = 'green', `highlights` = '["Comptabilité","Caisse"]'
WHERE `name` = 'Gestion financière';

-- Rattachement de chaque élément à son plan.
ALTER TABLE `price_item` ADD COLUMN `planId` VARCHAR(191) NULL;
UPDATE `price_item` `i` JOIN `plan` `p` ON `p`.`name` = `i`.`offer` SET `i`.`planId` = `p`.`id`;

-- AlterTable
ALTER TABLE `price_item` MODIFY `planId` VARCHAR(191) NOT NULL,
    DROP COLUMN `offer`,
    DROP COLUMN `comingSoon`;

-- CreateIndex
CREATE INDEX `price_item_planId_idx` ON `price_item`(`planId`);

-- AddForeignKey
ALTER TABLE `price_item` ADD CONSTRAINT `price_item_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
