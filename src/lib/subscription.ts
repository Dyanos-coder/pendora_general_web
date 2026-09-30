import 'server-only'
import { randomBytes } from 'crypto'
import type { Hospital, PriceItem } from '@/generated/prisma/client'
import { prisma } from './db'
import { decryptSecret, encryptSecret } from './crypto'
import { accessOf, openConnection } from './hospital-db'
import { FREE_MODULES, OFFERS } from './offers'
import { signText, verifyText } from './signing'

// Abonnements (Plan-Site-Pandora.md §6) : grille, devis, dates d'échéance (le 28), signature
// Ed25519 et écriture dans la base de l'hôpital. Le site est le seul à pouvoir signer ; l'application
// vérifie la signature avec la clé publique qu'elle embarque (§6.4).

export interface SubscriptionPayload {
  v: 1
  hospitalId: string
  /** Modules de l'application débloqués (hors modules gratuits, ajoutés par l'application). */
  modules: string[]
  /** Clés de la grille payées (pour proposer le même renouvellement). */
  items: string[]
  /** Dernier jour couvert, inclus (AAAA-MM-JJ) — toujours un 28. */
  endDate: string
  issuedAt: string
  paymentId: string | null
}

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

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function todayYmd(): string {
  return ymd(new Date())
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

/** Premier mois inclus à l'installation (§9-B) : échéance le 28 du mois suivant. */
export function firstMonthEndDate(installedAt: Date): string {
  return the28th(installedAt.getUTCFullYear(), installedAt.getUTCMonth() + 1)
}

function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / 86400000)
}

export function isActive(payload: SubscriptionPayload | null | undefined): boolean {
  return Boolean(payload && payload.endDate >= todayYmd())
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
}

export class QuoteError extends Error {}

/**
 * Montant d'un paiement : (somme des prix) × mois, plus — si l'abonnement est en cours et que des
 * éléments sont ajoutés — ces éléments au prorata des jours restants jusqu'à l'échéance actuelle
 * (§9-C). `months = 0` : ajout de modules seul, sans prolonger.
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

  const active = isActive(current)
  const monthly = chosen.reduce((sum, i) => sum + i.price, 0)
  const currentItems = new Set(active ? current!.items : [])
  const added = chosen.filter((i) => !currentItems.has(i.key))
  // Jours restants jusqu'à l'échéance actuelle (au-delà, les éléments ajoutés sont compris dans `months`).
  const daysLeft = active ? Math.max(0, daysBetween(todayYmd(), current!.endDate) + 1) : 0
  const prorataRaw = active ? (added.reduce((sum, i) => sum + i.price, 0) * daysLeft) / 30 : 0
  const prorata = Math.ceil(prorataRaw / 100) * 100

  if (months === 0 && !(active && added.length > 0)) {
    throw new QuoteError('Choisissez une durée, ou ajoutez des modules à l’abonnement en cours.')
  }
  const newEndDate = months === 0 ? current!.endDate : active ? addMonthsTo28(current!.endDate, months) : freshEndDate(months)

  return {
    items: chosen.map((i) => ({ key: i.key, label: i.label, price: i.price })),
    modules: [...new Set(chosen.flatMap(itemModules))].sort(),
    months,
    monthly,
    prorata: { amount: prorata, days: daysLeft, items: added.map((i) => i.label) },
    total: monthly * months + prorata,
    previousEndDate: active ? current!.endDate : null,
    newEndDate
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
    const payload = JSON.parse(rows[0].payload) as SubscriptionPayload
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
  return {
    v: 1,
    hospitalId: hospital.id,
    modules: [...new Set(catalog.flatMap(itemModules))].sort(),
    items: catalog.map((i) => i.key),
    endDate: firstMonthEndDate(hospital.installedAt),
    issuedAt: new Date().toISOString(),
    paymentId: null
  }
}

export { FREE_MODULES }
