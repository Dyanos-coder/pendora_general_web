'use client'

import { useTransition } from 'react'
import { setMobileStatus } from '@/app/actions/hospitals'

type MobileStatus = 'NON_SOUHAITEE' | 'SOUHAITEE' | 'INSTALLEE'

const OPTIONS: { value: MobileStatus; label: string; hint: string }[] = [
  { value: 'NON_SOUHAITEE', label: 'Non souhaitée', hint: "L'hôpital ne veut pas la version mobile." },
  { value: 'SOUHAITEE', label: 'Souhaitée', hint: "L'hôpital la veut, pas encore installée." },
  { value: 'INSTALLEE', label: 'Installée', hint: 'La version mobile est en service.' }
]

/** Choix de la version mobile — prospecteurs et admins (§9-G). */
export function MobileStatusSelect({ hospitalId, value }: { hospitalId: string; value: MobileStatus }) {
  const [pending, startTransition] = useTransition()
  return (
    <div className="space-y-1.5">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => setMobileStatus(hospitalId, option.value))}
          className={`w-full rounded-lg border px-3 py-2 text-left transition disabled:opacity-60 ${
            value === option.value ? 'border-accent-500 bg-accent-50' : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <p className={`text-sm font-medium ${value === option.value ? 'text-accent-700' : 'text-gray-800'}`}>{option.label}</p>
          <p className="text-xs text-gray-500">{option.hint}</p>
        </button>
      ))}
    </div>
  )
}
