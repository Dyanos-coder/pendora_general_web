-- Pages déjà présentes au moins une fois dans un abonnement (Plan-Gestion-Des-Plans.md §8) : un
-- élément de la grille dont une page y figure ne peut plus être supprimé. Remplie à chaque écriture
-- d'abonnement ; les abonnements antérieurs sont relus dans les bases des hôpitaux à la première
-- vérification (les paiements, eux, sont lus directement).

-- CreateTable
CREATE TABLE `subscribed_module` (
    `hospitalId` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `firstAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`hospitalId`, `module`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
