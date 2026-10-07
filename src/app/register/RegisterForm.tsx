'use client'

import { useActionState } from 'react'
import { register } from '@/app/actions/auth'
import { authButtonClass, authInputClass, authLabelClass } from '@/components/AuthShell'

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, undefined)
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="name" className={authLabelClass}>
          Nom complet
        </label>
        <input id="name" name="name" autoFocus defaultValue={state?.values?.name} className={authInputClass} />
      </div>
      <div>
        <label htmlFor="email" className={authLabelClass}>
          E-mail
        </label>
        <input id="email" name="email" type="email" autoComplete="username" defaultValue={state?.values?.email} className={authInputClass} />
      </div>
      <div>
        <label htmlFor="password" className={authLabelClass}>
          Mot de passe (8 caractères min.)
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" className={authInputClass} />
      </div>
      <div>
        <label htmlFor="confirm" className={authLabelClass}>
          Confirmer le mot de passe
        </label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" className={authInputClass} />
      </div>
      {state?.error && (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-[#fca5a5]">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className={authButtonClass}>
        {pending ? 'Création…' : 'Créer mon compte'}
      </button>
    </form>
  )
}
