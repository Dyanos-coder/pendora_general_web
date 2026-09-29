import 'server-only'
import mariadb, { type Connection } from 'mariadb'
import type { Hospital } from '@/generated/prisma/client'
import { decryptSecret } from './crypto'
import { ALL_MODULE_IDS } from './modules'

// Lecture des bases des hôpitaux (§5) avec les accès enregistrés dans `Hospital`. Lecture seule,
// délais courts (une base lente ou coupée ne bloque jamais l'affichage), résultats gardés en
// mémoire quelques minutes. Chaque requête est isolée : une base d'une ancienne version (table
// absente) donne simplement une valeur manquante, pas une erreur globale.

export interface HospitalDbAccess {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl: boolean
}

export interface HospitalOverview {
  reachable: boolean
  error: string | null
  checkedAt: string
  company: { name: string; address: string | null; phone: string | null } | null
  /** Modules affichés par l'établissement (null en base = tous). */
  enabledModules: string[]
  patients: number | null
  activeUsers: number | null
  consultationsThisMonth: number | null
  cashThisMonth: number | null
  lastMigration: { name: string; appliedAt: string } | null
  lastActivityAt: string | null
}

const CACHE_TTL_MS = 2 * 60 * 1000
const cache = new Map<string, { at: number; data: HospitalOverview }>()

export function accessOf(hospital: Hospital): HospitalDbAccess {
  return {
    host: hospital.dbHost,
    port: hospital.dbPort,
    database: hospital.dbName,
    user: hospital.dbUser,
    password: decryptSecret(hospital.dbPasswordEnc),
    ssl: hospital.dbSsl
  }
}

export function openConnection(access: HospitalDbAccess): Promise<Connection> {
  return mariadb.createConnection({
    host: access.host,
    port: access.port,
    database: access.database,
    user: access.user,
    password: access.password,
    connectTimeout: 5000,
    queryTimeout: 8000,
    ssl: access.ssl ? { rejectUnauthorized: false } : undefined
  })
}

function describeError(error: unknown): string {
  const e = error as { code?: string; errno?: number; message?: string }
  if (e.errno === 1045 || e.code === 'ER_ACCESS_DENIED_ERROR') return 'Accès refusé (utilisateur ou mot de passe).'
  if (e.errno === 1049 || e.code === 'ER_BAD_DB_ERROR') return 'Base de données introuvable.'
  if (e.errno === 1130) return "Connexion distante non autorisée par l'hébergeur de la base."
  if (/ENOTFOUND|EAI_AGAIN/.test(`${e.code} ${e.message}`)) return 'Hôte introuvable.'
  if (/ECONNREFUSED|ETIMEDOUT|TIMEOUT|EHOSTUNREACH/i.test(`${e.code} ${e.message}`)) return 'Base injoignable.'
  return e.message ?? 'Connexion impossible.'
}

/** Test d'accès avant enregistrement d'un hôpital : vérifie aussi qu'il s'agit bien d'une base
 * Pandora Health (table `company` présente) et renvoie le nom de l'établissement. */
export async function testAccess(access: HospitalDbAccess): Promise<{ ok: true; companyName: string | null } | { ok: false; error: string }> {
  let connection: Connection | undefined
  try {
    connection = await openConnection(access)
    const rows = (await connection.query('SELECT name FROM company LIMIT 1')) as { name: string }[]
    return { ok: true, companyName: rows[0]?.name ?? null }
  } catch (error) {
    const e = error as { errno?: number }
    if (e.errno === 1146) return { ok: false, error: "Connexion réussie, mais ce n'est pas une base Pandora Health (table « company » absente)." }
    return { ok: false, error: describeError(error) }
  } finally {
    await connection?.end().catch(() => undefined)
  }
}

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch {
    return null
  }
}

function toNumber(value: unknown): number {
  return typeof value === 'bigint' ? Number(value) : Number(value ?? 0)
}

function monthStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export async function readOverview(hospital: Hospital, options: { force?: boolean } = {}): Promise<HospitalOverview> {
  const cached = cache.get(hospital.id)
  if (!options.force && cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data

  let connection: Connection | undefined
  let data: HospitalOverview
  try {
    connection = await openConnection(accessOf(hospital))
    const c = connection
    const since = monthStart()
    const company = await safe(async () => {
      const rows = (await c.query('SELECT name, address, phone, enabledModules FROM company LIMIT 1')) as {
        name: string
        address: string | null
        phone: string | null
        enabledModules: string | null
      }[]
      return rows[0] ?? null
    })
    let enabledModules = ALL_MODULE_IDS
    if (company?.enabledModules) {
      try {
        enabledModules = JSON.parse(company.enabledModules) as string[]
      } catch {
        // valeur illisible : tous les modules
      }
    }
    const count = (sql: string, params: unknown[] = []) =>
      safe(async () => toNumber(((await c.query(sql, params)) as { n: unknown }[])[0]?.n))

    const [patients, activeUsers, consultationsThisMonth, cashThisMonth, lastMigration, lastActivity] = await Promise.all([
      count('SELECT COUNT(*) AS n FROM patient WHERE deletedAt IS NULL'),
      count('SELECT COUNT(*) AS n FROM `user` WHERE isActive = 1'),
      count('SELECT COUNT(*) AS n FROM consultation WHERE deletedAt IS NULL AND date >= ?', [since]),
      count("SELECT COALESCE(SUM(amount), 0) AS n FROM receipt WHERE status = 'PAYE' AND issuedAt >= ?", [since]),
      safe(async () => {
        const rows = (await c.query(
          'SELECT migration_name AS name, finished_at AS appliedAt FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name DESC LIMIT 1'
        )) as { name: string; appliedAt: Date }[]
        return rows[0] ? { name: rows[0].name, appliedAt: new Date(rows[0].appliedAt).toISOString() } : null
      }),
      safe(async () => {
        const rows = (await c.query('SELECT MAX(createdAt) AS at FROM auditlog')) as { at: Date | null }[]
        return rows[0]?.at ? new Date(rows[0].at).toISOString() : null
      })
    ])

    data = {
      reachable: true,
      error: null,
      checkedAt: new Date().toISOString(),
      company: company ? { name: company.name, address: company.address, phone: company.phone } : null,
      enabledModules,
      patients,
      activeUsers,
      consultationsThisMonth,
      cashThisMonth,
      lastMigration,
      lastActivityAt: lastActivity
    }
  } catch (error) {
    data = {
      reachable: false,
      error: describeError(error),
      checkedAt: new Date().toISOString(),
      company: null,
      enabledModules: [],
      patients: null,
      activeUsers: null,
      consultationsThisMonth: null,
      cashThisMonth: null,
      lastMigration: null,
      lastActivityAt: null
    }
  } finally {
    await connection?.end().catch(() => undefined)
  }

  cache.set(hospital.id, { at: Date.now(), data })
  return data
}

/** Lecture de plusieurs hôpitaux, 5 bases à la fois au maximum. */
export async function readOverviews(hospitals: Hospital[]): Promise<Map<string, HospitalOverview>> {
  const result = new Map<string, HospitalOverview>()
  const queue = [...hospitals]
  async function worker(): Promise<void> {
    for (let h = queue.shift(); h; h = queue.shift()) {
      result.set(h.id, await readOverview(h))
    }
  }
  await Promise.all(Array.from({ length: Math.min(5, hospitals.length) }, worker))
  return result
}

export function forgetOverview(hospitalId: string): void {
  cache.delete(hospitalId)
}
