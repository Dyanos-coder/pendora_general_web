import { prisma } from '@/lib/db'
import { authenticateDevice, dbAccessPayload, hashActivationCode } from '@/lib/activation'

/** Contrôle d'un poste au lancement de l'application : son code d'activation doit toujours être
 * celui de l'hôpital (sinon il est redemandé), puis il reçoit les accès à jour de la base (mot de
 * passe changé, base déplacée…). */
export async function POST(request: Request) {
  const auth = await authenticateDevice(request)
  if (!auth.ok) {
    return Response.json(
      auth.reason === 'REVOKED'
        ? { ok: false, reason: 'REVOKED', error: 'Ce poste n’est plus autorisé. Saisissez un code d’activation.' }
        : { ok: false, reason: 'INVALID', error: 'Jeton de poste invalide.' },
      { status: auth.reason === 'REVOKED' ? 403 : 401 }
    )
  }
  const input = (await request.json().catch(() => ({}))) as { appVersion?: string; code?: string }
  const hospital = auth.device.hospital
  if (!input.code || !hospital.activationCodeHash || hashActivationCode(input.code) !== hospital.activationCodeHash) {
    return Response.json(
      { ok: false, reason: 'CODE_CHANGED', error: 'Le code d’activation de votre établissement a changé. Saisissez le nouveau code fourni par Pandora.' },
      { status: 403 }
    )
  }
  await prisma.device.update({
    where: { id: auth.device.id },
    data: { lastSeenAt: new Date(), ...(input.appVersion ? { appVersion: input.appVersion.slice(0, 40) } : {}) }
  })
  return Response.json({
    ok: true,
    hospital: { id: auth.device.hospital.id, name: auth.device.hospital.name },
    db: dbAccessPayload(auth.device.hospital)
  })
}
