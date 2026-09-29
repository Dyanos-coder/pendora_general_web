'use client'

import { useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { refreshHospital } from '@/app/actions/hospitals'
import { buttonSecondary } from '@/components/ui'

/** Relit la base de l'hôpital tout de suite (sinon les données sont gardées 2 minutes). */
export function RefreshButton({ hospitalId }: { hospitalId: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button type="button" disabled={pending} onClick={() => startTransition(() => refreshHospital(hospitalId))} className={buttonSecondary}>
      <RefreshCw className={`h-4 w-4 ${pending ? 'animate-spin' : ''}`} />
      Actualiser
    </button>
  )
}
