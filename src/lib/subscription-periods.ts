// Abonnement découpé en périodes successives (Plan-Site-Pandora.md §6) : un paiement ne remplace
// jamais ce qui est déjà acquis. Les modules ajoutés sont actifs tout de suite (payés au prorata
// jusqu'à la fin de ce qui est déjà couvert) ; la nouvelle sélection ne s'applique qu'aux mois
// achetés, à la suite des périodes en cours. Ex. mois d'essai (tous les modules) jusqu'au 28/10,
// puis « Soins » seul payé jusqu'au 28/11. Module pur : utilisable côté serveur et client.

export interface SubscriptionPeriod {
  /** Dernier jour couvert, inclus (AAAA-MM-JJ, un 28) ; la période commence le lendemain de la précédente. */
  until: string
  items: string[]
  modules: string[]
}

export interface SubscriptionPayload {
  v: 2
  hospitalId: string
  /** Triées par date ; les périodes passées sont retirées à chaque nouvelle écriture. */
  periods: SubscriptionPeriod[]
  /** Fin de la dernière période (lecture simple de l'échéance). */
  endDate: string
  issuedAt: string
  paymentId: string | null
}

/** Ancien format (une seule période) → format à périodes. */
export function normalizePayload(raw: unknown): SubscriptionPayload | null {
  const p = raw as Partial<SubscriptionPayload> & { endDate?: string; items?: string[]; modules?: string[] }
  if (!p || typeof p.hospitalId !== 'string') return null
  const periods: SubscriptionPeriod[] = Array.isArray(p.periods)
    ? p.periods.map((x) => ({ until: String(x.until), items: x.items ?? [], modules: x.modules ?? [] }))
    : p.endDate
      ? [{ until: p.endDate, items: p.items ?? [], modules: p.modules ?? [] }]
      : []
  if (periods.length === 0) return null
  periods.sort((a, b) => a.until.localeCompare(b.until))
  return {
    v: 2,
    hospitalId: p.hospitalId,
    periods,
    endDate: periods[periods.length - 1].until,
    issuedAt: String(p.issuedAt ?? ''),
    paymentId: p.paymentId ?? null
  }
}

export function ymd(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function todayYmd(): string {
  return ymd(new Date())
}

export function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / 86400000)
}

function dayAfter(value: string): string {
  return ymd(new Date(Date.parse(`${value}T00:00:00Z`) + 86400000))
}

function the28th(year: number, monthIndex: number): string {
  return ymd(new Date(Date.UTC(year, monthIndex, 28)))
}

/** Échéance à N mois d'une échéance existante (un 28 → un 28). */
export function addMonthsTo28(endDate: string, months: number): string {
  const [y, m] = endDate.split('-').map(Number)
  return the28th(y, m - 1 + months)
}

/** Abonnement repris après expiration : N mois à partir d'aujourd'hui, arrondis au 28 suivant. */
export function freshEndDate(months: number, from = new Date()): string {
  const target = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months, from.getUTCDate()))
  return target.getUTCDate() <= 28 ? the28th(target.getUTCFullYear(), target.getUTCMonth()) : the28th(target.getUTCFullYear(), target.getUTCMonth() + 1)
}

/** Périodes pas encore terminées (la première est celle en cours). */
export function livePeriods(payload: SubscriptionPayload | null | undefined, today = todayYmd()): SubscriptionPeriod[] {
  return payload ? payload.periods.filter((p) => p.until >= today) : []
}

export function currentPeriod(payload: SubscriptionPayload | null | undefined, today = todayYmd()): SubscriptionPeriod | null {
  return livePeriods(payload, today)[0] ?? null
}

export function isActive(payload: SubscriptionPayload | null | undefined, today = todayYmd()): boolean {
  return livePeriods(payload, today).length > 0
}

export interface Plan {
  periods: SubscriptionPeriod[]
  /** Montant dû pour les éléments ajoutés aux périodes déjà couvertes (avant arrondi : voir `prorataAmount`). */
  prorataAmount: number
  prorataDays: number
  /** Éléments ajoutés à au moins une période déjà couverte. */
  addedItems: string[]
  previousEndDate: string | null
  newEndDate: string
}

/**
 * Nouveau découpage après un paiement : les éléments choisis sont ajoutés aux périodes en cours et à
 * venir qui ne les ont pas (au prorata de leurs jours), puis `months` mois sont ajoutés à la suite
 * avec exactement la sélection choisie. `priceOf` sert au calcul du prorata (absent = 0).
 */
export function planSubscription(
  current: SubscriptionPayload | null,
  chosenItems: string[],
  chosenModules: string[],
  months: number,
  priceOf: (key: string) => number = () => 0,
  today = todayYmd()
): Plan {
  const live = livePeriods(current, today)
  let prorataRaw = 0
  let prorataDays = 0
  const added = new Set<string>()
  let start = today
  const periods = live.map((p) => {
    const days = Math.max(0, daysBetween(start, p.until) + 1)
    const missing = chosenItems.filter((key) => !p.items.includes(key))
    if (missing.length > 0) {
      prorataRaw += (missing.reduce((sum, key) => sum + priceOf(key), 0) * days) / 30
      prorataDays += days
      missing.forEach((key) => added.add(key))
    }
    start = dayAfter(p.until)
    return {
      until: p.until,
      items: [...new Set([...p.items, ...chosenItems])],
      modules: [...new Set([...p.modules, ...chosenModules])].sort()
    }
  })

  const previousEndDate = live.length > 0 ? live[live.length - 1].until : null
  if (months > 0) {
    const until = previousEndDate ? addMonthsTo28(previousEndDate, months) : freshEndDate(months, new Date(`${today}T00:00:00Z`))
    const last = periods[periods.length - 1]
    const sameSelection = last && last.items.length === chosenItems.length && chosenItems.every((k) => last.items.includes(k))
    // Même sélection que la dernière période : on la prolonge au lieu d'en ajouter une.
    if (sameSelection) last.until = until
    else periods.push({ until, items: [...chosenItems], modules: [...chosenModules].sort() })
  }

  return {
    periods,
    prorataAmount: Math.ceil(prorataRaw / 100) * 100,
    prorataDays,
    addedItems: [...added],
    previousEndDate,
    newEndDate: periods.length > 0 ? periods[periods.length - 1].until : today
  }
}
