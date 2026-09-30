import { prisma } from '@/lib/db'
import { authenticateHospital, unauthorized } from '@/lib/hospital-auth'

/** Historique des paiements de l'hôpital (écran Abonnement de l'application). */
export async function GET(request: Request) {
  const hospital = await authenticateHospital(request, '')
  if (!hospital) return unauthorized()
  const payments = await prisma.payment.findMany({
    where: { hospitalId: hospital.id, status: { in: ['PAYE', 'APPLIQUE', 'EN_ATTENTE'] } },
    orderBy: { createdAt: 'desc' },
    take: 24
  })
  return Response.json({
    ok: true,
    payments: payments.map((p) => ({
      id: p.id,
      status: p.status,
      method: p.method,
      amount: p.amount,
      months: p.months,
      newEndDate: p.newEndDate,
      createdAt: p.createdAt.toISOString()
    }))
  })
}
