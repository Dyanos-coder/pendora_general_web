import { logAudit } from '@/lib/audit'
import { createDevice } from '@/lib/activation'
import { authenticateHospital, unauthorized } from '@/lib/hospital-auth'

/** Postes installés avant les codes d'activation : ils s'inscrivent eux-mêmes, authentifiés par le
 * secret de liaison `pandora_link` déjà présent dans la base de leur hôpital. */
export async function POST(request: Request) {
  const body = await request.text()
  const hospital = await authenticateHospital(request, body)
  if (!hospital) return unauthorized()
  const input = JSON.parse(body || '{}') as { deviceName?: string; appVersion?: string }
  const { device, token } = await createDevice(hospital.id, String(input.deviceName ?? ''), input.appVersion ?? null)
  await logAudit(null, 'device.enroll', hospital.id, `${device.name} (${device.id})`)
  return Response.json({ ok: true, hospital: { id: hospital.id, name: hospital.name }, deviceToken: token })
}
