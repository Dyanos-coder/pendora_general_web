'use client'

import { useActionState, useState, useTransition } from 'react'
import { createAccount, resetAccountPassword, setAccountActive, setAccountRole } from '@/app/actions/accounts'
import { FormMessage, buttonPrimary, inputClass, labelClass } from '@/components/ui'

export function CreateAccountForm() {
  const [state, action, pending] = useActionState(createAccount, undefined)
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={labelClass}>Nom complet</label>
        <input name="name" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>E-mail</label>
        <input name="email" type="email" required autoComplete="off" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Mot de passe (8 caractères min.)</label>
        <input name="password" type="password" required autoComplete="new-password" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Rôle</label>
        <select name="role" defaultValue="PROSPECTEUR" className={inputClass}>
          <option value="PROSPECTEUR">Prospecteur</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonPrimary} w-full`}>
        {pending ? 'Création…' : 'Créer le compte'}
      </button>
    </form>
  )
}

export function AccountActions({ accountId, isActive }: { accountId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition()
  const [resetting, setResetting] = useState(false)
  const [state, action, saving] = useActionState(resetAccountPassword, undefined)

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-3 text-xs font-medium">
        <button type="button" onClick={() => setResetting(!resetting)} className="text-gray-500 hover:text-gray-800">
          Mot de passe
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => setAccountActive(accountId, !isActive))}
          className={isActive ? 'text-red-600 hover:text-red-700' : 'text-emerald-600 hover:text-emerald-700'}
        >
          {isActive ? 'Désactiver' : 'Réactiver'}
        </button>
      </div>
      {resetting && (
        <form action={action} className="flex items-center gap-2">
          <input type="hidden" name="accountId" value={accountId} />
          <input name="password" type="password" placeholder="Nouveau mot de passe" autoComplete="new-password" className={`${inputClass} w-44 py-1 text-xs`} />
          <button type="submit" disabled={saving} className="text-xs font-medium text-accent-600 hover:text-accent-700">
            OK
          </button>
        </form>
      )}
      <FormMessage state={state} />
    </div>
  )
}

/** Rôle d'un compte : prospecteur par défaut, admin sur promotion. */
export function RoleSelect({ accountId, role }: { accountId: string; role: 'ADMIN' | 'PROSPECTEUR' }) {
  const [pending, startTransition] = useTransition()
  return (
    <select
      value={role}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as 'ADMIN' | 'PROSPECTEUR'
        startTransition(() => setAccountRole(accountId, next))
      }}
      className={`rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-60 ${
        role === 'ADMIN' ? 'border-accent-200 bg-accent-50 text-accent-700' : 'border-gray-200 bg-white text-gray-700'
      }`}
    >
      <option value="PROSPECTEUR">Prospecteur</option>
      <option value="ADMIN">Admin</option>
    </select>
  )
}
