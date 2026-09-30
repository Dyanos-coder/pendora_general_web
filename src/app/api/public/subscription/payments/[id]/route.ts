import { prisma } from '@/lib/db'
import { authenticateHospital, unauthorized } from '@/lib/hospital-auth'
import { syncMoneyFusionPayment } from '@/lib/payments'

/** État d'un paiement, interrogé par l'application pendant que l'utilisateur paie. Relit aussi
 * MoneyFusion (au cas où la notification webhook n'arriverait pas) et applique l'abonnement. */
export async function GET(request: Request, ctx: RouteContext<'/api/public/subscription/payments/[id]'>) {
  const hospital = await authenticateHospital(request, '')
  if (!hospital) return unauthorized()
  const { id } = await ctx.params
  let payment = await prisma.payment.findUnique({ where: { id } })
  if (!payment || payment.hospitalId !== hospital.id) return Response.json({ ok: false, error: 'Paiement introuvable.' }, { status: 404 })

  if (payment.status === 'EN_ATTENTE' || payment.status === 'PAYE') {
    payment = await syncMoneyFusionPayment(id, 'poll').catch(() => payment!)
  }
  return Response.json({
    ok: true,
    payment: { id: payment.id, status: payment.status, amount: payment.amount, newEndDate: payment.newEndDate, error: payment.lastError }
  })
}
