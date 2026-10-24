import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { authenticateHospital, unauthorized } from '@/lib/hospital-auth'
import { createMoneyFusionPayment } from '@/lib/moneyfusion'
import { QuoteError, computeQuote, readHospitalSubscription } from '@/lib/subscription'

/** Lignes du paiement MoneyFusion : avec une réduction (Plan-Reductions-Abonnement.md), chaque ligne
 * porte son montant réduit (pourcentage de son élément) et l'arrondi va sur la dernière, pour que la
 * somme égale le total. */
function discountedLines(lines: [string, number, number][], total: number): Record<string, number>[] {
  const reduced = lines.map(
    ([label, amount, percent]) =>
      [percent > 0 ? `${label} (−${percent} %)` : label, percent > 0 ? Math.floor((amount * (100 - percent)) / 100) : amount] as const
  )
  const gap = total - reduced.reduce((sum, [, amount]) => sum + amount, 0)
  return reduced.map(([label, amount], index) => ({ [label]: index === reduced.length - 1 ? amount + gap : amount }))
}

/** Lance un paiement MoneyFusion pour l'abonnement choisi. Le montant est TOUJOURS recalculé ici. */
export async function POST(request: Request) {
  const body = await request.text()
  const hospital = await authenticateHospital(request, body)
  if (!hospital) return unauthorized()
  const input = JSON.parse(body || '{}') as { items?: string[]; months?: number; phone?: string; payerName?: string }
  const phone = String(input.phone ?? '').replace(/[^\d+]/g, '')
  const payerName = String(input.payerName ?? '').trim()
  if (phone.length < 8) return Response.json({ ok: false, error: 'Numéro de téléphone invalide.' }, { status: 400 })
  if (!payerName) return Response.json({ ok: false, error: 'Nom du payeur requis.' }, { status: 400 })

  let quote
  try {
    const current = await readHospitalSubscription(hospital)
    quote = await computeQuote(input.items ?? [], Number(input.months ?? 1), current?.valid ? current.payload : null)
  } catch (error) {
    if (error instanceof QuoteError) return Response.json({ ok: false, error: error.message }, { status: 400 })
    throw error
  }
  if (quote.total <= 0) return Response.json({ ok: false, error: 'Montant nul : rien à payer.' }, { status: 400 })

  const siteUrl = (process.env.SITE_URL ?? '').replace(/\/+$/, '')
  const paymentId = randomUUID()
  const percentOf = quote.discount.percentByKey
  const lines: [string, number, number][] = quote.items.map((i) => [i.label, i.price * quote.months, percentOf[i.key] ?? 0])
  if (quote.prorata.amount > 0) {
    // Prorata réduit au pourcentage moyen de la réduction (l'écart d'arrondi revient à la dernière ligne).
    lines.push([`Ajout en cours de période (${quote.prorata.days} j)`, quote.prorata.amount, quote.discount.effectivePercent])
  }
  const article = discountedLines(lines, quote.total)

  try {
    const created = await createMoneyFusionPayment({
      totalPrice: quote.total,
      article,
      numeroSend: phone,
      nomclient: payerName,
      personal_Info: [{ hospitalId: hospital.id, paymentId }],
      return_url: `${siteUrl}/callback?payment=${paymentId}`,
      webhook_url: `${siteUrl}/api/public/moneyfusion/webhook`
    })
    await prisma.payment.create({
      data: {
        id: paymentId,
        hospitalId: hospital.id,
        method: 'MONEYFUSION',
        items: JSON.stringify(quote.items.map((i) => i.key)),
        modules: JSON.stringify(quote.modules),
        months: quote.months,
        amount: quote.total,
        prorataAmount: quote.prorata.amount,
        discountPercent: quote.discount.effectivePercent,
        discountAmount: quote.discount.amount,
        previousEndDate: quote.previousEndDate,
        newEndDate: quote.newEndDate,
        moneyfusionToken: created.token,
        moneyfusionUrl: created.url,
        payerName,
        payerPhone: phone
      }
    })
    return Response.json({ ok: true, paymentId, url: created.url, total: quote.total })
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Paiement impossible.' }, { status: 502 })
  }
}
