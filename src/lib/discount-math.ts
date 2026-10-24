// Réductions de l'abonnement (Plan-Reductions-Abonnement.md) : calculs purs, partagés par le devis
// (serveur), la console (aperçu, paiement manuel) et la page d'accueil. Une règle = une portée
// (tout l'abonnement, ou certaines sections) et ses paliers ; on compte les éléments payants choisis
// dans la portée, et le palier atteint réduit ces éléments. Deux règles sur le même élément : la plus
// forte s'applique, sans cumul.

export interface DiscountTierRule {
  /** À partir de ce nombre d'éléments payants choisis dans la portée… */
  minItems: number
  /** …ce pourcentage de moins sur ces éléments. */
  percent: number
}

export interface DiscountRuleDef {
  id: string
  /** Sections (identifiants de plans) concernées ; vide = tout l'abonnement. */
  planIds: string[]
  tiers: DiscountTierRule[]
}

export const MIN_TIER_ITEMS = 2
export const MAX_TIER_ITEMS = 100
export const MAX_TIER_PERCENT = 90
export const MAX_TIERS = 10
export const MAX_RULES = 10
export const MAX_TOTAL_TIERS = 30

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

/** Contrôle des paliers d'une règle ; message d'erreur, ou null si corrects. */
export function validateTiers(tiers: DiscountTierRule[]): string | null {
  if (tiers.length === 0) return 'Chaque règle doit avoir au moins un palier.'
  if (tiers.length > MAX_TIERS) return `${MAX_TIERS} paliers au maximum par règle.`
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

/** Contrôle de l'ensemble des règles (console) ; `planName` sert aux messages. */
export function validateRules(rules: DiscountRuleDef[], planName: (id: string) => string = (id) => id): string | null {
  if (rules.length > MAX_RULES) return `${MAX_RULES} règles au maximum.`
  if (rules.reduce((n, r) => n + r.tiers.length, 0) > MAX_TOTAL_TIERS) return `${MAX_TOTAL_TIERS} paliers au maximum en tout.`
  if (rules.filter((r) => r.planIds.length === 0).length > 1) return 'Une seule règle peut porter sur tout l’abonnement.'
  const owner = new Map<string, number>()
  for (const [index, rule] of rules.entries()) {
    for (const planId of rule.planIds) {
      if (owner.has(planId) && owner.get(planId) !== index) return `La section « ${planName(planId)} » est dans deux règles.`
      owner.set(planId, index)
    }
    const error = validateTiers(rule.tiers)
    if (error) return `${scopeLabel(rule, planName)} : ${error}`
  }
  return null
}

export function scopeLabel(rule: Pick<DiscountRuleDef, 'planIds'>, planName: (id: string) => string = (id) => id): string {
  return rule.planIds.length === 0 ? 'Tout l’abonnement' : rule.planIds.map(planName).join(' + ')
}

/** « dès 3 éléments −17 %, dès 10 éléments −25 % » */
export function describeTiers(tiers: DiscountTierRule[]): string {
  return sortTiers(tiers)
    .map((t) => `dès ${t.minItems} éléments −${t.percent} %`)
    .join(', ')
}

/** « Tout l'abonnement : dès 10 éléments −10 % · Examens : dès 3 éléments −20 % » */
export function describeRules(rules: DiscountRuleDef[], planName: (id: string) => string = (id) => id): string {
  return rules.map((r) => `${scopeLabel(r, planName)} : ${describeTiers(r.tiers)}`).join(' · ')
}

// --- Calcul d'un paiement ------------------------------------------------------------------------

export interface DiscountItem {
  key: string
  planId: string
  price: number
}

export interface DiscountLine {
  ruleId: string
  /** « Tout l'abonnement » ou noms des sections. */
  scope: string
  /** Éléments payants choisis dans la portée de la règle. */
  itemCount: number
  percent: number
  minItems: number
  /** Éléments réduits par cette règle (la plus forte pour chacun). */
  keys: string[]
  amount: number
}

export interface DiscountHint {
  scope: string
  missing: number
  percent: number
}

export interface DiscountBreakdown {
  gross: number
  total: number
  amount: number
  /** Pourcentage effectif sur tout le paiement (arrondi). */
  percent: number
  lines: DiscountLine[]
  /** Paliers suivants, par règle. */
  hints: DiscountHint[]
  /** Pourcentage appliqué à chaque élément (0 si aucun). */
  percentByKey: Record<string, number>
}

/**
 * Réduction d'un paiement : `months` mois des éléments choisis, plus `prorata` (montant des ajouts en
 * cours de période, réparti entre les éléments ajoutés au prorata de leur prix).
 */
export function computeDiscount(
  items: DiscountItem[],
  rules: DiscountRuleDef[],
  months: number,
  prorata: { amount: number; keys: string[] } = { amount: 0, keys: [] },
  planName: (id: string) => string = (id) => id
): DiscountBreakdown {
  const billable = items.filter((i) => i.price > 0)
  const addedPrice = billable.filter((i) => prorata.keys.includes(i.key)).reduce((s, i) => s + i.price, 0)
  const base = (i: DiscountItem): number =>
    i.price * months + (addedPrice > 0 && prorata.keys.includes(i.key) ? (prorata.amount * i.price) / addedPrice : 0)
  const gross = items.reduce((s, i) => s + i.price, 0) * months + prorata.amount

  // Palier atteint par chaque règle, puis la plus forte pour chaque élément.
  const reached = rules.map((rule) => {
    const inScope = billable.filter((i) => rule.planIds.length === 0 || rule.planIds.includes(i.planId))
    return { rule, inScope, tier: tierFor(inScope.length, rule.tiers) }
  })
  const best = new Map<string, (typeof reached)[number]>()
  for (const r of reached) {
    if (!r.tier) continue
    for (const item of r.inScope) {
      const current = best.get(item.key)
      if (!current || (current.tier?.percent ?? 0) < r.tier.percent) best.set(item.key, r)
    }
  }

  const lines: DiscountLine[] = []
  let exact = 0
  for (const r of reached) {
    if (!r.tier) continue
    const keys = r.inScope.filter((i) => best.get(i.key) === r).map((i) => i.key)
    if (keys.length === 0) continue
    const lineExact = billable.filter((i) => keys.includes(i.key)).reduce((s, i) => s + (base(i) * r.tier!.percent) / 100, 0)
    exact += lineExact
    lines.push({
      ruleId: r.rule.id,
      scope: scopeLabel(r.rule, planName),
      itemCount: r.inScope.length,
      percent: r.tier.percent,
      minItems: r.tier.minItems,
      keys,
      amount: Math.round(lineExact)
    })
  }

  const total = exact > 0 ? Math.floor((gross - exact) / 10) * 10 : gross
  const amount = gross - total
  // Arrondi : l'écart va sur la ligne la plus importante, pour que la somme des lignes = la réduction.
  if (lines.length > 0) {
    const gap = amount - lines.reduce((s, l) => s + l.amount, 0)
    lines.reduce((a, b) => (b.amount > a.amount ? b : a)).amount += gap
  }

  const hints: DiscountHint[] = []
  for (const r of reached) {
    const next = nextTier(r.inScope.length, r.rule.tiers)
    if (next) hints.push({ scope: scopeLabel(r.rule, planName), missing: next.missing, percent: next.percent })
  }

  const percentByKey: Record<string, number> = {}
  for (const item of items) percentByKey[item.key] = best.get(item.key)?.tier?.percent ?? 0

  return { gross, total, amount, percent: gross > 0 ? Math.round((amount / gross) * 100) : 0, lines, hints, percentByKey }
}
