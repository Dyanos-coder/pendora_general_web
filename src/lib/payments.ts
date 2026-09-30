import 'server-only'
import type { Payment } from '@/generated/prisma/client'
import { prisma } from './db'
import { getMoneyFusionStatus } from './moneyfusion'
import {
  addMonthsTo28,
  freshEndDate,
  isActive,
  readHospitalSubscription,
  writeHospitalSubscription,
  type SubscriptionPayload
} from './subscription'

// Cycle de vie d'un paiement d'abonnement : EN_ATTENTE → PAYE (confirmé par MoneyFusion ou saisi
// par un admin) → APPLIQUE (abonnement signé écrit dans la base de l'hôpital). Chaque étape est
// idempotente : une notification répétée ou deux traitements simultanés n'appliquent jamais un
// paiement deux fois.

async function appendEvent(paymentId: string, event: Record<string, unknown>): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { events: true } })
  const events = payment?.events ? (JSON.parse(payment.events) as unknown[]) : []
  events.push({ at: new Date().toISOString(), ...event })
  await prisma.payment.update({ where: { id: paymentId }, data: { events: JSON.stringify(events.slice(-30)) } })
}

/** Écrit l'abonnement payé dans la base de l'hôpital. Sans effet si déjà appliqué. */
export async function applyPayment(paymentId: string): Promise<Payment> {
  // Réservation atomique : un seul traitement passe de PAYE à APPLIQUE.
  const claimed = await prisma.payment.updateMany({ where: { id: paymentId, status: 'PAYE' }, data: { status: 'APPLIQUE', appliedAt: new Date() } })
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { hospital: true } })
  if (claimed.count === 0) return payment

  try {
    const current = await readHospitalSubscription(payment.hospital)
    const currentPayload = current?.valid ? current.payload : null
    const active = isActive(currentPayload)
    const newEndDate =
      payment.months === 0
        ? active
          ? currentPayload!.endDate
          : (payment.newEndDate ?? freshEndDate(1))
        : active
          ? addMonthsTo28(currentPayload!.endDate, payment.months)
          : freshEndDate(payment.months)

    const payload: SubscriptionPayload = {
      v: 1,
      hospitalId: payment.hospitalId,
      modules: JSON.parse(payment.modules) as string[],
      items: JSON.parse(payment.items) as string[],
      endDate: newEndDate,
      issuedAt: new Date().toISOString(),
      paymentId: payment.id
    }
    await writeHospitalSubscription(payment.hospital, payload)
    const applied = await prisma.payment.update({
      where: { id: paymentId },
      data: { newEndDate, previousEndDate: currentPayload?.endDate ?? null, lastError: null }
    })
    await appendEvent(paymentId, { type: 'applied', endDate: newEndDate })
    return applied
  } catch (error) {
    // Base de l'hôpital injoignable… : le paiement redevient « payé, à appliquer » (nouvel essai
    // automatique à la prochaine consultation, ou bouton « Appliquer maintenant » de l'admin).
    const message = error instanceof Error ? error.message : String(error)
    await prisma.payment.update({ where: { id: paymentId }, data: { status: 'PAYE', appliedAt: null, lastError: message } })
    await appendEvent(paymentId, { type: 'apply_failed', error: message })
    return prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })
  }
}

/** Relit l'état réel du paiement chez MoneyFusion et fait avancer son cycle de vie. */
export async function syncMoneyFusionPayment(paymentId: string, source: string): Promise<Payment> {
  let payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })
  if (payment.method !== 'MONEYFUSION' || !payment.moneyfusionToken) return payment
  if (payment.status === 'PAYE') return applyPayment(paymentId)
  if (payment.status !== 'EN_ATTENTE') return payment

  const status = await getMoneyFusionStatus(payment.moneyfusionToken)
  if (!status) return payment
  await appendEvent(paymentId, { type: 'status', source, statut: status.statut, montant: status.Montant, frais: status.frais })

  if (status.statut === 'paid') {
    const received = Number(status.Montant ?? 0)
    const fees = Number(status.frais ?? 0)
    // Selon MoneyFusion, « Montant » peut être net ou brut des frais : on accepte l'un ou l'autre.
    const amountOk = received >= payment.amount || received + fees >= payment.amount
    const moved = await prisma.payment.updateMany({
      where: { id: paymentId, status: 'EN_ATTENTE' },
      data: {
        status: 'PAYE',
        paidAt: new Date(),
        transactionNumber: status.numeroTransaction ?? null,
        paymentMeans: status.moyen ?? null,
        lastError: amountOk ? null : `Montant reçu (${received} F + ${fees} F de frais) inférieur au montant attendu (${payment.amount} F) — à vérifier avant application.`
      }
    })
    payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })
    if (moved.count === 1 && amountOk) return applyPayment(paymentId)
    return payment
  }
  if (status.statut === 'failure' || status.statut === 'no paid') {
    await prisma.payment.updateMany({
      where: { id: paymentId, status: 'EN_ATTENTE' },
      data: { status: status.statut === 'failure' ? 'ECHEC' : 'ANNULE' }
    })
  }
  return prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })
}
