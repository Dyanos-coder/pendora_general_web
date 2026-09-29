'use server'

import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { createSession, deleteSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { FormState } from './form-state'

// Anti force brute simple : 5 échecs par e-mail sur 15 minutes (mémoire du serveur).
const failures = new Map<string, { count: number; since: number }>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 5

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const values = { email }
  if (!email || !password) return { error: 'E-mail et mot de passe requis.', values }

  const record = failures.get(email)
  if (record && Date.now() - record.since < WINDOW_MS && record.count >= MAX_FAILURES) {
    return { error: 'Trop de tentatives. Réessayez dans quelques minutes.', values }
  }

  const account = await prisma.account.findUnique({ where: { email } })
  const valid = account && account.isActive && (await bcrypt.compare(password, account.passwordHash))
  if (!valid) {
    const current = record && Date.now() - record.since < WINDOW_MS ? record : { count: 0, since: Date.now() }
    failures.set(email, { count: current.count + 1, since: current.since })
    return { error: 'Identifiants invalides.', values }
  }

  failures.delete(email)
  await prisma.account.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } })
  await createSession({ id: account.id, role: account.role })
  await logAudit(account.id, 'account.login')
  redirect('/dashboard')
}

/** Inscription libre : le compte est créé avec le rôle PROSPECTEUR. Un admin le promeut ensuite
 * (page Utilisateurs, ou directement en base). Exception : le tout premier compte du site devient
 * ADMIN, puisqu'il n'y a encore personne pour le promouvoir. */
export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')
  const values = { name, email }
  if (!name) return { error: 'Nom requis.', values }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'E-mail invalide.', values }
  if (password.length < 8) return { error: 'Mot de passe de 8 caractères minimum.', values }
  if (password !== confirm) return { error: 'Les deux mots de passe ne correspondent pas.', values }
  if (await prisma.account.findUnique({ where: { email } })) return { error: 'Un compte existe déjà avec cet e-mail.', values }

  const isFirstAccount = (await prisma.account.count()) === 0
  const account = await prisma.account.create({
    data: {
      id: randomUUID(),
      email,
      name,
      role: isFirstAccount ? 'ADMIN' : 'PROSPECTEUR',
      passwordHash: await bcrypt.hash(password, 12),
      lastLoginAt: new Date()
    }
  })
  await logAudit(account.id, 'account.register', account.id, account.role)
  await createSession({ id: account.id, role: account.role })
  redirect('/dashboard')
}

export async function logout(): Promise<void> {
  await deleteSession()
  redirect('/login')
}
