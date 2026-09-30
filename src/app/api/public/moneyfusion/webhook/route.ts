import { prisma } from '@/lib/db'
import { syncMoneyFusionPayment } from '@/lib/payments'

// Notifications MoneyFusion (payin.session.pending / completed / cancelled). Le contenu n'est
// JAMAIS cru sur parole : on retrouve le paiement par son `tokenPay` puis on relit son état
// réel chez MoneyFusion (syncMoneyFusionPayment). Les notifications répétées sont sans effet.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { tokenPay?: string; event?: string } | null
  const token = body?.tokenPay
  if (!token) return Response.json({ ok: true })

  const payment = await prisma.payment.findUnique({ where: { moneyfusionToken: token } })
  if (payment) {
    await syncMoneyFusionPayment(payment.id, `webhook:${body?.event ?? '?'}`).catch((error) =>
      console.error('[moneyfusion] traitement de la notification impossible', error)
    )
  }
  // Toujours 200 : MoneyFusion n'a pas à renvoyer une notification pour un paiement inconnu.
  return Response.json({ ok: true })
}
