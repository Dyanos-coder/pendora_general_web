import 'server-only'
import { randomBytes } from 'crypto'
import type { Hospital, Plan, PriceItem } from '@/generated/prisma/client'
import { prisma } from './db'
import { decryptSecret, encryptSecret } from './crypto'
import { accessOf, openConnection } from './hospital-db'
import { FREE_MODULES, OFFERS, colorFamily, type PlanColor } from './offers'
import { signText, verifyText } from './signing'
import {
  normalizePayload,
  planSubscription,
  ymd,
  type SubscriptionPayload,
  type SubscriptionPeriod
} from './subscription-periods'

export { addMonthsTo28, freshEndDate, isActive, todayYmd } from './subscription-periods'
export type { SubscriptionPayload, SubscriptionPeriod } from './subscription-periods'

// Abonnements (Plan-Site-Pandora.md §6) : grille, devis, dates d'échéance (le 28), signature
// Ed25519 et écriture dans la base de l'hôpital. Le site est le seul à pouvoir signer ; l'application
// vérifie la signature avec la clé publique qu'elle embarque (§6.4).

export interface HospitalSubscription {
  payload: SubscriptionPayload
  valid: boolean
}

// --- Grille ------------------------------------------------------------------------------------

export type CatalogPlan = Plan & { items: PriceItem[] }

/** Élément tel que l'utilisent devis, API de l'application et console : nom de son plan, et
 * disponibilité effective (un plan masqué ou « bientôt » rend ses éléments indisponibles). */
export type CatalogItem = PriceItem & { offer: string; comingSoon: boolean }

/** Grille d'origine (offers.ts), écrite au premier appel si la base n'a encore aucun plan. */
async function seedCatalog(): Promise<void> {
  if ((await prisma.priceItem.count()) > 0) return
  for (const [planOrder, offer] of OFFERS.entries()) {
    await prisma.plan.upsert({
      where: { id: offer.id },
      update: {},
      create: {
        id: offer.id,
        name: offer.name,
        color: offer.color,
        highlights: JSON.stringify(offer.items),
        comingSoon: Boolean(offer.comingSoon),
        sortOrder: planOrder,
        items: {
          create: offer.billing.map((item, order) => ({
            key: item.key,
            label: item.label,
            price: offer.price,
            modules: JSON.stringify(item.modules),
            mandatory: Boolean(offer.mandatory),
            sortOrder: order
          }))
        }
      }
    })
  }
}

/** Plans et leurs éléments, dans l'ordre d'affichage (Plan-Gestion-Des-Plans.md). */
export async function getPlans(): Promise<CatalogPlan[]> {
  const read = () =>
    prisma.plan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { items: { orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] } }
    })
  const plans = await read()
  if (plans.length > 0) return plans
  await seedCatalog()
  return read()
}

/** Grille à plat, dans l'ordre des plans puis des éléments. */
export async function getPriceItems(): Promise<CatalogItem[]> {
  const plans = await getPlans()
  return plans.flatMap((plan) =>
    plan.items.map((item) => ({ ...item, offer: plan.name, active: item.active && plan.active, comingSoon: plan.comingSoon }))
  )
}

export function itemModules(item: Pick<PriceItem, 'modules'>): string[] {
  try {
    return JSON.parse(item.modules) as string[]
  } catch {
    return []
  }
}

export function planHighlights(plan: Pick<Plan, 'highlights'>): string[] {
  try {
    return (JSON.parse(plan.highlights) as unknown[]).filter((h): h is string => typeof h === 'string' && h.trim() !== '')
  } catch {
    return []
  }
}

// --- Page d'accueil ---------------------------------------------------------------------------

export interface PublicOffer {
  id: string
  name: string
  color: PlanColor
  highlights: string[]
  comingSoon: boolean
  /** Prix affiché : celui du forfait, du module, ou le plus bas (« à partir de »). */
  price: number
  priceNote: 'par mois' | 'par mois et par module' | 'à partir de, par mois'
  fromPrice: boolean
}

export interface PublicPricing {
  offers: PublicOffer[]
  /** Exemple de la page d'accueil, recalculé avec les prix du moment (absent si un élément manque). */
  example: { labels: string[]; total: number } | null
}

function toPublicOffer(plan: {
  id: string
  name: string
  color: string
  comingSoon: boolean
  highlights: string[]
  items: { label: string; price: number }[]
}): PublicOffer {
  const prices = plan.items.map((i) => i.price)
  const min = Math.min(...prices)
  const single = plan.items.length === 1
  const same = prices.every((p) => p === min)
  return {
    id: plan.id,
    name: plan.name,
    color: colorFamily(plan.color),
    highlights: plan.highlights.length > 0 ? plan.highlights : plan.items.map((i) => i.label),
    comingSoon: plan.comingSoon,
    price: min,
    priceNote: single ? 'par mois' : same ? 'par mois et par module' : 'à partir de, par mois',
    fromPrice: !single && !same
  }
}

const EXAMPLE_KEYS = ['soins', 'laboratory', 'pharmacy', 'finance']

/** Cartes Tarifs de la page d'accueil depuis la grille (Plan-Gestion-Des-Plans.md §3.2) ; grille
 * d'origine (offers.ts) si la base du site est injoignable. */
export async function getPublicPricing(): Promise<PublicPricing> {
  try {
    const plans = await getPlans()
    const offers = plans
      .filter((p) => p.active)
      .map((p) => ({ ...p, highlights: planHighlights(p), items: p.items.filter((i) => i.active) }))
      .filter((p) => p.items.length > 0)
      .map(toPublicOffer)
    const items = plans.filter((p) => p.active && !p.comingSoon).flatMap((p) => p.items.filter((i) => i.active))
    const chosen = EXAMPLE_KEYS.map((key) => items.find((i) => i.key === key))
    const example = chosen.every(Boolean)
      ? { labels: chosen.map((i) => i!.label), total: chosen.reduce((sum, i) => sum + i!.price, 0) }
      : null
    return { offers, example }
  } catch (error) {
    console.error('[tarifs] grille de la base indisponible, grille d’origine affichée', error)
    return {
      offers: OFFERS.map((o) =>
        toPublicOffer({
          ...o,
          comingSoon: Boolean(o.comingSoon),
          highlights: o.items,
          items: o.billing.map((b) => ({ label: b.label, price: o.price }))
        })
      ),
      example: { labels: ['Soins & Patients', 'Laboratoire', 'Pharmacie', 'Gestion financière'], total: 50000 }
    }
  }
}

/** Nombre de paiements (payés ou appliqués) qui contiennent cet élément : s'il en a, il a été acheté. */
export async function itemPurchaseCount(key: string): Promise<number> {
  return prisma.payment.count({ where: { status: { in: ['PAYE', 'APPLIQUE'] }, items: { contains: JSON.stringify(key) } } })
}

/** Par élément : établissements dont le dernier paiement appliqué, encore en cours, le contient,
 * et nombre total de paiements qui l'ont acheté (console Plans & tarifs). */
export async function itemUsage(): Promise<Record<string, { current: number; purchases: number }>> {
  const payments = await prisma.payment.findMany({
    where: { status: { in: ['PAYE', 'APPLIQUE'] } },
    select: { hospitalId: true, status: true, items: true, newEndDate: true, appliedAt: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  })
  const usage: Record<string, { current: number; purchases: number }> = {}
  const keysOf = (items: string): string[] => {
    try {
      return JSON.parse(items) as string[]
    } catch {
      return []
    }
  }
  const latest = new Map<string, (typeof payments)[number]>()
  for (const payment of payments) {
    for (const key of keysOf(payment.items)) (usage[key] ??= { current: 0, purchases: 0 }).purchases++
    if (payment.status === 'APPLIQUE') latest.set(payment.hospitalId, payment)
  }
  const today = ymd(new Date())
  for (const payment of latest.values()) {
    if (!payment.newEndDate || payment.newEndDate < today) continue
    for (const key of keysOf(payment.items)) (usage[key] ??= { current: 0, purchases: 0 }).current++
  }
  return usage
}

// --- Dates (échéance le 28) -----------------------------------------------------------------

/** Premier mois inclus à l'installation (§9-B) : échéance le 28 du mois suivant. */
export function firstMonthEndDate(installedAt: Date): string {
  return ymd(new Date(Date.UTC(installedAt.getUTCFullYear(), installedAt.getUTCMonth() + 1, 28)))
}

// --- Devis ------------------------------------------------------------------------------------

export interface Quote {
  items: { key: string; label: string; price: number }[]
  modules: string[]
  months: number
  monthly: number
  prorata: { amount: number; days: number; items: string[] }
  total: number
  previousEndDate: string | null
  newEndDate: string
  /** Découpage de l'abonnement après ce paiement (ce qui est déjà acquis reste acquis). */
  periods: SubscriptionPeriod[]
}

export class QuoteError extends Error {}

/**
 * Montant d'un paiement : (somme des prix) × mois, plus — pour les éléments ajoutés aux périodes
 * déjà couvertes — leur prix au prorata des jours restants (§9-C). Ce qui est déjà acquis (mois
 * d'essai, mois déjà payés) n'est jamais retiré : la sélection s'applique aux mois achetés.
 * `months = 0` : ajout de modules seul, sans prolonger.
 */
export async function computeQuote(itemKeys: string[], months: number, current: SubscriptionPayload | null): Promise<Quote> {
  if (!Number.isInteger(months) || months < 0 || months > 24) throw new QuoteError('Durée invalide (0 à 24 mois).')
  const catalog = await getPriceItems()
  const keys = [...new Set(itemKeys)]
  const items = keys.map((key) => catalog.find((i) => i.key === key && i.active && !i.comingSoon))
  if (items.some((i) => !i)) throw new QuoteError('Un élément choisi est introuvable ou n’est plus proposé.')
  const chosen = items as CatalogItem[]
  for (const mandatory of catalog.filter((i) => i.mandatory && i.active)) {
    if (!keys.includes(mandatory.key)) throw new QuoteError(`« ${mandatory.label} » est obligatoire.`)
  }
  if (chosen.length === 0) throw new QuoteError('Aucun module choisi.')

  const modules = [...new Set(chosen.flatMap(itemModules))].sort()
  const price = new Map(chosen.map((i) => [i.key, i.price]))
  const plan = planSubscription(current, keys, modules, months, (key) => price.get(key) ?? 0)
  if (months === 0 && plan.addedItems.length === 0) {
    throw new QuoteError('Choisissez une durée, ou ajoutez des modules à l’abonnement en cours.')
  }
  const monthly = chosen.reduce((sum, i) => sum + i.price, 0)
  const labelOf = new Map(catalog.map((i) => [i.key, i.label]))

  return {
    items: chosen.map((i) => ({ key: i.key, label: i.label, price: i.price })),
    modules,
    months,
    monthly,
    prorata: { amount: plan.prorataAmount, days: plan.prorataDays, items: plan.addedItems.map((k) => labelOf.get(k) ?? k) },
    total: monthly * months + plan.prorataAmount,
    previousEndDate: plan.previousEndDate,
    newEndDate: plan.newEndDate,
    periods: plan.periods
  }
}

// --- Signature ---------------------------------------------------------------------------------

export function signPayload(payload: SubscriptionPayload): { payload: string; signature: string } {
  const text = JSON.stringify(payload)
  return { payload: text, signature: signText(text) }
}

// --- Base de l'hôpital -------------------------------------------------------------------------

// Tables créées aussi par la migration de l'application (même définition, IF NOT EXISTS) : le site
// peut ainsi écrire l'abonnement même si l'hôpital n'a pas encore mis à jour son application.
const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS \`subscription\` (
    \`id\` VARCHAR(191) NOT NULL, \`payload\` TEXT NOT NULL, \`signature\` TEXT NOT NULL,
    \`updatedAt\` DATETIME(3) NOT NULL, PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`pandora_link\` (
    \`id\` VARCHAR(191) NOT NULL, \`hospitalId\` VARCHAR(191) NOT NULL, \`siteUrl\` VARCHAR(500) NOT NULL,
    \`secret\` VARCHAR(255) NOT NULL, \`updatedAt\` DATETIME(3) NOT NULL, PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
]

export async function readHospitalSubscription(hospital: Hospital): Promise<HospitalSubscription | null> {
  const connection = await openConnection(accessOf(hospital))
  try {
    const rows = (await connection.query("SELECT payload, signature FROM subscription WHERE id = 'current'")) as {
      payload: string
      signature: string
    }[]
    if (!rows[0]) return null
    const payload = normalizePayload(JSON.parse(rows[0].payload))
    if (!payload) return null
    const valid = verifyText(rows[0].payload, rows[0].signature) && payload.hospitalId === hospital.id
    return { payload, valid }
  } catch (error) {
    if ((error as { errno?: number }).errno === 1146) return null // table absente : jamais abonné
    throw error
  } finally {
    await connection.end().catch(() => undefined)
  }
}

/** Secret de liaison site ↔ application, créé au besoin, écrit dans la base de l'hôpital. */
async function ensureLink(hospital: Hospital): Promise<string> {
  let secret = hospital.linkSecretEnc ? decryptSecret(hospital.linkSecretEnc) : null
  if (!secret) {
    secret = randomBytes(32).toString('base64url')
    await prisma.hospital.update({ where: { id: hospital.id }, data: { linkSecretEnc: encryptSecret(secret) } })
  }
  return secret
}

export async function writeHospitalSubscription(hospital: Hospital, payload: SubscriptionPayload): Promise<void> {
  const secret = await ensureLink(hospital)
  const signed = signPayload(payload)
  const siteUrl = (process.env.SITE_URL ?? '').replace(/\/+$/, '')
  const connection = await openConnection(accessOf(hospital))
  try {
    for (const sql of CREATE_TABLES) await connection.query(sql)
    await connection.query(
      "INSERT INTO subscription (id, payload, signature, updatedAt) VALUES ('current', ?, ?, NOW(3)) ON DUPLICATE KEY UPDATE payload = VALUES(payload), signature = VALUES(signature), updatedAt = NOW(3)",
      [signed.payload, signed.signature]
    )
    await connection.query(
      "INSERT INTO pandora_link (id, hospitalId, siteUrl, secret, updatedAt) VALUES ('current', ?, ?, ?, NOW(3)) ON DUPLICATE KEY UPDATE hospitalId = VALUES(hospitalId), siteUrl = VALUES(siteUrl), secret = VALUES(secret), updatedAt = NOW(3)",
      [hospital.id, siteUrl, secret]
    )
  } finally {
    await connection.end().catch(() => undefined)
  }
}

/** Premier mois inclus (§9-B) : tous les modules de la grille, jusqu'au 28 du mois suivant. */
export async function initialSubscription(hospital: Hospital): Promise<SubscriptionPayload> {
  const catalog = (await getPriceItems()).filter((i) => i.active && !i.comingSoon)
  const endDate = firstMonthEndDate(hospital.installedAt)
  return {
    v: 2,
    hospitalId: hospital.id,
    periods: [{ until: endDate, items: catalog.map((i) => i.key), modules: [...new Set(catalog.flatMap(itemModules))].sort() }],
    endDate,
    issuedAt: new Date().toISOString(),
    paymentId: null
  }
}

export { FREE_MODULES }
