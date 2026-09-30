'use client'

import { useActionState, useState, useTransition } from 'react'
import { activateFirstMonth, recordManualPayment, retryPayment } from '@/app/actions/subscriptions'
import type { FormState } from '@/app/actions/form-state'
import { FormMessage, buttonPrimary, buttonSecondary, inputClass, labelClass } from '@/components/ui'

export function ActivateFirstMonthButton({ hospitalId }: { hospitalId: string }) {
  const [pending, startTransition] = useTransition()
  const [state, setState] = useState<FormState>(undefined)
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setState(await activateFirstMonth(hospitalId)))}
        className={buttonPrimary}
      >
        {pending ? 'Activation…' : 'Activer le premier mois offert'}
      </button>
      <FormMessage state={state} />
    </div>
  )
}

export function RetryPaymentButton({ paymentId, label }: { paymentId: string; label: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => retryPayment(paymentId))}
      className="text-xs font-medium text-accent-600 hover:text-accent-700 disabled:opacity-50"
    >
      {pending ? '…' : label}
    </button>
  )
}

interface CatalogItem {
  key: string
  offer: string
  label: string
  price: number
  mandatory: boolean
}

/** Paiement reçu hors MoneyFusion (virement, espèces…) : modules, durée, montant reçu. */
export function ManualPaymentForm({ hospitalId, catalog, currentItems }: { hospitalId: string; catalog: CatalogItem[]; currentItems: string[] }) {
  const [state, action, pending] = useActionState(recordManualPayment, undefined)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>(currentItems.length ? currentItems : catalog.filter((i) => i.mandatory).map((i) => i.key))
  const [months, setMonths] = useState(1)
  const monthly = catalog.filter((i) => selected.includes(i.key)).reduce((sum, i) => sum + i.price, 0)
  const offers = [...new Set(catalog.map((i) => i.offer))]

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonSecondary}>
        Enregistrer un paiement manuel
      </button>
    )
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="hospitalId" value={hospitalId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {offers.map((offer) => (
          <div key={offer}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{offer}</p>
            {catalog
              .filter((i) => i.offer === offer)
              .map((i) => (
                <label key={i.key} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="items"
                    value={i.key}
                    checked={selected.includes(i.key)}
                    disabled={i.mandatory}
                    onChange={(e) => setSelected(e.target.checked ? [...selected, i.key] : selected.filter((k) => k !== i.key))}
                  />
                  {i.label} <span className="text-xs text-gray-400">{i.price.toLocaleString('fr-FR')} F</span>
                  {i.mandatory && <input type="hidden" name="items" value={i.key} />}
                </label>
              ))}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Durée (mois)</label>
          <select name="months" value={months} onChange={(e) => setMonths(Number(e.target.value))} className={inputClass}>
            {Array.from({ length: 25 }, (_, n) => n).map((n) => (
              <option key={n} value={n}>
                {n === 0 ? '0 (ajout de modules seul)' : `${n} mois`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Montant reçu (F)</label>
          <input name="amount" defaultValue={monthly * months} key={monthly * months} className={inputClass} />
          <p className="mt-1 text-[11px] text-gray-400">Tarif : {(monthly * months).toLocaleString('fr-FR')} F (hors prorata)</p>
        </div>
        <div>
          <label className={labelClass}>Référence / mode de paiement</label>
          <input name="note" placeholder="Virement n°…, espèces…" className={inputClass} />
        </div>
      </div>
      <FormMessage state={state} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending ? 'Enregistrement…' : 'Enregistrer et appliquer'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={buttonSecondary}>
          Annuler
        </button>
      </div>
    </form>
  )
}
