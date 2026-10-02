import { prisma } from '@/lib/db'
import { authenticateDevice, dbAccessPayload } from '@/lib/activation'

/** Accès à jour de la base pour un poste déjà activé (mot de passe changé, base déplacée…). */
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
  const input = (await request.json().catch(() => ({}))) as { appVersion?: string }
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
