import Link from 'next/link'
import { Plus } from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireAccount } from '@/lib/auth'
import { readOverviews } from '@/lib/hospital-db'
import { ALL_MODULE_IDS } from '@/lib/modules'
import { Badge, Card, MOBILE_STATUS, PageTitle, buttonPrimary, formatDate } from '@/components/ui'

export const metadata = { title: 'Hôpitaux — Pandora' }

export default async function HospitalsPage() {
  const account = await requireAccount()
  const hospitals = await prisma.hospital.findMany({ orderBy: { name: 'asc' } })
  const overviews = await readOverviews(hospitals)

  return (
    <>
      <PageTitle
        title="Hôpitaux"
        subtitle={`${hospitals.length} ${hospitals.length > 1 ? 'hôpitaux clients' : 'hôpital client'}.`}
        actions={
          account.role === 'ADMIN' ? (
            <Link href="/hospitals/new" className={buttonPrimary}>
              <Plus className="h-4 w-4" />
              Ajouter un hôpital
            </Link>
          ) : undefined
        }
      />

      {hospitals.length === 0 ? (
        <Card className="py-12 text-center text-sm text-gray-500">
          Aucun hôpital enregistré.{account.role === 'ADMIN' && ' Ajoutez le premier avec « Ajouter un hôpital ».'}
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-medium">Hôpital</th>
                <th className="px-5 py-3 font-medium">Base</th>
                <th className="px-5 py-3 font-medium">Modules</th>
                <th className="px-5 py-3 font-medium">Patients</th>
                <th className="px-5 py-3 font-medium">Version mobile</th>
                <th className="px-5 py-3 font-medium">Dernière activité</th>
              </tr>
            </thead>
            <tbody>
              {hospitals.map((h) => {
                const o = overviews.get(h.id)
                return (
                  <tr key={h.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link href={`/hospitals/${encodeURIComponent(h.id)}`} className="font-medium text-gray-900 hover:text-accent-700">
                        {h.name}
                      </Link>
                      <p className="text-xs text-gray-400">{h.id}</p>
                    </td>
                    <td className="px-5 py-3">
                      {o?.reachable ? <Badge tone="success">Joignable</Badge> : <Badge tone="danger">Injoignable</Badge>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {o?.reachable ? `${o.enabledModules.length} / ${ALL_MODULE_IDS.length}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{o?.patients?.toLocaleString('fr-FR') ?? '—'}</td>
                    <td className="px-5 py-3">
                      <Badge tone={MOBILE_STATUS[h.mobileStatus].tone}>{MOBILE_STATUS[h.mobileStatus].label}</Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(o?.lastActivityAt, true)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  )
}
