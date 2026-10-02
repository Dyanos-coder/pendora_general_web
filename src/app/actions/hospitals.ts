'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireAccount } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { encryptSecret, decryptSecret } from '@/lib/crypto'
import { forgetOverview, testAccess, type HospitalDbAccess } from '@/lib/hospital-db'
import { assignActivationCode } from '@/lib/activation'
import type { MobileStatus } from '@/generated/prisma/client'
import type { FormState } from './form-state'

const MOBILE_STATUSES: MobileStatus[] = ['NON_SOUHAITEE', 'SOUHAITEE', 'INSTALLEE']

/** Valeurs saisies à réafficher après une erreur (jamais le mot de passe). */
function keptValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {}
  for (const key of ['name', 'dbHost', 'dbPort', 'dbName', 'dbUser', 'mobileStatus', 'notes']) {
    values[key] = String(formData.get(key) ?? '')
  }
  values.dbSsl = formData.get('dbSsl') === 'on' ? 'on' : ''
  return values
}

function fail(formData: FormData, error: string): FormState {
  return { error, values: keptValues(formData) }
}

function readAccess(formData: FormData, fallbackPassword?: string): HospitalDbAccess | { error: string } {
  const host = String(formData.get('dbHost') ?? '').trim()
  const port = Number(formData.get('dbPort') || 3306)
  const database = String(formData.get('dbName') ?? '').trim()
  const user = String(formData.get('dbUser') ?? '').trim()
  const typed = String(formData.get('dbPassword') ?? '')
  // Vide = conserver le mot de passe enregistré (modification) ; une base sans mot de passe reste
  // possible (serveur local de test).
  const password = typed || fallbackPassword || ''
  if (!host || !database || !user) return { error: "Renseignez l'hôte, le nom de la base et l'utilisateur." }
  if (!Number.isInteger(port) || port <= 0) return { error: 'Port invalide.' }
  return { host, port, database, user, password, ssl: formData.get('dbSsl') === 'on' }
}

/** Bouton « Tester la connexion » (formulaire d'ajout ou de modification). */
export async function testHospitalAccess(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAccount('ADMIN')
  const hospitalId = String(formData.get('hospitalId') ?? '')
  const existing = hospitalId ? await prisma.hospital.findUnique({ where: { id: hospitalId } }) : null
  const access = readAccess(formData, existing ? decryptSecret(existing.dbPasswordEnc) : undefined)
  if ('error' in access) return { error: access.error }
  const result = await testAccess(access, { requirePandora: false })
  if (!result.ok) return { error: result.error }
  if (result.empty) return { success: 'Connexion réussie — base vide : l’application la préparera à l’activation du premier poste.' }
  return { success: `Connexion réussie${result.companyName ? ` — établissement « ${result.companyName} »` : ''}.` }
}

export async function createHospital(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAccount('ADMIN')
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return fail(formData, "Renseignez le nom de l'hôpital.")
  const access = readAccess(formData)
  if ('error' in access) return fail(formData, access.error)

  // Identifiant unique de l'hôpital = nom d'utilisateur de sa base (§3).
  const id = access.user
  if (await prisma.hospital.findUnique({ where: { id } })) {
    return fail(formData, `Un hôpital utilise déjà l'utilisateur de base « ${id} ».`)
  }
  const test = await testAccess(access, { requirePandora: false })
  if (!test.ok) return fail(formData, `Connexion impossible : ${test.error}`)

  const mobileStatus = String(formData.get('mobileStatus') ?? 'NON_SOUHAITEE') as MobileStatus
  await prisma.hospital.create({
    data: {
      id,
      name,
      dbHost: access.host,
      dbPort: access.port,
      dbName: access.database,
      dbUser: access.user,
      dbPasswordEnc: encryptSecret(access.password),
      dbSsl: access.ssl,
      mobileStatus: MOBILE_STATUSES.includes(mobileStatus) ? mobileStatus : 'NON_SOUHAITEE',
      notes: String(formData.get('notes') ?? '').trim() || null
    }
  })
  // Code d'activation des postes, à donner à l'hôpital (Plan-Code-Activation.md).
  await assignActivationCode(id)
  await logAudit(admin.id, 'hospital.create', id, name)
  forgetOverview(id)
  revalidatePath('/hospitals')
  redirect(`/hospitals/${encodeURIComponent(id)}`)
}

export async function updateHospital(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAccount('ADMIN')
  const id = String(formData.get('hospitalId') ?? '')
  const existing = await prisma.hospital.findUnique({ where: { id } })
  if (!existing) return fail(formData, 'Hôpital introuvable.')
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return fail(formData, "Renseignez le nom de l'hôpital.")
  // Mot de passe laissé vide = conserver l'actuel.
  const access = readAccess(formData, decryptSecret(existing.dbPasswordEnc))
  if ('error' in access) return fail(formData, access.error)
  const test = await testAccess(access, { requirePandora: false })
  if (!test.ok) return fail(formData, `Connexion impossible : ${test.error}`)

  await prisma.hospital.update({
    where: { id },
    data: {
      name,
      dbHost: access.host,
      dbPort: access.port,
      dbName: access.database,
      dbUser: access.user,
      dbPasswordEnc: encryptSecret(access.password),
      dbSsl: access.ssl,
      notes: String(formData.get('notes') ?? '').trim() || null
    }
  })
  forgetOverview(id)
  await logAudit(admin.id, 'hospital.update', id)
  revalidatePath(`/hospitals/${encodeURIComponent(id)}`)
  revalidatePath('/hospitals')
  return { success: 'Modifications enregistrées.' }
}

/** Version mobile — ouvert aux prospecteurs comme aux admins (§4). */
export async function setMobileStatus(hospitalId: string, status: MobileStatus): Promise<void> {
  const account = await requireAccount()
  if (!MOBILE_STATUSES.includes(status)) return
  await prisma.hospital.update({ where: { id: hospitalId }, data: { mobileStatus: status } })
  await logAudit(account.id, 'hospital.mobile_status', hospitalId, status)
  revalidatePath(`/hospitals/${encodeURIComponent(hospitalId)}`)
  revalidatePath('/hospitals')
  revalidatePath('/dashboard')
}

/** Relit la base de l'hôpital sans attendre l'expiration du cache. */
export async function refreshHospital(hospitalId: string): Promise<void> {
  await requireAccount()
  forgetOverview(hospitalId)
  revalidatePath(`/hospitals/${encodeURIComponent(hospitalId)}`)
}

/** Nouveau code d'activation (ou premier code d'un hôpital ajouté avant les codes) : l'ancien ne
 * fonctionne plus, et chaque poste redemande le nouveau code à son prochain lancement. */
export async function regenerateActivationCode(hospitalId: string): Promise<FormState> {
  const admin = await requireAccount('ADMIN')
  if (!(await prisma.hospital.findUnique({ where: { id: hospitalId } }))) return { error: 'Hôpital introuvable.' }
  await assignActivationCode(hospitalId)
  await logAudit(admin.id, 'hospital.activation_code', hospitalId)
  revalidatePath(`/hospitals/${encodeURIComponent(hospitalId)}`)
  return { success: 'Nouveau code généré. Les postes le redemanderont à leur prochain lancement.' }
}

/** Révoque un poste : il ne peut plus récupérer les accès à la base et redemandera un code. */
export async function revokeDevice(deviceId: string): Promise<void> {
  const admin = await requireAccount('ADMIN')
  const device = await prisma.device.findUnique({ where: { id: deviceId } })
  if (!device || device.revokedAt) return
  await prisma.device.update({ where: { id: deviceId }, data: { revokedAt: new Date() } })
  await logAudit(admin.id, 'device.revoke', device.hospitalId, `${device.name} (${device.id})`)
  revalidatePath(`/hospitals/${encodeURIComponent(device.hospitalId)}`)
}
