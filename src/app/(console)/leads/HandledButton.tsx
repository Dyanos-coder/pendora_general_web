'use client'

import { useTransition } from 'react'
import { setContactHandled } from '@/app/actions/contact'
import { buttonPrimary, buttonSecondary } from '@/components/ui'

export function HandledButton({ id, handled }: { id: string; handled: boolean }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setContactHandled(id, !handled))}
      className={handled ? buttonSecondary : buttonPrimary}
    >
      {handled ? 'Rouvrir' : 'Marquer comme traitée'}
    </button>
  )
}
