'use server'

import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAccount } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { FormState } from './form-state'

// Gestion des comptes du site — réservée aux admins (§4).

export async function createAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAccount('ADMIN')
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const name = String(formData.get('name') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const role = formData.get('role') === 'ADMIN' ? 'ADMIN' : 'PROSPECTEUR'
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'E-mail invalide.' }
  if (!name) return { error: 'Nom requis.' }
  if (password.length < 8) return { error: 'Mot de passe de 8 caractères minimum.' }
  if (await prisma.account.findUnique({ where: { email } })) return { error: 'Cet e-mail est déjà utilisé.' }

  const account = await prisma.account.create({
    data: { id: randomUUID(), email, name, role, passwordHash: await bcrypt.hash(password, 12) }
  })
  await logAudit(admin.id, 'account.create', account.id, `${email} (${role})`)
  revalidatePath('/accounts')
  return { success: `Compte ${role === 'ADMIN' ? 'admin' : 'prospecteur'} créé pour ${email}.` }
}

export async function setAccountActive(accountId: string, active: boolean): Promise<void> {
  const admin = await requireAccount('ADMIN')
  if (accountId === admin.id) return // on ne se désactive pas soi-même
  await prisma.account.update({ where: { id: accountId }, data: { isActive: active } })
  await logAudit(admin.id, active ? 'account.activate' : 'account.deactivate', accountId)
  revalidatePath('/accounts')
}

/** Promotion en admin ou retour en prospecteur (page Utilisateurs). */
export async function setAccountRole(accountId: string, role: 'ADMIN' | 'PROSPECTEUR'): Promise<void> {
  const admin = await requireAccount('ADMIN')
  if (accountId === admin.id) return // on ne change pas son propre rôle
  if (role !== 'ADMIN' && role !== 'PROSPECTEUR') return
  await prisma.account.update({ where: { id: accountId }, data: { role } })
  await logAudit(admin.id, 'account.role', accountId, role)
  revalidatePath('/accounts')
}

export async function resetAccountPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAccount('ADMIN')
  const accountId = String(formData.get('accountId') ?? '')
  const password = String(formData.get('password') ?? '')
  if (password.length < 8) return { error: 'Mot de passe de 8 caractères minimum.' }
  await prisma.account.update({ where: { id: accountId }, data: { passwordHash: await bcrypt.hash(password, 12) } })
  await logAudit(admin.id, 'account.reset_password', accountId)
  return { success: 'Mot de passe modifié.' }
}
