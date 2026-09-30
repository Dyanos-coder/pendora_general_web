import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'
import type { Hospital } from '@/generated/prisma/client'
import { prisma } from './db'
import { decryptSecret } from './crypto'

// Authentification des appels de l'application d'un hôpital au site (abonnement) : signature
// HMAC-SHA256 avec le secret de liaison propre à l'hôpital (table pandora_link de sa base).
//   x-pandora-hospital  : identifiant de l'hôpital
//   x-pandora-timestamp : horodatage en millisecondes (±5 min)
//   x-pandora-signature : hex(HMAC(secret, `${timestamp}.${méthode}.${chemin}.${corps}`))

const MAX_SKEW_MS = 5 * 60 * 1000

export async function authenticateHospital(request: Request, body: string): Promise<Hospital | null> {
  const hospitalId = request.headers.get('x-pandora-hospital')
  const timestamp = request.headers.get('x-pandora-timestamp')
  const signature = request.headers.get('x-pandora-signature')
  if (!hospitalId || !timestamp || !signature) return null
  if (Math.abs(Date.now() - Number(timestamp)) > MAX_SKEW_MS) return null

  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } })
  if (!hospital?.linkSecretEnc) return null
  const path = new URL(request.url).pathname
  const expected = createHmac('sha256', decryptSecret(hospital.linkSecretEnc))
    .update(`${timestamp}.${request.method}.${path}.${body}`)
    .digest()
  const given = Buffer.from(signature, 'hex')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  return hospital
}

export function unauthorized(): Response {
  return Response.json({ ok: false, error: 'Requête non authentifiée.' }, { status: 401 })
}
