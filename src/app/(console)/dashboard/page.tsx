import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireAccount } from '@/lib/auth'
import { readOverviews } from '@/lib/hospital-db'
import { Badge, Card, MOBILE_STATUS, PageTitle, Stat, formatDate, formatFcfa } from '@/components/ui'

export const metadata = { title: 'Tableau de bord — Pandora' }

export default async function DashboardPage() {
  await requireAccount()
  const hospitals = await prisma.hospital.findMany({ orderBy: { name: 'asc' } })
  const overviews = await readOverviews(hospitals)

  const reachable = hospitals.filter((h) => overviews.get(h.id)?.reachable)
  const unreachable = hospitals.filter((h) => !overviews.get(h.id)?.reachable)
  const sum = (key: 'patients' | 'activeUsers' | 'cashThisMonth') =>
    reachable.reduce((total, h) => total + (overviews.get(h.id)?.[key] ?? 0), 0)
  const mobile = {
    INSTALLEE: hospitals.filter((h) => h.mobileStatus === 'INSTALLEE').length,
    SOUHAITEE: hospitals.filter((h) => h.mobileStatus === 'SOUHAITEE').length
  }
  const recentActivity = hospitals
    .map((h) => ({ hospital: h, at: overviews.get(h.id)?.lastActivityAt ?? null }))
    .filter((r) => r.at)
    .sort((a, b) => (b.at! > a.at! ? 1 : -1))
    .slice(0, 6)

  return (
    <>
      <PageTitle title="Tableau de bord" subtitle="Vue d'ensemble des hôpitaux Pandora Health." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Hôpitaux" value={hospitals.length} hint={`${reachable.length} joignable(s)`} />
        <Stat label="Bases injoignables" value={unreachable.length} tone={unreachable.length ? 'danger' : 'success'} />
        <Stat label="Version mobile" value={mobile.INSTALLEE} hint={`installée · ${mobile.SOUHAITEE} souhaitée(s)`} />
        <Stat label="Patients suivis" value={sum('patients').toLocaleString('fr-FR')} hint={`${sum('activeUsers')} utilisateurs actifs`} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Encaissé en caisse ce mois" value={formatFcfa(sum('cashThisMonth'))} hint="tous hôpitaux confondus" />
        <Stat label="Abonnements à jour" value="—" hint="disponible à l'étape abonnements" />
        <Stat label="Abonnements expirés" value="—" hint="disponible à l'étape abonnements" />
        <Stat label="Recettes d'abonnement du mois" value="—" hint="disponible à l'étape paiements" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Bases injoignables</h2>
          {unreachable.length === 0 ? (
            <p className="text-sm text-gray-400">Toutes les bases répondent.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {unreachable.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/hospitals/${encodeURIComponent(h.id)}`} className="font-medium text-gray-900 hover:text-accent-700">
                    {h.name}
                  </Link>
                  <span className="text-xs text-red-600">{overviews.get(h.id)?.error}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Dernière activité</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune activité enregistrée.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentActivity.map(({ hospital, at }) => (
                <li key={hospital.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/hospitals/${encodeURIComponent(hospital.id)}`} className="font-medium text-gray-900 hover:text-accent-700">
                    {hospital.name}
                  </Link>
                  <span className="flex items-center gap-2 text-xs text-gray-500">
                    <Badge tone={MOBILE_STATUS[hospital.mobileStatus].tone}>Mobile : {MOBILE_STATUS[hospital.mobileStatus].label}</Badge>
                    {formatDate(at, true)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
