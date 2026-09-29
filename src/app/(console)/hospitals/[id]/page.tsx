import { notFound } from 'next/navigation'
import { CheckCircle2, Circle } from 'lucide-react'
import { prisma } from '@/lib/db'
import { requireAccount } from '@/lib/auth'
import { readOverview } from '@/lib/hospital-db'
import { MODULE_GROUPS } from '@/lib/modules'
import { Badge, Card, PageTitle, Stat, formatDate, formatFcfa } from '@/components/ui'
import { HospitalForm } from '../HospitalForm'
import { MobileStatusSelect } from './MobileStatusSelect'
import { RefreshButton } from './RefreshButton'

export default async function HospitalPage({ params }: PageProps<'/hospitals/[id]'>) {
  const account = await requireAccount()
  const { id } = await params
  const hospital = await prisma.hospital.findUnique({ where: { id: decodeURIComponent(id) } })
  if (!hospital) notFound()
  const o = await readOverview(hospital)
  const enabled = new Set(o.enabledModules)

  return (
    <>
      <PageTitle
        title={hospital.name}
        subtitle={`Identifiant : ${hospital.id} · client depuis le ${formatDate(hospital.installedAt)}`}
        actions={<RefreshButton hospitalId={hospital.id} />}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {o.reachable ? <Badge tone="success">Base joignable</Badge> : <Badge tone="danger">Base injoignable — {o.error}</Badge>}
        <span className="text-xs text-gray-400">Lu le {formatDate(o.checkedAt, true)}</span>
        {o.lastMigration && (
          <span className="text-xs text-gray-400">· Version de la base : {formatDate(o.lastMigration.appliedAt)}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Patients" value={o.patients?.toLocaleString('fr-FR') ?? '—'} />
        <Stat label="Utilisateurs actifs" value={o.activeUsers ?? '—'} />
        <Stat label="Consultations ce mois" value={o.consultationsThisMonth ?? '—'} />
        <Stat label="Encaissé en caisse ce mois" value={o.cashThisMonth === null ? '—' : formatFcfa(o.cashThisMonth)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Modules installés</h2>
          {!o.reachable ? (
            <p className="text-sm text-gray-400">Base injoignable : modules inconnus.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {MODULE_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">{group.label}</p>
                  <ul className="space-y-1">
                    {group.modules.map((m) => (
                      <li key={m.id} className={`flex items-center gap-2 text-sm ${enabled.has(m.id) ? 'text-gray-800' : 'text-gray-400'}`}>
                        {enabled.has(m.id) ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4" />}
                        {m.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Version mobile</h2>
            <MobileStatusSelect hospitalId={hospital.id} value={hospital.mobileStatus} />
          </Card>
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Établissement</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-gray-400">Nom enregistré dans l&apos;application</dt>
                <dd className="text-gray-800">{o.company?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Adresse</dt>
                <dd className="text-gray-800">{o.company?.address ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Téléphone</dt>
                <dd className="text-gray-800">{o.company?.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Dernière activité</dt>
                <dd className="text-gray-800">{formatDate(o.lastActivityAt, true)}</dd>
              </div>
            </dl>
            {hospital.notes && <p className="mt-3 rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600">{hospital.notes}</p>}
          </Card>
          <Card>
            <h2 className="mb-1 text-sm font-semibold text-gray-900">Abonnement</h2>
            <p className="text-sm text-gray-400">Disponible à l&apos;étape abonnements.</p>
          </Card>
        </div>
      </div>

      {account.role === 'ADMIN' && (
        <Card className="mt-6 max-w-2xl">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Accès à la base (admin)</h2>
          <p className="mb-4 text-xs text-gray-500">Le mot de passe est enregistré chiffré et n&apos;est jamais réaffiché.</p>
          <HospitalForm
            hospital={{
              id: hospital.id,
              name: hospital.name,
              dbHost: hospital.dbHost,
              dbPort: hospital.dbPort,
              dbName: hospital.dbName,
              dbUser: hospital.dbUser,
              dbSsl: hospital.dbSsl,
              notes: hospital.notes
            }}
          />
        </Card>
      )}
    </>
  )
}
