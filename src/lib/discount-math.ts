// Réductions selon le nombre d'éléments de l'abonnement (Plan-Reductions-Abonnement.md) : calculs
// purs, partagés par le devis (serveur), la console (aperçu, paiement manuel) et la page d'accueil.

export interface DiscountTierRule {
  /** À partir de ce nombre d'éléments payants choisis… */
  minItems: number
  /** …ce pourcentage de moins sur tout le paiement. */
  percent: number
}

export const MIN_TIER_ITEMS = 2
export const MAX_TIER_ITEMS = 100
export const MAX_TIER_PERCENT = 90
export const MAX_TIERS = 10

export function sortTiers(tiers: DiscountTierRule[]): DiscountTierRule[] {
  return [...tiers].sort((a, b) => a.minItems - b.minItems)
}

/** Palier atteint avec `count` éléments (le seuil le plus haut ≤ count), sinon null. */
export function tierFor(count: number, tiers: DiscountTierRule[]): DiscountTierRule | null {
  return sortTiers(tiers).filter((t) => t.minItems <= count).pop() ?? null
}

/** Palier suivant, et nombre d'éléments qu'il manque pour l'atteindre. */
export function nextTier(count: number, tiers: DiscountTierRule[]): (DiscountTierRule & { missing: number }) | null {
  const next = sortTiers(tiers).find((t) => t.minItems > count)
  return next ? { ...next, missing: next.minItems - count } : null
}

/** Montant après réduction, arrondi à la dizaine inférieure (en faveur du client). */
export function applyPercent(gross: number, percent: number): { total: number; amount: number } {
  if (percent <= 0 || gross <= 0) return { total: gross, amount: 0 }
  const total = Math.floor((gross * (100 - percent)) / 100 / 10) * 10
  return { total, amount: gross - total }
}

/** Contrôle d'une liste de paliers saisie dans la console ; message d'erreur, ou null si correcte. */
export function validateTiers(tiers: DiscountTierRule[]): string | null {
  if (tiers.length > MAX_TIERS) return `${MAX_TIERS} paliers au maximum.`
  for (const t of tiers) {
    if (!Number.isInteger(t.minItems) || t.minItems < MIN_TIER_ITEMS || t.minItems > MAX_TIER_ITEMS) {
      return `Le nombre d'éléments doit être un entier entre ${MIN_TIER_ITEMS} et ${MAX_TIER_ITEMS}.`
    }
    if (!Number.isInteger(t.percent) || t.percent < 1 || t.percent > MAX_TIER_PERCENT) {
      return `La réduction doit être un pourcentage entier entre 1 et ${MAX_TIER_PERCENT}.`
    }
  }
  const sorted = sortTiers(tiers)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].minItems === sorted[i - 1].minItems) return `Deux paliers commencent à ${sorted[i].minItems} éléments.`
    if (sorted[i].percent <= sorted[i - 1].percent) {
      return `La réduction doit augmenter avec le nombre d'éléments (${sorted[i].minItems} éléments : plus de ${sorted[i - 1].percent} %).`
    }
  }
  return null
}

/** « dès 3 éléments −17 %, dès 10 éléments −25 % » */
export function describeTiers(tiers: DiscountTierRule[]): string {
  return sortTiers(tiers)
    .map((t) => `dès ${t.minItems} éléments −${t.percent} %`)
    .join(', ')
}
