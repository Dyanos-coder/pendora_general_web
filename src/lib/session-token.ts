import { SignJWT, jwtVerify } from 'jose'

// Jeton de session (cookie httpOnly signé) — module sans dépendance serveur lourde pour être
// utilisable aussi par proxy.ts (vérification optimiste avant d'afficher une page).

export const SESSION_COOKIE = 'pandora_session'
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

export type AccountRole = 'ADMIN' | 'PROSPECTEUR'

export interface SessionPayload {
  accountId: string
  role: AccountRole
}

function key(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret === 'change-me') throw new Error('SESSION_SECRET manquant ou non personnalisé (voir .env.example).')
  return new TextEncoder().encode(secret)
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key())
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] })
    if (typeof payload.accountId !== 'string' || (payload.role !== 'ADMIN' && payload.role !== 'PROSPECTEUR')) return null
    return { accountId: payload.accountId, role: payload.role }
  } catch {
    return null
  }
}
