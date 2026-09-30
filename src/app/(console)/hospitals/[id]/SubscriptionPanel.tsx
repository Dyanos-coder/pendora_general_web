import type { Hospital } from '@/generated/prisma/client'
import { prisma } from '@/lib/db'
import type { HospitalOverview } from '@/lib/hospital-db'
import { getPriceItems } from '@/lib/subscription'
import { PAYMENT_STATUS, formatYmd, subscriptionStatus } from '@/lib/subscription-status'
import { Badge, Card, formatDate, formatFcfa } from '@/components/ui'
import { ActivateFirstMonthButton, ManualPaymentForm, RetryPaymentButton } from './SubscriptionControls'

/** Abonnement d'un hôpital : statut et échéance pour tous ; montants, paiements et actions pour
 * les admins uniquement (les prospecteurs n'ont pas à voir les montants). */
export async function SubscriptionPanel({ hospital, overview, isAdmin }: { hospital: Hospital; overview: HospitalOverview; isAdmin: boolean }) {
  const sub = overview.subscription
  const status = subscriptionStatus(sub)
  const catalog = await getPriceItems()
  const labelOf = new Map(catalog.map((i) => [i.key, i.label]))
  const payments = isAdmin ? await prisma.payment.findMany({ where: { hospitalId: hospital.id }, orderBy: { createdAt: 'desc' }, take: 20 }) : []

  return (
    <Card className="mt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900">Abonnement</h2>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      {!overview.reachable ? (
        <p className="text-sm text-gray-400">Base injoignable : abonnement inconnu.</p>
      ) : !sub ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Aucun abonnement actif pour cet hôpital.</p>
          {isAdmin && <ActivateFirstMonthButton hospitalId={hospital.id} />}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-gray-400">Échéance</p>
            <p className="text-lg font-semibold text-gray-900">{formatYmd(sub.endDate)}</p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            {sub.periods.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune période en cours.</p>
            ) : (
              sub.periods.map((period, index) => (
                <div key={period.until}>
                  <p className="text-xs text-gray-400">
                    {index === 0 ? 'En cours' : 'Ensuite'}, jusqu&apos;au {formatYmd(period.until)}
                  </p>
                  <p className="text-sm text-gray-700">{period.items.map((k) => labelOf.get(k) ?? k).join(' · ') || '—'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isAdmin && overview.reachable && (
        <>
          <div className="mt-6 border-t border-gray-100 pt-5">
            <ManualPaymentForm
              key={sub ? 'subscribed' : 'none'}
              hospitalId={hospital.id}
              catalog={catalog.filter((i) => i.active && !i.comingSoon).map((i) => ({ key: i.key, offer: i.offer, label: i.label, price: i.price, mandatory: i.mandatory }))}
              currentItems={sub?.periods.at(-1)?.items ?? []}
            />
          </div>
          {payments.length > 0 && (
            <div className="mt-6 overflow-x-auto border-t border-gray-100 pt-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Paiements</h3>
              <table className="w-full text-left text-sm">
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 text-gray-500">{formatDate(p.createdAt, true)}</td>
                      <td className="py-2 text-gray-700">{p.method === 'MANUEL' ? 'Manuel' : 'MoneyFusion'}</td>
                      <td className="py-2 text-gray-700">{p.months === 0 ? 'Ajout' : `${p.months} mois`}</td>
                      <td className="py-2 font-medium text-gray-900">{formatFcfa(p.amount)}</td>
                      <td className="py-2">
                        <Badge tone={PAYMENT_STATUS[p.status].tone}>{PAYMENT_STATUS[p.status].label}</Badge>
                        {p.lastError && <p className="mt-0.5 text-[11px] text-red-600">{p.lastError}</p>}
                      </td>
                      <td className="py-2 text-right">
                        {p.status === 'PAYE' && <RetryPaymentButton paymentId={p.id} label="Appliquer maintenant" />}
                        {p.status === 'EN_ATTENTE' && <RetryPaymentButton paymentId={p.id} label="Vérifier" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
