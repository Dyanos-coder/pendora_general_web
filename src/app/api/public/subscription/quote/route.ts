import { authenticateHospital, unauthorized } from '@/lib/hospital-auth'
import { QuoteError, computeQuote, readHospitalSubscription } from '@/lib/subscription'

/** Montant d'un abonnement (modules × durée + prorata), calculé par le site — l'application ne fait
 * qu'afficher ce devis. */
export async function POST(request: Request) {
  const body = await request.text()
  const hospital = await authenticateHospital(request, body)
  if (!hospital) return unauthorized()
  const { items, months } = JSON.parse(body || '{}') as { items?: string[]; months?: number }
  try {
    const current = await readHospitalSubscription(hospital)
    const quote = await computeQuote(items ?? [], Number(months ?? 1), current?.valid ? current.payload : null)
    return Response.json({ ok: true, quote })
  } catch (error) {
    if (error instanceof QuoteError) return Response.json({ ok: false, error: error.message }, { status: 400 })
    throw error
  }
}
