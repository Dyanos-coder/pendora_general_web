import { logAudit } from '@/lib/audit'
import { clientIp, createDevice, dbAccessPayload, findHospitalByCode, tooManyFailures } from '@/lib/activation'
import { testAccess } from '@/lib/hospital-db'

/** Activation d'un poste avec le code de son hôpital (Plan-Code-Activation.md) : renvoie les accès à
 * la base (testés juste avant) et le jeton du poste. */
export async function POST(request: Request) {
  const ip = clientIp(request)
  if (await tooManyFailures(ip)) {
    return Response.json({ ok: false, reason: 'RATE_LIMITED', error: 'Trop de codes invalides. Réessayez dans une heure.' }, { status: 429 })
  }
  const input = (await request.json().catch(() => ({}))) as { code?: string; deviceName?: string; appVersion?: string }
  const hospital = await findHospitalByCode(String(input.code ?? ''))
  if (!hospital) {
    await logAudit(null, 'activation.failed', ip)
    return Response.json(
      { ok: false, reason: 'INVALID_CODE', error: 'Code d’activation invalide ou remplacé. Demandez le code à jour à Pandora.' },
      { status: 404 }
    )
  }

  const access = dbAccessPayload(hospital)
  const test = await testAccess(access, { requirePandora: false })
  if (!test.ok) {
    await logAudit(null, 'activation.db_unreachable', hospital.id, test.error)
    return Response.json(
      { ok: false, reason: 'DB_UNREACHABLE', error: `La base de données de votre établissement ne répond pas (${test.error}). Contactez Pandora.` },
      { status: 503 }
    )
  }

  const { device, token } = await createDevice(hospital.id, String(input.deviceName ?? ''), input.appVersion ?? null)
  await logAudit(null, 'activation.success', hospital.id, `${device.name} (${device.id})`)
  return Response.json({
    ok: true,
    hospital: { id: hospital.id, name: hospital.name },
    deviceToken: token,
    db: access
  })
}
