import Image from 'next/image'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { prisma } from '@/lib/db'
import { syncMoneyFusionPayment } from '@/lib/payments'

export const metadata = { title: 'Paiement — Pandora Health' }

function formatDay(ymd: string | null): string {
  if (!ymd) return '—'
  const [y, m, d] = ymd.split('-')
  return `${d}/${m}/${y}`
}

/** Retour après paiement MoneyFusion (return_url). L'état affiché est relu chez MoneyFusion. */
export default async function CallbackPage({ searchParams }: PageProps<'/callback'>) {
  const { payment: paymentId } = await searchParams
  let payment = typeof paymentId === 'string' ? await prisma.payment.findUnique({ where: { id: paymentId } }) : null
  if (payment && (payment.status === 'EN_ATTENTE' || payment.status === 'PAYE')) {
    payment = await syncMoneyFusionPayment(payment.id, 'callback').catch(() => payment)
  }

  const state = !payment
    ? 'unknown'
    : payment.status === 'APPLIQUE'
      ? 'success'
      : payment.status === 'ECHEC' || payment.status === 'ANNULE'
        ? 'failed'
        : 'pending'

  const content = {
    success: {
      icon: <CheckCircle2 className="h-12 w-12 text-teal-500" />,
      title: 'Paiement reçu',
      text: `Votre abonnement est prolongé jusqu'au ${formatDay(payment?.newEndDate ?? null)}. Vous pouvez retourner dans l'application Pandora Health : il s'y met à jour automatiquement.`
    },
    failed: {
      icon: <XCircle className="h-12 w-12 text-red-500" />,
      title: 'Paiement non abouti',
      text: "Le paiement a échoué ou a été annulé. Aucun montant n'a été pris en compte : vous pouvez recommencer depuis l'application."
    },
    pending: {
      icon: <Clock className="h-12 w-12 text-amber-500" />,
      title: 'Paiement en cours de vérification',
      text: "Votre paiement est en cours de confirmation par l'opérateur. Retournez dans l'application Pandora Health : l'abonnement s'y mettra à jour dès la confirmation."
    },
    unknown: {
      icon: <Clock className="h-12 w-12 text-gray-400" />,
      title: 'Merci',
      text: "Retournez dans l'application Pandora Health : votre abonnement s'y mettra à jour dès la confirmation du paiement."
    }
  }[state]

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-xl shadow-gray-200/60">
        <Image src="/logo.png" alt="Pandora Health" width={48} height={48} className="mx-auto mb-6 rounded-xl" />
        <div className="flex justify-center">{content.icon}</div>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">{content.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{content.text}</p>
        {payment && state !== 'unknown' && (
          <p className="mt-6 text-xs text-gray-400">
            Montant : {payment.amount.toLocaleString('fr-FR')} F · Réf. {payment.id.slice(0, 8).toUpperCase()}
          </p>
        )}
      </div>
    </main>
  )
}
