'use client'

import { useState, useTransition } from 'react'
import { Check, Copy, RefreshCw } from 'lucide-react'
import { regenerateActivationCode, revokeDevice } from '@/app/actions/hospitals'
import type { FormState } from '@/app/actions/form-state'
import { FormMessage, buttonSecondary } from '@/components/ui'

export function ActivationCode({ hospitalId, code }: { hospitalId: string; code: string | null }) {
  const [copied, setCopied] = useState(false)
  const [state, setState] = useState<FormState>(undefined)
  const [pending, startTransition] = useTransition()

  function regenerate(): void {
    const message = code
      ? 'Générer un nouveau code ? L’ancien ne fonctionnera plus : chaque poste de l’hôpital redemandera le nouveau code à son prochain lancement.'
      : 'Générer le code d’activation de cet hôpital ?'
    if (!window.confirm(message)) return
    startTransition(async () => setState(await regenerateActivationCode(hospitalId)))
  }

  return (
    <div className="space-y-3">
      {code ? (
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-base tracking-wider text-gray-900 select-all">{code}</code>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(code)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className={buttonSecondary}
          >
            {copied ? <Check className="h-4 w-4 text-teal-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copié' : 'Copier'}
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Aucun code pour cet hôpital (ajouté avant les codes d’activation).</p>
      )}
      <button type="button" onClick={regenerate} disabled={pending} className={buttonSecondary}>
        <RefreshCw className={'h-4 w-4 ' + (pending ? 'animate-spin' : '')} />
        {code ? 'Régénérer le code' : 'Générer le code'}
      </button>
      <FormMessage state={state} />
    </div>
  )
}

export function RevokeDeviceButton({ deviceId, name }: { deviceId: string; name: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(`Révoquer le poste « ${name} » ? Il ne pourra plus récupérer les accès à la base et redemandera un code.`)) {
          startTransition(() => revokeDevice(deviceId))
        }
      }}
      className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      {pending ? '…' : 'Révoquer'}
    </button>
  )
}
