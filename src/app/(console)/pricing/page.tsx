import { requireAccount } from '@/lib/auth'
import { getPriceItems } from '@/lib/subscription'
import { FREE_MODULES } from '@/lib/offers'
import { Card, PageTitle } from '@/components/ui'
import { PriceItemRow } from './PriceItemRow'

export const metadata = { title: 'Tarifs — Pandora' }

export default async function PricingPage() {
  await requireAccount('ADMIN')
  const items = await getPriceItems()
  const offers = [...new Set(items.map((i) => i.offer))]

  return (
    <>
      <PageTitle
        title="Tarifs"
        subtitle="Prix mensuels (FCFA) appliqués aux nouveaux paiements. Un élément désactivé n'est plus proposé à l'achat."
      />
      <div className="space-y-6">
        {offers.map((offer) => (
          <Card key={offer} className="p-0">
            <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-900">{offer}</h2>
            <div className="divide-y divide-gray-100">
              {items
                .filter((i) => i.offer === offer)
                .map((i) => (
                  <PriceItemRow key={i.key} item={{ key: i.key, label: i.label, price: i.price, active: i.active, mandatory: i.mandatory, comingSoon: i.comingSoon }} />
                ))}
            </div>
          </Card>
        ))}
        <p className="text-xs text-gray-400">Toujours inclus gratuitement : {FREE_MODULES.join(', ')}.</p>
      </div>
    </>
  )
}
