import { authenticateHospital, unauthorized } from '@/lib/hospital-auth'
import { FREE_MODULES, getPriceItems, itemModules, readHospitalSubscription } from '@/lib/subscription'

/** Grille et abonnement en cours — écran Abonnement de l'application. */
export async function GET(request: Request) {
  const hospital = await authenticateHospital(request, '')
  if (!hospital) return unauthorized()
  const [catalog, current] = await Promise.all([getPriceItems(), readHospitalSubscription(hospital).catch(() => null)])
  return Response.json({
    ok: true,
    catalog: catalog
      .filter((i) => i.active)
      .map((i) => ({
        key: i.key,
        offer: i.offer,
        label: i.label,
        price: i.price,
        modules: itemModules(i),
        mandatory: i.mandatory,
        comingSoon: i.comingSoon
      })),
    freeModules: FREE_MODULES,
    current: current?.valid ? current.payload : null
  })
}
