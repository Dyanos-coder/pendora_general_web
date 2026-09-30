import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { authenticateHospital, unauthorized } from '@/lib/hospital-auth'
import { createMoneyFusionPayment } from '@/lib/moneyfusion'
import { QuoteError, computeQuote, readHospitalSubscription } from '@/lib/subscription'

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
  const article: Record<string, number>[] = quote.items.map((i) => ({ [i.label]: i.price * quote.months }))
  if (quote.prorata.amount > 0) article.push({ [`Ajout en cours de période (${quote.prorata.days} j)`]: quote.prorata.amount })

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
