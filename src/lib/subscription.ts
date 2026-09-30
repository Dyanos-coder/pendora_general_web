import 'server-only'
import { randomBytes } from 'crypto'
import type { Hospital, PriceItem } from '@/generated/prisma/client'
import { prisma } from './db'
import { decryptSecret, encryptSecret } from './crypto'
import { accessOf, openConnection } from './hospital-db'
import { FREE_MODULES, OFFERS } from './offers'
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

/** Grille courante ; initialisée depuis offers.ts au premier appel si la table est vide. */
export async function getPriceItems(): Promise<PriceItem[]> {
  const existing = await prisma.priceItem.findMany({ orderBy: { sortOrder: 'asc' } })
  if (existing.length > 0) return existing
  let order = 0
  for (const offer of OFFERS) {
    for (const item of offer.billing) {
      await prisma.priceItem.upsert({
        where: { key: item.key },
        update: {},
        create: {
          key: item.key,
          offer: offer.name,
          label: item.label,
          price: offer.price,
          modules: JSON.stringify(item.modules),
          mandatory: Boolean(offer.mandatory),
          comingSoon: Boolean(offer.comingSoon),
          sortOrder: order++
        }
      })
    }
  }
  return prisma.priceItem.findMany({ orderBy: { sortOrder: 'asc' } })
}

export function itemModules(item: PriceItem): string[] {
  try {
    return JSON.parse(item.modules) as string[]
  } catch {
    return []
  }
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
  const chosen = items as PriceItem[]
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
