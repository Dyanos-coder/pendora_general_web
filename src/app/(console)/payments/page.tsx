import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireAccount } from '@/lib/auth'
import { PAYMENT_STATUS, formatYmd } from '@/lib/subscription-status'
import { Badge, Card, PageTitle, Stat, formatDate, formatFcfa } from '@/components/ui'
import { RetryPaymentButton } from '../hospitals/[id]/SubscriptionControls'

export const metadata = { title: 'Paiements — Pandora' }

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'todo', label: 'À traiter' },
  { key: 'APPLIQUE', label: 'Appliqués' }
] as const

export default async function PaymentsPage({ searchParams }: PageProps<'/payments'>) {
  await requireAccount('ADMIN')
  const { filter = 'all' } = (await searchParams) as { filter?: string }
  const where =
    filter === 'todo' ? { status: { in: ['EN_ATTENTE', 'PAYE'] as ('EN_ATTENTE' | 'PAYE')[] } } : filter === 'APPLIQUE' ? { status: 'APPLIQUE' as const } : {}
  const [payments, monthTotal, todo] = await Promise.all([
    prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200, include: { hospital: { select: { name: true } } } }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'APPLIQUE', paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }
    }),
    prisma.payment.count({ where: { status: { in: ['EN_ATTENTE', 'PAYE'] } } })
  ])

  return (
    <>
      <PageTitle title="Paiements" subtitle="Paiements MoneyFusion et paiements manuels des abonnements." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Recettes du mois" value={formatFcfa(monthTotal._sum.amount ?? 0)} hint="paiements appliqués" tone="gold" />
        <Stat label="À traiter" value={todo} tone={todo ? 'warning' : 'success'} hint="en attente ou payés non appliqués" />
      </div>

      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'all' ? '/payments' : `/payments?filter=${f.key}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f.key ? 'bg-accent-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {payments.length === 0 ? (
        <Card className="py-12 text-center text-sm text-gray-500">Aucun paiement.</Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Hôpital</th>
                <th className="px-5 py-3 font-medium">Mode</th>
                <th className="px-5 py-3 font-medium">Durée</th>
                <th className="px-5 py-3 font-medium">Montant</th>
                <th className="px-5 py-3 font-medium">Nouvelle échéance</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-500">{formatDate(p.createdAt, true)}</td>
                  <td className="px-5 py-3">
                    <Link href={`/hospitals/${encodeURIComponent(p.hospitalId)}`} className="font-medium text-gray-900 hover:text-accent-700">
                      {p.hospital.name}
                    </Link>
                    {p.payerName && <p className="text-xs text-gray-400">{p.payerName}{p.payerPhone ? ` · ${p.payerPhone}` : ''}</p>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {p.method === 'MANUEL' ? 'Manuel' : 'MoneyFusion'}
                    {p.note && <p className="text-xs text-gray-400">{p.note}</p>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{p.months === 0 ? 'Ajout de modules' : `${p.months} mois`}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{formatFcfa(p.amount)}</td>
                  <td className="px-5 py-3 text-gray-600">{formatYmd(p.newEndDate)}</td>
                  <td className="px-5 py-3">
                    <Badge tone={PAYMENT_STATUS[p.status].tone}>{PAYMENT_STATUS[p.status].label}</Badge>
                    {p.lastError && <p className="mt-0.5 max-w-xs text-[11px] text-red-600">{p.lastError}</p>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {p.status === 'PAYE' && <RetryPaymentButton paymentId={p.id} label="Appliquer maintenant" />}
                    {p.status === 'EN_ATTENTE' && p.method === 'MONEYFUSION' && <RetryPaymentButton paymentId={p.id} label="Vérifier" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  )
}
