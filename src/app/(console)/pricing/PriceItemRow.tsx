'use client'

import { useActionState } from 'react'
import { updatePriceItem } from '@/app/actions/subscriptions'
import { Badge, buttonSecondary, inputClass } from '@/components/ui'

interface Item {
  key: string
  label: string
  price: number
  active: boolean
  mandatory: boolean
  comingSoon: boolean
}

export function PriceItemRow({ item }: { item: Item }) {
  const [state, action, pending] = useActionState(updatePriceItem, undefined)
  return (
    <form action={action} className="flex flex-wrap items-center gap-4 px-5 py-3">
      <input type="hidden" name="key" value={item.key} />
      <div className="min-w-48 flex-1">
        <p className="text-sm font-medium text-gray-900">
          {item.label} {item.mandatory && <Badge tone="info">Obligatoire</Badge>} {item.comingSoon && <Badge tone="neutral">Bientôt</Badge>}
        </p>
        <p className="text-xs text-gray-400">{item.key}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <input name="price" defaultValue={item.price} className={`${inputClass} w-28 text-right`} />
        <span className="whitespace-nowrap text-xs text-gray-500">F / mois</span>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" name="active" defaultChecked={item.active} disabled={item.mandatory} />
        Actif
        {item.mandatory && <input type="hidden" name="active" value="on" />}
      </label>
      <button type="submit" disabled={pending} className={buttonSecondary}>
        {pending ? '…' : 'Enregistrer'}
      </button>
      <span className="w-24 text-xs">
        {state?.error && <span className="text-red-600">{state.error}</span>}
        {state?.success && !pending && <span className="text-green-600">{state.success}</span>}
      </span>
    </form>
  )
}
