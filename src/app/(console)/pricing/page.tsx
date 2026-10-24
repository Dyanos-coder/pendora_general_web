import { requireAccount } from '@/lib/auth'
import { getDiscountTiers, getPlans, itemModules, itemUsage, planHighlights } from '@/lib/subscription'
import { FREE_MODULES, PLAN_COLORS, type PlanColor } from '@/lib/offers'
import { PageTitle } from '@/components/ui'
import { PlansEditor, type EditorPlan } from './PlansEditor'
import { DiscountTiersEditor } from './DiscountTiersEditor'

export const metadata = { title: 'Plans & tarifs — Pandora' }

const FREE_LABEL: Record<string, string> = {
  dashboard: 'Tableau de bord',
  settings: 'Paramètres',
  quality: 'Qualité',
  'risk-management': 'Gestion des risques',
  'audit-compliance': 'Audit & conformité'
}

/** Prix le plus fréquent de la grille, pour l'aperçu des réductions (10 000 F avec la grille d'origine). */
function typicalPrice(prices: number[]): number {
  const counts = new Map<number, number>()
  for (const p of prices.filter((p) => p > 0)) counts.set(p, (counts.get(p) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 10000
}

export default async function PricingPage() {
  await requireAccount('ADMIN')
  const [plans, usage, discountTiers] = await Promise.all([getPlans(), itemUsage(), getDiscountTiers()])
  const editorPlans: EditorPlan[] = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    color: (PLAN_COLORS as readonly string[]).includes(plan.color) ? (plan.color as PlanColor) : 'emerald',
    highlights: planHighlights(plan),
    comingSoon: plan.comingSoon,
    active: plan.active,
    items: plan.items.map((item) => ({
      key: item.key,
      label: item.label,
      price: item.price,
      modules: itemModules(item),
      mandatory: item.mandatory,
      active: item.active,
      current: usage[item.key]?.current ?? 0,
      purchases: usage[item.key]?.purchases ?? 0
    }))
  }))

  return (
    <>
      <PageTitle
        title="Plans & tarifs"
        subtitle="Plans affichés sur la page d'accueil et dans l'écran Abonnement de l'application, avec leurs éléments, prix mensuels (FCFA) et modules. Les changements s'appliquent aux prochains paiements ; ce qui est déjà payé reste acquis."
      />
      <DiscountTiersEditor tiers={discountTiers} unitPrice={typicalPrice(plans.flatMap((p) => p.items.filter((i) => i.active).map((i) => i.price)))} />
      <PlansEditor plans={editorPlans} />
      <p className="mt-6 text-xs text-gray-400">
        Toujours inclus gratuitement : {FREE_MODULES.map((m) => FREE_LABEL[m] ?? m).join(', ')}. « En cours » : établissements dont le
        dernier paiement enregistré sur le site, encore valable, contient l’élément (le premier mois offert n’est pas compté).
      </p>
    </>
  )
}
