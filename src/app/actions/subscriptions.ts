'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAccount } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { forgetOverview } from '@/lib/hospital-db'
import { applyPayment, syncMoneyFusionPayment } from '@/lib/payments'
import { QuoteError, computeQuote, initialSubscription, readHospitalSubscription, writeHospitalSubscription } from '@/lib/subscription'
import type { FormState } from './form-state'

// Actions admin sur les abonnements (console). Les montants et paiements ne concernent que les
// admins ; les prospecteurs voient seulement le statut et l'échéance.

function refresh(hospitalId: string): void {
  forgetOverview(hospitalId)
  revalidatePath(`/hospitals/${encodeURIComponent(hospitalId)}`)
  revalidatePath('/hospitals')
  revalidatePath('/dashboard')
  revalidatePath('/payments')
}

/** Premier mois inclus (§9-B) : active l'abonnement d'un hôpital qui n'en a pas encore. */
export async function activateFirstMonth(hospitalId: string): Promise<FormState> {
  const admin = await requireAccount('ADMIN')
  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } })
  if (!hospital) return { error: 'Hôpital introuvable.' }
  try {
    if (await readHospitalSubscription(hospital)) return { error: 'Cet hôpital a déjà un abonnement.' }
    const payload = await initialSubscription(hospital)
    await writeHospitalSubscription(hospital, payload)
    await logAudit(admin.id, 'subscription.first_month', hospitalId, payload.endDate)
    refresh(hospitalId)
    return { success: `Premier mois activé jusqu'au ${payload.endDate.split('-').reverse().join('/')}.` }
  } catch (error) {
    return { error: `Impossible d'écrire dans la base de l'hôpital : ${error instanceof Error ? error.message : error}` }
  }
}

/** Paiement reçu hors MoneyFusion (virement, espèces…), saisi par un admin (§9-H). */
export async function recordManualPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAccount('ADMIN')
  const hospitalId = String(formData.get('hospitalId') ?? '')
  const items = formData.getAll('items').map(String)
  const months = Number(formData.get('months') ?? 1)
  const amount = Number(String(formData.get('amount') ?? '').replace(/\s/g, ''))
  const note = String(formData.get('note') ?? '').trim()
  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } })
  if (!hospital) return { error: 'Hôpital introuvable.' }
  if (!Number.isInteger(amount) || amount < 0) return { error: 'Montant reçu invalide.' }
  if (!note) return { error: 'Indiquez la référence ou le mode de paiement (note).' }

  try {
    const current = await readHospitalSubscription(hospital)
    const quote = await computeQuote(items, months, current?.valid ? current.payload : null)
    const payment = await prisma.payment.create({
      data: {
        id: randomUUID(),
        hospitalId,
        method: 'MANUEL',
        status: 'PAYE',
        items: JSON.stringify(quote.items.map((i) => i.key)),
        modules: JSON.stringify(quote.modules),
        months: quote.months,
        amount,
        prorataAmount: quote.prorata.amount,
        previousEndDate: quote.previousEndDate,
        newEndDate: quote.newEndDate,
        note,
        recordedById: admin.id,
        paidAt: new Date()
      }
    })
    const applied = await applyPayment(payment.id)
    await logAudit(admin.id, 'payment.manual', hospitalId, `${amount} F — ${note}`)
    refresh(hospitalId)
    return applied.status === 'APPLIQUE'
      ? { success: `Paiement enregistré : abonnement prolongé jusqu'au ${applied.newEndDate?.split('-').reverse().join('/')}.` }
      : { error: `Paiement enregistré mais non appliqué : ${applied.lastError}` }
  } catch (error) {
    if (error instanceof QuoteError) return { error: error.message }
    throw error
  }
}

/** « Appliquer maintenant » (paiement payé mais base de l'hôpital injoignable) ou « Vérifier »
 * (paiement MoneyFusion en attente). */
export async function retryPayment(paymentId: string): Promise<void> {
  const admin = await requireAccount('ADMIN')
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment) return
  if (payment.status === 'PAYE') await applyPayment(paymentId)
  else if (payment.status === 'EN_ATTENTE') await syncMoneyFusionPayment(paymentId, 'admin')
  await logAudit(admin.id, 'payment.retry', paymentId)
  refresh(payment.hospitalId)
}

/** Grille tarifaire (page Tarifs) : prix et disponibilité d'un élément. */
export async function updatePriceItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAccount('ADMIN')
  const key = String(formData.get('key') ?? '')
  const price = Number(String(formData.get('price') ?? '').replace(/\s/g, ''))
  if (!Number.isInteger(price) || price < 0) return { error: 'Prix invalide.' }
  const item = await prisma.priceItem.findUnique({ where: { key } })
  if (!item) return { error: 'Élément introuvable.' }
  // Un élément obligatoire (Soins) reste toujours proposé.
  const active = item.mandatory || formData.get('active') === 'on'
  await prisma.priceItem.update({ where: { key }, data: { price, active } })
  await logAudit(admin.id, 'price.update', key, `${price} F${active ? '' : ' (désactivé)'}`)
  revalidatePath('/pricing')
  return { success: 'Enregistré.' }
}
