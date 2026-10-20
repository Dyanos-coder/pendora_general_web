import { requireAccount } from '@/lib/auth'
import { getPlans, itemModules, itemUsage, planHighlights } from '@/lib/subscription'
import { FREE_MODULES, PLAN_COLORS, type PlanColor } from '@/lib/offers'
import { PageTitle } from '@/components/ui'
import { PlansEditor, type EditorPlan } from './PlansEditor'

export const metadata = { title: 'Plans & tarifs — Pandora' }

const FREE_LABEL: Record<string, string> = {
  dashboard: 'Tableau de bord',
  settings: 'Paramètres',
  quality: 'Qualité',
  'risk-management': 'Gestion des risques',
  'audit-compliance': 'Audit & conformité'
}

export default async function PricingPage() {
  await requireAccount('ADMIN')
  const [plans, usage] = await Promise.all([getPlans(), itemUsage()])
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
      <PlansEditor plans={editorPlans} />
      <p className="mt-6 text-xs text-gray-400">
        Toujours inclus gratuitement : {FREE_MODULES.map((m) => FREE_LABEL[m] ?? m).join(', ')}. « En cours » : établissements dont le
        dernier paiement enregistré sur le site, encore valable, contient l’élément (le premier mois offert n’est pas compté).
      </p>
    </>
  )
}
