import { prisma } from '@/lib/db'
import { requireAccount } from '@/lib/auth'
import { Badge, Card, PageTitle, formatDate } from '@/components/ui'
import { HandledButton } from './HandledButton'

export const metadata = { title: 'Demandes de contact — Pandora' }

export default async function LeadsPage() {
  await requireAccount()
  const requests = await prisma.contactRequest.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 300 })
  const pending = requests.filter((r) => r.status === 'NOUVELLE').length

  return (
    <>
      <PageTitle
        title="Demandes de contact"
        subtitle={`Demandes de démonstration envoyées depuis la page d'accueil — ${pending} à traiter.`}
      />
      {requests.length === 0 ? (
        <Card className="py-12 text-center text-sm text-gray-500">Aucune demande pour le moment.</Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className={r.status === 'TRAITEE' ? 'opacity-60' : ''}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{r.establishment}</p>
                    <Badge tone={r.status === 'NOUVELLE' ? 'warning' : 'success'}>{r.status === 'NOUVELLE' ? 'À traiter' : 'Traitée'}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {r.name} · <a href={`tel:${r.phone}`} className="font-medium text-accent-700 hover:underline">{r.phone}</a>
                    {r.email && (
                      <>
                        {' · '}
                        <a href={`mailto:${r.email}`} className="text-accent-700 hover:underline">
                          {r.email}
                        </a>
                      </>
                    )}
                    {r.city && ` · ${r.city}`}
                  </p>
                  {r.message && <p className="mt-2 whitespace-pre-line rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{r.message}</p>}
                  <p className="mt-2 text-xs text-gray-400">
                    Reçue le {formatDate(r.createdAt, true)}
                    {r.handledAt && ` · traitée le ${formatDate(r.handledAt, true)}`}
                  </p>
                </div>
                <HandledButton id={r.id} handled={r.status === 'TRAITEE'} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
