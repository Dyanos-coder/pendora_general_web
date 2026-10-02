import type { Hospital } from '@/generated/prisma/client'
import { prisma } from '@/lib/db'
import { readActivationCode } from '@/lib/activation'
import { Badge, Card, formatDate } from '@/components/ui'
import { ActivationCode, RevokeDeviceButton } from './ActivationControls'

/** Code d'activation et postes de l'hôpital (Plan-Code-Activation.md). Le code et la gestion des
 * postes sont réservés aux admins ; les prospecteurs voient seulement le nombre de postes. */
export async function ActivationPanel({ hospital, isAdmin }: { hospital: Hospital; isAdmin: boolean }) {
  const devices = await prisma.device.findMany({ where: { hospitalId: hospital.id }, orderBy: [{ revokedAt: 'asc' }, { lastSeenAt: 'desc' }] })
  const active = devices.filter((d) => !d.revokedAt)

  if (!isAdmin) {
    return (
      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-gray-900">Postes</h2>
        <p className="mt-1 text-sm text-gray-600">{active.length} poste(s) activé(s).</p>
      </Card>
    )
  }

  return (
    <Card className="mt-6">
      <h2 className="text-sm font-semibold text-gray-900">Code d&apos;activation</h2>
      <p className="mb-4 mt-0.5 text-xs text-gray-500">
        À saisir dans l&apos;application Pandora Health au premier lancement de chaque poste : l&apos;application récupère
        alors seule les accès à la base. Le code est vérifié à chaque lancement : le régénérer oblige tous les postes à
        saisir le nouveau. Ne le communiquez qu&apos;à l&apos;hôpital.
      </p>
      <ActivationCode hospitalId={hospital.id} code={readActivationCode(hospital)} />

      <div className="mt-6 border-t border-gray-100 pt-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Postes ({active.length} actif(s))</h3>
        {devices.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun poste activé pour le moment.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <tbody>
              {devices.map((d) => (
                <tr key={d.id} className={`border-b border-gray-100 last:border-0 ${d.revokedAt ? 'opacity-50' : ''}`}>
                  <td className="py-2 font-medium text-gray-900">{d.name}</td>
                  <td className="py-2 text-gray-500">{d.appVersion ? `v${d.appVersion}` : '—'}</td>
                  <td className="py-2 text-gray-500">activé le {formatDate(d.createdAt)}</td>
                  <td className="py-2 text-gray-500">vu le {formatDate(d.lastSeenAt, true)}</td>
                  <td className="py-2 text-right">
                    {d.revokedAt ? <Badge tone="neutral">Révoqué</Badge> : <RevokeDeviceButton deviceId={d.id} name={d.name} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-[11px] text-gray-400">
          Un poste révoqué ne peut plus récupérer les accès à la base. Pour lui couper aussi les accès déjà enregistrés,
          changez le mot de passe de la base chez l&apos;hébergeur puis dans « Accès à la base » ci-dessous : les autres postes
          récupéreront le nouveau automatiquement.
        </p>
      </div>
    </Card>
  )
}
