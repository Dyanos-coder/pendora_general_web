import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from './db'
import { SESSION_COOKIE, SESSION_DURATION_MS, signSession, verifySession, type AccountRole } from './session-token'

export interface CurrentAccount {
  id: string
  email: string
  name: string
  role: AccountRole
}

export async function createSession(account: { id: string; role: AccountRole }): Promise<void> {
  const token = await signSession({ accountId: account.id, role: account.role })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(Date.now() + SESSION_DURATION_MS)
  })
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

/** Compte connecté, revérifié en base à chaque requête (un compte désactivé perd l'accès tout de
 * suite, même avec un cookie encore valide). Mis en cache pour la durée d'un rendu. */
export const getCurrentAccount = cache(async (): Promise<CurrentAccount | null> => {
  const cookieStore = await cookies()
  const session = await verifySession(cookieStore.get(SESSION_COOKIE)?.value)
  if (!session) return null
  const account = await prisma.account.findUnique({ where: { id: session.accountId } })
  if (!account || !account.isActive) return null
  return { id: account.id, email: account.email, name: account.name, role: account.role }
})

/** À appeler en tête de chaque page, action ou route protégée. */
export async function requireAccount(role?: AccountRole): Promise<CurrentAccount> {
  const account = await getCurrentAccount()
  if (!account) redirect('/login')
  if (role === 'ADMIN' && account.role !== 'ADMIN') redirect('/hospitals')
  return account
}
